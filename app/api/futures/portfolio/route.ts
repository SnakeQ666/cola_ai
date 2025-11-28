import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserBinanceFuturesClient, getFuturesAccountInfo } from '@/lib/binance-futures';

/**
 * GET /api/futures/portfolio
 * 获取 AI 管理的合约资产组合历史
 * 计算 AI 接管后的成本和盈亏
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
        portfolio: [],
        initialInvestment: 0,
        currentValue: 0,
        pnl: 0,
        pnlPercent: 0,
        positions: [],
        history: []
      });
    }
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    // 获取所有合约订单记录（用于计算成本）
    const allOrders = await db.futuresOrder.findMany({
      where: {
        accountId: futuresAccount.id
      },
      orderBy: { executedAt: 'asc' }
    });
    
    if (allOrders.length === 0) {
      return NextResponse.json({
        success: true,
        portfolio: [],
        initialInvestment: 0,
        currentValue: 0,
        pnl: 0,
        pnlPercent: 0,
        positions: [],
        history: []
      });
    }
    
    // 获取当前账户余额
    const { client } = await getUserBinanceFuturesClient(user.id);
    const accountInfo = await getFuturesAccountInfo(client);
    const currentBalance = parseFloat(accountInfo.totalWalletBalance || '0');
    const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit || '0');
    
    // 计算已实现盈亏（所有平仓订单的 pnl 累加）
    let totalRealized = 0;
    
    for (const order of allOrders) {
      const orderPnl = (order as any).pnl;
      if (orderPnl) {
        totalRealized += parseFloat(orderPnl.toString());
      }
    }
    
    // 计算初始投入：使用第一次交易时的账户总价值
    // 方法：获取第一次订单执行后的余额快照，使用 totalValueUSDT（账户总价值 = 余额 + 未实现盈亏）
    // 然后减去第一次订单的盈亏（如果有），得到第一次订单执行前的总价值
    let initialInvestment = 0;
    
    const firstOrder = allOrders[0];
    if (firstOrder?.executedAt) {
      // 获取第一次订单执行后的余额快照（余额历史是在订单执行后记录的）
      const firstBalanceHistory = await db.futuresBalanceHistory.findFirst({
        where: {
          accountId: futuresAccount.id,
          snapshotAt: {
            gte: firstOrder.executedAt
          }
        },
        orderBy: { snapshotAt: 'asc' }
      });
      
      if (firstBalanceHistory) {
        // 使用第一次订单执行后的账户总价值（totalValueUSDT = 余额 + 未实现盈亏）
        const totalValueAfterFirstOrder = parseFloat(firstBalanceHistory.totalValueUSDT.toString());
        // 第一次订单的盈亏（如果有，平仓才有盈亏）
        const firstOrderPnl = (firstOrder as any).pnl ? parseFloat((firstOrder as any).pnl.toString()) : 0;
        // 初始投入 = 第一次订单执行后的总价值 - 第一次订单的盈亏
        // 这样得到的是第一次订单执行前的总价值（即初始投入）
        initialInvestment = totalValueAfterFirstOrder - firstOrderPnl;
      } else {
        // 如果没有余额历史，通过所有订单反推：
        // 初始投入 = 当前总价值 - 所有已实现盈亏 - 当前未实现盈亏
        const currentTotalValue = currentBalance + unrealizedPnl;
        const totalPnl = totalRealized + unrealizedPnl;
        initialInvestment = currentTotalValue - totalPnl;
      }
    } else {
      // 如果没有订单执行时间，使用当前总价值反推（兜底逻辑）
      const currentTotalValue = currentBalance + unrealizedPnl;
      const totalPnl = totalRealized + unrealizedPnl;
      initialInvestment = currentTotalValue - totalPnl;
    }
    
    // 确保初始投入不为负数
    if (initialInvestment < 0) {
      initialInvestment = 0;
    }
    
    // 获取最近 N 天的订单用于图表显示
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const recentOrders = allOrders.filter(o => o.executedAt >= startDate);
    
    // 构建历史数据
    const portfolio: any[] = [];
    let runningRealizedPnl = 0;
    
    if (recentOrders.length > 0) {
      for (const order of recentOrders) {
        const avgPrice = parseFloat(order.avgPrice?.toString() || '0');
        const quantity = parseFloat(order.executedQty?.toString() || '0');
        
        // 跳过无效订单（数据不完整的订单）
        if (avgPrice === 0 || quantity === 0) {
          console.warn(`[Portfolio] 跳过无效订单 ${order.id}: avgPrice=${avgPrice}, quantity=${quantity}`);
          continue;
        }
        
        // 计算该订单后的已实现盈亏累积
        const orderPnl = (order as any).pnl;
        if (orderPnl) {
          runningRealizedPnl += parseFloat(orderPnl.toString());
        }
        
        // 该时间点的总价值 = 初始投入 + 到该时间点为止的所有已实现盈亏
        // 注意：历史数据不包含未实现盈亏，因为未实现盈亏是实时的
        const totalValue = initialInvestment + runningRealizedPnl;
        
        portfolio.push({
          timestamp: order.executedAt,
          totalValueUSDT: totalValue,
          realizedPnl: runningRealizedPnl,
          initialInvestment,
          pnl: totalValue - initialInvestment,
          pnlPercent: initialInvestment > 0 ? ((totalValue - initialInvestment) / initialInvestment) * 100 : 0,
          order: {
            symbol: order.symbol,
            side: order.side,
            positionSide: order.positionSide,
            quantity,
            price: avgPrice,
            pnl: orderPnl ? parseFloat(orderPnl.toString()) : 0
          }
        });
      }
      
      // 在历史数据最后添加当前状态点（包含未实现盈亏）
      const currentTotalValue = currentBalance + unrealizedPnl;
      portfolio.push({
        timestamp: new Date(),
        totalValueUSDT: currentTotalValue,
        realizedPnl: totalRealized,
        initialInvestment,
        pnl: currentTotalValue - initialInvestment,
        pnlPercent: initialInvestment > 0 ? ((currentTotalValue - initialInvestment) / initialInvestment) * 100 : 0,
        order: null
      });
    } else {
      // 如果没有有效的历史订单，添加当前状态快照
      const currentTotalValue = currentBalance + unrealizedPnl;
      portfolio.push({
        timestamp: new Date(),
        totalValueUSDT: currentTotalValue,
        realizedPnl: totalRealized,
        initialInvestment,
        pnl: currentTotalValue - initialInvestment,
        pnlPercent: initialInvestment > 0 ? ((currentTotalValue - initialInvestment) / initialInvestment) * 100 : 0,
        order: null
      });
    }
    
    // 获取当前持仓
    const positions = await db.futuresPosition.findMany({
      where: {
        accountId: futuresAccount.id,
        status: 'OPEN'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // 过滤并映射持仓数据，排除无效持仓
    const currentPositions = positions
      .filter(pos => {
        const entryPrice = parseFloat(pos.entryPrice.toString());
        const quantity = parseFloat(pos.quantity.toString());
        
        // 过滤掉无效持仓（entryPrice=0 或 quantity=0）
        if (entryPrice === 0 || quantity === 0) {
          console.warn(`[Portfolio] 跳过无效持仓: ${pos.symbol} (entryPrice=${entryPrice}, quantity=${quantity})`);
          return false;
        }
        
        return true;
      })
      .map(pos => ({
        symbol: pos.symbol,
        side: pos.side,
        leverage: pos.leverage,
        entryPrice: parseFloat(pos.entryPrice.toString()),
        quantity: parseFloat(pos.quantity.toString()),
        margin: parseFloat(pos.margin.toString()),
        markPrice: parseFloat(pos.markPrice?.toString() || '0'),
        unrealizedPnl: parseFloat(pos.unrealizedPnl?.toString() || '0'),
        roe: parseFloat(pos.roe?.toString() || '0')
      }));
    
    // 当前总价值 = 当前余额 + 未实现盈亏（账户总价值）
    const currentValue = currentBalance + unrealizedPnl;
    // 盈亏 = 当前总价值 - 初始投入
    const pnl = currentValue - initialInvestment;
    // 收益率 = (盈亏 / 初始投入) * 100
    const pnlPercent = initialInvestment > 0 ? (pnl / initialInvestment) * 100 : 0;
    
    // 格式化历史数据用于图表
    const history = portfolio.map(p => ({
      time: new Date(p.timestamp).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      value: p.totalValueUSDT,
      pnl: p.pnl
    }));
    
    return NextResponse.json({
      success: true,
      portfolio, // 原始数组格式（兼容）
      initialInvestment,
      currentValue,
      pnl,
      pnlPercent,
      realizedPnl: totalRealized,
      unrealizedPnl,
      positions: currentPositions,
      history
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '获取资产组合失败: ' + error.message },
      { status: 500 }
    );
  }
}

