import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserBinanceFuturesClient, getFuturesAccountBalance } from '@/lib/binance-futures';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

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
      return NextResponse.json({ error: '合约账户未找到' }, { status: 404 });
    }

    const { client } = await getUserBinanceFuturesClient(user.id);
    const balances = await getFuturesAccountBalance(client);

    // 找到 USDT 余额
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');

    if (!usdtBalance) {
      return NextResponse.json({
        totalBalance: 0,
        availableBalance: 0,
        usedMargin: 0,
        unrealizedPnl: 0
      });
    }

    const totalBalance = parseFloat(usdtBalance.balance);
    const availableBalance = parseFloat(usdtBalance.availableBalance);
    const usedMargin = totalBalance - availableBalance;
    const unrealizedPnl = parseFloat(usdtBalance.crossUnPnl || '0');

    // 计算已实现盈亏（所有平仓订单的 pnl 累加）
    const orders = await db.futuresOrder.findMany({
      where: {
        accountId: futuresAccount.id,
        pnl: { not: null }
      }
    });

    const realizedPnl = orders.reduce((sum, order) => {
      return sum + parseFloat(order.pnl?.toString() || '0');
    }, 0);

    // 保存余额历史
    await db.futuresBalanceHistory.create({
      data: {
        accountId: futuresAccount.id,
        totalBalance: new Decimal(totalBalance),
        availableBalance: new Decimal(availableBalance),
        usedMargin: new Decimal(usedMargin),
        unrealizedPnl: new Decimal(unrealizedPnl),
        totalValueUSDT: new Decimal(totalBalance + unrealizedPnl)
      }
    });

    return NextResponse.json({
      totalBalance,
      availableBalance,
      usedMargin,
      unrealizedPnl,
      realizedPnl,
      totalValue: totalBalance + unrealizedPnl
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约余额失败' },
      { status: 500 }
    );
  }
}

