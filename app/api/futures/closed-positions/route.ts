import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/futures/closed-positions
 * 获取已平仓的交易对（开仓+平仓的组合）
 * 只有平仓订单有 pnl 字段，通过 pnl 字段判断是否已平仓
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const futuresAccount = await db.futuresAccount.findUnique({
      where: { userId: user.id }
    });
    
    if (!futuresAccount) {
      return NextResponse.json({
        success: true,
        closedPositions: []
      });
    }
    
    // 获取所有有 pnl 的订单（平仓订单），且 pnl 不为 0（过滤无效数据）
    const closedOrders = await db.futuresOrder.findMany({
      where: {
        accountId: futuresAccount.id,
        pnl: {
          not: null
        }
      },
      orderBy: { executedAt: 'desc' },
      include: {
        aiDecision: true
      }
    });
    
    // 对于每个平仓订单，查找对应的开仓订单
    const closedPositions: any[] = [];
    
    for (const closeOrder of closedOrders) {
      // 忽略 pnl 为 0 的无效数据
      const pnl = parseFloat(closeOrder.pnl?.toString() || '0');
      if (pnl === 0) {
        continue;
      }
      // 查找对应的开仓订单
      // 开仓订单：相同的 symbol 和 positionSide，但 side 相反，且执行时间在平仓之前
      // LONG 仓位：开仓 BUY，平仓 SELL
      // SHORT 仓位：开仓 SELL，平仓 BUY
      const openSide = closeOrder.side === 'BUY' ? 'SELL' : 'BUY';
      
      const openOrder = await db.futuresOrder.findFirst({
        where: {
          accountId: futuresAccount.id,
          symbol: closeOrder.symbol,
          positionSide: closeOrder.positionSide,
          side: openSide,
          executedAt: {
            lt: closeOrder.executedAt
          },
          pnl: null // 开仓订单没有 pnl
        },
        orderBy: { executedAt: 'desc' }
      });
      
      if (openOrder) {
        // 查找对应的持仓记录以获取杠杆信息
        const position = await db.futuresPosition.findFirst({
          where: {
            accountId: futuresAccount.id,
            symbol: closeOrder.symbol,
            side: closeOrder.positionSide,
            status: 'CLOSED',
            closedAt: {
              gte: closeOrder.executedAt,
              lte: new Date(closeOrder.executedAt.getTime() + 60000) // 平仓后1分钟内
            }
          },
          orderBy: { closedAt: 'desc' }
        });
        
        // 计算持仓时长
        const duration = closeOrder.executedAt.getTime() - openOrder.executedAt.getTime();
        const durationHours = duration / (1000 * 60 * 60);
        const durationDays = durationHours / 24;
        
        // 计算盈亏百分比（基于开仓成本）
        const openCost = parseFloat(openOrder.avgPrice?.toString() || '0') * 
                        parseFloat(openOrder.executedQty?.toString() || '0');
        const pnlPercent = openCost > 0 
          ? (parseFloat(closeOrder.pnl?.toString() || '0') / openCost) * 100 
          : 0;
        
        closedPositions.push({
          id: closeOrder.id,
          symbol: closeOrder.symbol,
          positionSide: closeOrder.positionSide,
          leverage: position?.leverage || null,
          // 开仓信息
          openOrder: {
            orderId: openOrder.orderId,
            executedAt: openOrder.executedAt,
            price: parseFloat(openOrder.avgPrice?.toString() || '0'),
            quantity: parseFloat(openOrder.executedQty?.toString() || '0'),
            cost: openCost
          },
          // 平仓信息
          closeOrder: {
            orderId: closeOrder.orderId,
            executedAt: closeOrder.executedAt,
            price: parseFloat(closeOrder.avgPrice?.toString() || '0'),
            quantity: parseFloat(closeOrder.executedQty?.toString() || '0')
          },
          // 盈亏信息
          pnl: parseFloat(closeOrder.pnl?.toString() || '0'),
          pnlPercent,
          // 持仓时长
          duration: {
            hours: Math.floor(durationHours),
            days: Math.floor(durationDays),
            totalHours: durationHours.toFixed(1)
          },
          // AI 决策信息
          aiDecision: closeOrder.aiDecision ? {
            confidence: closeOrder.aiDecision.confidence,
            reasoning: closeOrder.aiDecision.reasoning
          } : null
        });
      }
    }
    
    // 按平仓时间倒序排列
    closedPositions.sort((a, b) => 
      b.closeOrder.executedAt.getTime() - a.closeOrder.executedAt.getTime()
    );
    
    return NextResponse.json({
      success: true,
      closedPositions
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '获取已平仓交易失败: ' + error.message },
      { status: 500 }
    );
  }
}

