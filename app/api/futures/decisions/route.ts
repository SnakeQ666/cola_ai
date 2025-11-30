import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

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
      return NextResponse.json({ decisions: [] });
    }

    const decisions = await db.futuresAIDecision.findMany({
      where: {
        accountId: futuresAccount.id
      },
      include: {
        orders: true,
        positions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // 转换 Decimal 类型为数字，确保前端可以正常使用
    const formattedDecisions = decisions.map(decision => ({
      ...decision,
      confidence: parseFloat(decision.confidence.toString()),
      orders: decision.orders.map((order: any) => ({
        ...order,
        quantity: parseFloat(order.quantity.toString()),
        executedQty: parseFloat(order.executedQty.toString()),
        price: order.price ? parseFloat(order.price.toString()) : null,
        avgPrice: order.avgPrice ? parseFloat(order.avgPrice.toString()) : null,
        pnl: order.pnl ? parseFloat(order.pnl.toString()) : null
      })),
      positions: decision.positions.map((position: any) => ({
        ...position,
        entryPrice: parseFloat(position.entryPrice.toString()),
        quantity: parseFloat(position.quantity.toString()),
        margin: parseFloat(position.margin.toString()),
        markPrice: position.markPrice ? parseFloat(position.markPrice.toString()) : null,
        liquidationPrice: position.liquidationPrice ? parseFloat(position.liquidationPrice.toString()) : null,
        unrealizedPnl: position.unrealizedPnl ? parseFloat(position.unrealizedPnl.toString()) : null,
        roe: position.roe ? parseFloat(position.roe.toString()) : null,
        realizedPnl: position.realizedPnl ? parseFloat(position.realizedPnl.toString()) : null
      }))
    }));

    return NextResponse.json({ decisions: formattedDecisions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约决策历史失败' },
      { status: 500 }
    );
  }
}

