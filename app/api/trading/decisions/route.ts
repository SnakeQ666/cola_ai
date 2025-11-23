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
      // 如果没有账户，返回空列表而不是错误
      return NextResponse.json({
        success: true,
        decisions: []
      });
    }
    
    const decisions = await db.aIDecision.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 10, // 只取最近10条
      include: {
        trades: {
          orderBy: { executedAt: 'desc' }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      decisions
    });
  } catch (error: any) {
    console.error('[API] 获取决策历史失败:', error);
    return NextResponse.json(
      { error: '获取决策历史失败: ' + error.message },
      { status: 500 }
    );
  }
}

