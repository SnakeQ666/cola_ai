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
      return NextResponse.json({ history: [] });
    }

    // 只返回最近 7 天的数据
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const history = await db.futuresBalanceHistory.findMany({
      where: {
        accountId: futuresAccount.id,
        snapshotAt: { gte: startDate }
      },
      orderBy: {
        snapshotAt: 'asc'
      }
    });

    // 序列化日期字段
    const serializedHistory = history.map(item => ({
      ...item,
      totalBalance: item.totalBalance.toString(),
      availableBalance: item.availableBalance.toString(),
      usedMargin: item.usedMargin.toString(),
      unrealizedPnl: item.unrealizedPnl.toString(),
      totalValueUSDT: item.totalValueUSDT.toString(),
      dailyPnl: item.dailyPnl?.toString(),
      totalPnl: item.totalPnl?.toString(),
      snapshotAt: item.snapshotAt.toISOString()
    }));

    return NextResponse.json({ history: serializedHistory });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约余额历史失败' },
      { status: 500 }
    );
  }
}

