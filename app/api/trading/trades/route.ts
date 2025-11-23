import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const account = await db.binanceAccount.findUnique({
      where: { userId: user.id }
    });
    
    if (!account) {
      return NextResponse.json({
        success: true,
        trades: []
      });
    }
    
    const trades = await db.trade.findMany({
      where: { accountId: account.id },
      orderBy: { executedAt: 'desc' },
      take: 50
    });
    
    return NextResponse.json({
      success: true,
      trades
    });
  } catch (error: any) {
    console.error('[API] 获取交易记录失败:', error);
    return NextResponse.json(
      { error: '获取交易记录失败: ' + error.message },
      { status: 500 }
    );
  }
}

