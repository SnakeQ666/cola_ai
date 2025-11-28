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

    return NextResponse.json({ decisions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约决策历史失败' },
      { status: 500 }
    );
  }
}

