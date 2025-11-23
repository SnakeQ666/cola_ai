// 风控检查工具

import { db } from '@/lib/db';

export async function checkDailyLoss(accountId: string, maxDailyLoss: number): Promise<{
  passed: boolean;
  currentLoss: number;
  remaining: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTrades = await db.trade.findMany({
    where: {
      accountId,
      executedAt: { gte: today }
    }
  });

  const currentLoss = todayTrades.reduce((sum, t) => {
    const pnl = t.realizedPnl ? parseFloat(t.realizedPnl.toString()) : 0;
    return sum + (pnl < 0 ? Math.abs(pnl) : 0);
  }, 0);

  return {
    passed: currentLoss < maxDailyLoss,
    currentLoss,
    remaining: Math.max(0, maxDailyLoss - currentLoss)
  };
}

export async function checkTradeFrequency(
  accountId: string,
  symbol: string,
  minIntervalMinutes: number = 5
): Promise<boolean> {
  const recentTrade = await db.trade.findFirst({
    where: {
      accountId,
      symbol,
      executedAt: {
        gte: new Date(Date.now() - minIntervalMinutes * 60 * 1000)
      }
    },
    orderBy: { executedAt: 'desc' }
  });

  return !recentTrade;
}

export async function calculatePositionSize(
  accountBalance: number,
  maxTradeAmount: number,
  riskPercentage: number = 0.1
): Promise<number> {
  return Math.min(
    accountBalance * riskPercentage,
    maxTradeAmount
  );
}

