import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserBinanceClient, getAccountBalance } from '@/lib/binance';
import { Decimal } from '@prisma/client/runtime/library';

// 记录余额快照
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const { client, account } = await getUserBinanceClient(user.id);
    const balance = await getAccountBalance(client);
    
    // 计算总价值（USDT）- 包含所有资产按当前价格换算
    let totalValueUSDT = 0;
    const balances: any = {};
    
    // 获取所有币种的当前价格
    const prices = await client.prices();
    
    for (const b of balance.balances) {
      balances[b.asset] = b.total;
      
      if (b.total > 0) {
        if (b.asset === 'USDT') {
          totalValueUSDT += b.total;
        } else {
          const symbol = `${b.asset}USDT`;
          const price = prices[symbol];
          
          if (price) {
            totalValueUSDT += b.total * parseFloat(price);
          }
        }
      }
    }
    
    const snapshot = await db.balanceHistory.create({
      data: {
        accountId: account.id,
        balances,
        totalValueUSDT: new Decimal(totalValueUSDT)
      }
    });
    
    return NextResponse.json({
      success: true,
      snapshot
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '记录余额失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 获取余额历史
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
        history: []
      });
    }
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const history = await db.balanceHistory.findMany({
      where: {
        accountId: account.id,
        snapshotAt: { gte: startDate }
      },
      orderBy: { snapshotAt: 'asc' }
    });
    
    return NextResponse.json({
      success: true,
      history: history.map(h => ({
        id: h.id,
        totalValueUSDT: parseFloat(h.totalValueUSDT.toString()),
        balances: h.balances,
        snapshotAt: h.snapshotAt
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '获取余额历史失败: ' + error.message },
      { status: 500 }
    );
  }
}

