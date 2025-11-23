import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runAITradingDecision } from '@/lib/trading/ai-engine';
import { getUserBinanceClient, placeMarketOrder } from '@/lib/binance';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] 开始执行 AI 交易任务');

  const accounts = await db.binanceAccount.findMany({
    where: { enableAutoTrade: true },
    include: { user: true }
  });

  console.log(`[Cron] 找到 ${accounts.length} 个启用自动交易的账户`);

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      try {
        console.log(`[Cron] 处理用户 ${account.userId}`);
        
        const result = await runAITradingDecision(account.userId);
        
        if (!result) {
          return { userId: account.userId, status: 'skipped', reason: '自动交易未启用' };
        }

        const { decision, aiDecision } = result;

        if (decision.action === 'HOLD') {
          return { userId: account.userId, status: 'hold', decision };
        }

        if (decision.confidence < 0.7) {
          await db.aIDecision.update({
            where: { id: aiDecision.id },
            data: { 
              outcome: 'CANCELLED',
              executedAt: new Date()
            }
          });
          return { userId: account.userId, status: 'low_confidence', decision };
        }

        const { client } = await getUserBinanceClient(account.userId);
        const symbol = decision.symbol || account.allowedSymbols[0] || 'BTCUSDT';
        
        // 风控检查1: 币种限制
        if (!account.allowedSymbols.includes(symbol)) {
          await db.aIDecision.update({
            where: { id: aiDecision.id },
            data: { outcome: 'CANCELLED', executedAt: new Date() }
          });
          return { userId: account.userId, status: 'blocked', reason: '币种不在允许列表' };
        }
        
        // 风控检查2: 今日亏损限制
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTrades = await db.trade.findMany({
          where: { accountId: account.id, executedAt: { gte: today } }
        });
        const todayLoss = todayTrades.reduce((sum, t) => {
          const pnl = t.realizedPnl ? parseFloat(t.realizedPnl.toString()) : 0;
          return sum + (pnl < 0 ? Math.abs(pnl) : 0);
        }, 0);
        const maxDailyLoss = parseFloat(account.maxDailyLoss.toString());
        if (todayLoss >= maxDailyLoss) {
          await db.aIDecision.update({
            where: { id: aiDecision.id },
            data: { outcome: 'CANCELLED', executedAt: new Date() }
          });
          return { userId: account.userId, status: 'blocked', reason: `今日亏损已达限额 $${maxDailyLoss}` };
        }
        
        // 风控检查3: 验证 AI 建议的交易金额
        const maxAmount = parseFloat(account.maxTradeAmount.toString());
        const aiTradeAmount = decision.tradeAmount || 0;
        const MIN_TRADE_VALUE = 5; // Binance 最小交易金额
        
        if (aiTradeAmount <= 0) {
          await db.aIDecision.update({
            where: { id: aiDecision.id },
            data: { outcome: 'CANCELLED', executedAt: new Date() }
          });
          return { userId: account.userId, status: 'blocked', reason: 'AI 未给出有效交易金额' };
        }
        
        // 检查是否低于 Binance 最小交易金额
        if (aiTradeAmount < MIN_TRADE_VALUE) {
          await db.aIDecision.update({
            where: { id: aiDecision.id },
            data: { outcome: 'CANCELLED', executedAt: new Date() }
          });
          return { userId: account.userId, status: 'blocked', reason: `订单金额 $${aiTradeAmount.toFixed(2)} 低于最小要求 $${MIN_TRADE_VALUE}` };
        }
        
        // 只对买入验证金额限制，卖出不限制
        if (decision.action === 'BUY' && aiTradeAmount > maxAmount) {
          await db.aIDecision.update({
            where: { id: aiDecision.id },
            data: { outcome: 'CANCELLED', executedAt: new Date() }
          });
          return { userId: account.userId, status: 'blocked', reason: `AI 建议买入金额 $${aiTradeAmount} 超限` };
        }
        
        const { getCurrentPrice } = await import('@/lib/binance');
        const currentPrice = await getCurrentPrice(client, symbol);
        let quantity = aiTradeAmount / currentPrice;
        
        console.log(`[Cron] 用户 ${account.userId}: AI 建议 $${aiTradeAmount}, 计算数量 ${quantity} ${symbol}`);

        const order = await placeMarketOrder(
          client,
          symbol,
          decision.action as 'BUY' | 'SELL',
          quantity
        );

        const trade = await db.trade.create({
          data: {
            accountId: account.id,
            orderId: order.orderId,
            symbol,
            side: decision.action,
            type: 'MARKET',
            price: new Decimal(order.fills[0].price),
            quantity: new Decimal(order.executedQty),
            quoteQty: new Decimal(order.cummulativeQuoteQty),
            commission: new Decimal(order.fills[0].commission),
            status: order.status,
            aiDecisionId: aiDecision.id,
            executedAt: order.transactTime
          }
        });

        await db.aIDecision.update({
          where: { id: aiDecision.id },
          data: {
            executed: true,
            executedAt: new Date(),
            outcome: 'SUCCESS'
          }
        });

        return { 
          userId: account.userId, 
          status: 'executed', 
          decision, 
          trade: trade.id 
        };
      } catch (error: any) {
        console.error(`[Cron] 处理用户 ${account.userId} 失败:`, error);
        return { 
          userId: account.userId, 
          status: 'error', 
          error: error.message 
        };
      }
    })
  );

  const summary = {
    total: accounts.length,
    executed: results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'executed').length,
    hold: results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'hold').length,
    lowConfidence: results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'low_confidence').length,
    failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any).status === 'error')).length,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', error: 'Promise rejected' })
  };

  console.log('[Cron] 执行完成', summary);

  return NextResponse.json(summary);
}

