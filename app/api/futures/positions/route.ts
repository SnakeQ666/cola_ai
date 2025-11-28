import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserBinanceFuturesClient, getFuturesPositions } from '@/lib/binance-futures';
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
      return NextResponse.json({ positions: [] });
    }

    // 获取实时持仓
    const { client } = await getUserBinanceFuturesClient(user.id);
    const livePositions = await getFuturesPositions(client);

    // 获取数据库中的持仓记录
    const dbPositions = await db.futuresPosition.findMany({
      where: {
        accountId: futuresAccount.id,
        status: 'OPEN'
      },
      include: {
        aiDecision: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 合并实时数据和数据库记录
    const positions = livePositions.map((lp: any) => {
      const dbPos = dbPositions.find(p => p.symbol === lp.symbol);
      
      return {
        symbol: lp.symbol,
        side: parseFloat(lp.positionAmt) > 0 ? 'LONG' : 'SHORT',
        quantity: Math.abs(parseFloat(lp.positionAmt)),
        entryPrice: parseFloat(lp.entryPrice),
        markPrice: parseFloat(lp.markPrice),
        leverage: parseInt(lp.leverage),
        unrealizedPnl: parseFloat(lp.unRealizedProfit),
        liquidationPrice: parseFloat(lp.liquidationPrice),
        margin: parseFloat(lp.isolatedMargin) || parseFloat(lp.positionInitialMargin),
        roe: dbPos ? parseFloat(lp.unRealizedProfit) / parseFloat(dbPos.margin.toString()) * 100 : 0,
        aiDecision: dbPos?.aiDecision,
        createdAt: dbPos?.createdAt
      };
    });

    return NextResponse.json({ positions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约持仓失败' },
      { status: 500 }
    );
  }
}

