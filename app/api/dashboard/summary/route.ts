import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserBinanceClient } from '@/lib/binance';
import { getUserBinanceFuturesClient, getFuturesAccountInfo } from '@/lib/binance-futures';

/**
 * GET /api/dashboard/summary
 * 获取交易数据汇总（现货和合约）
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取现货账户信息
    const spotAccount = await db.binanceAccount.findUnique({
      where: { userId: user.id }
    });

    // 获取合约账户信息
    const futuresAccount = await db.futuresAccount.findUnique({
      where: { userId: user.id }
    });

    const summary: any = {
      spot: {
        enabled: !!spotAccount,
        account: null,
        portfolio: null,
        riskControl: null
      },
      futures: {
        enabled: !!futuresAccount,
        account: null,
        portfolio: null,
        riskControl: null
      }
    };

    // 获取现货数据
    if (spotAccount) {
      try {
        // 获取账户配置
        summary.spot.account = {
          enableAutoTrade: spotAccount.enableAutoTrade,
          isTestnet: spotAccount.isTestnet,
          tradeInterval: spotAccount.tradeInterval || 5
        };

        // 获取风控设置
        summary.spot.riskControl = {
          maxTradeAmount: parseFloat(spotAccount.maxTradeAmount.toString()),
          maxDailyLoss: parseFloat(spotAccount.maxDailyLoss.toString()),
          allowedSymbols: spotAccount.allowedSymbols || []
        };

        // 获取投资组合数据
        try {
          const { client } = await getUserBinanceClient(user.id);
          const { getAccountBalance } = await import('@/lib/binance');
          const accountBalance = await getAccountBalance(client);
          const prices = await (client as any).prices();
          
          // 获取所有交易记录
          const allTrades = await db.trade.findMany({
            where: { accountId: spotAccount.id },
            orderBy: { executedAt: 'asc' }
          });

          if (allTrades.length > 0) {
            // 计算初始投入
            const currentUSDT = accountBalance.balances.find(b => b.asset === 'USDT')?.total || 0;
            let totalSpent = 0;
            for (const trade of allTrades) {
              const quoteQty = parseFloat(trade.quoteQty.toString());
              if (trade.side === 'BUY') {
                totalSpent += quoteQty;
              } else if (trade.side === 'SELL') {
                totalSpent -= quoteQty;
              }
            }
            const initialInvestment = currentUSDT + totalSpent;

            // 计算当前持仓价值
            const allHoldings: { [asset: string]: number } = {};
            for (const trade of allTrades) {
              const asset = trade.symbol.replace('USDT', '');
              const qty = parseFloat(trade.quantity.toString());
              allHoldings[asset] = (allHoldings[asset] || 0) + (trade.side === 'BUY' ? qty : -qty);
            }

            let currentValue = currentUSDT;
            for (const [asset, amount] of Object.entries(allHoldings)) {
              if (amount > 0.000001) {
                const assetSymbol = `${asset}USDT`;
                const price = prices[assetSymbol];
                if (price) {
                  currentValue += amount * parseFloat(price);
                }
              }
            }

            const pnl = currentValue - initialInvestment;
            const pnlPercent = initialInvestment > 0 ? (pnl / initialInvestment) * 100 : 0;

            summary.spot.portfolio = {
              initialInvestment,
              currentValue,
              pnl,
              pnlPercent,
              holdings: Object.keys(allHoldings).filter(asset => allHoldings[asset] > 0.000001).length
            };
          } else {
            summary.spot.portfolio = {
              initialInvestment: 0,
              currentValue: 0,
              pnl: 0,
              pnlPercent: 0,
              holdings: 0
            };
          }
        } catch (error: any) {
          console.error('[Dashboard Summary] 获取现货组合失败:', error.message);
        }
      } catch (error: any) {
        console.error('[Dashboard Summary] 获取现货数据失败:', error.message);
      }
    }

    // 获取合约数据
    if (futuresAccount) {
      try {
        // 获取账户配置
        summary.futures.account = {
          enableAutoTrade: futuresAccount.enableAutoTrade,
          defaultLeverage: futuresAccount.defaultLeverage,
          maxLeverage: futuresAccount.maxLeverage,
          tradeInterval: futuresAccount.tradeInterval || 5
        };

        // 获取风控设置
        summary.futures.riskControl = {
          maxPositionSize: parseFloat(futuresAccount.maxPositionSize.toString()),
          maxDailyLoss: parseFloat(futuresAccount.maxDailyLoss.toString()),
          stopLossPercent: parseFloat(futuresAccount.stopLossPercent.toString()),
          takeProfitPercent: parseFloat(futuresAccount.takeProfitPercent.toString()),
          allowedSymbols: futuresAccount.allowedSymbols || []
        };

        // 获取投资组合数据
        try {
          const { client } = await getUserBinanceFuturesClient(user.id);
          const accountInfo = await getFuturesAccountInfo(client);
          const currentBalance = parseFloat(accountInfo.totalWalletBalance || '0');
          const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit || '0');

          // 获取所有订单
          const allOrders = await db.futuresOrder.findMany({
            where: { accountId: futuresAccount.id },
            orderBy: { executedAt: 'asc' }
          });

          if (allOrders.length > 0) {
            // 计算初始投入
            const firstOrder = allOrders[0];
            let initialInvestment = 0;
            
            if (firstOrder?.executedAt) {
              const firstBalanceHistory = await db.futuresBalanceHistory.findFirst({
                where: {
                  accountId: futuresAccount.id,
                  snapshotAt: { gte: firstOrder.executedAt }
                },
                orderBy: { snapshotAt: 'asc' }
              });
              
              if (firstBalanceHistory) {
                const totalValueAfterFirstOrder = parseFloat(firstBalanceHistory.totalValueUSDT.toString());
                const firstOrderPnl = (firstOrder as any).pnl ? parseFloat((firstOrder as any).pnl.toString()) : 0;
                initialInvestment = totalValueAfterFirstOrder - firstOrderPnl;
              } else {
                const currentTotalValue = currentBalance + unrealizedPnl;
                let totalRealized = 0;
                for (const order of allOrders) {
                  const orderPnl = (order as any).pnl;
                  if (orderPnl) {
                    totalRealized += parseFloat(orderPnl.toString());
                  }
                }
                initialInvestment = currentTotalValue - totalRealized - unrealizedPnl;
              }
            } else {
              const currentTotalValue = currentBalance + unrealizedPnl;
              let totalRealized = 0;
              for (const order of allOrders) {
                const orderPnl = (order as any).pnl;
                if (orderPnl) {
                  totalRealized += parseFloat(orderPnl.toString());
                }
              }
              initialInvestment = currentTotalValue - totalRealized - unrealizedPnl;
            }

            if (initialInvestment < 0) {
              initialInvestment = 0;
            }

            const currentValue = currentBalance + unrealizedPnl;
            const pnl = currentValue - initialInvestment;
            const pnlPercent = initialInvestment > 0 ? (pnl / initialInvestment) * 100 : 0;

            // 获取当前持仓数量
            const openPositions = await db.futuresPosition.findMany({
              where: {
                accountId: futuresAccount.id,
                status: 'OPEN'
              }
            });

            summary.futures.portfolio = {
              initialInvestment,
              currentValue,
              pnl,
              pnlPercent,
              unrealizedPnl,
              positions: openPositions.length
            };
          } else {
            summary.futures.portfolio = {
              initialInvestment: 0,
              currentValue: 0,
              pnl: 0,
              pnlPercent: 0,
              unrealizedPnl: 0,
              positions: 0
            };
          }
        } catch (error: any) {
          console.error('[Dashboard Summary] 获取合约组合失败:', error.message);
        }
      } catch (error: any) {
        console.error('[Dashboard Summary] 获取合约数据失败:', error.message);
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    return NextResponse.json(
      { error: '获取数据汇总失败: ' + error.message },
      { status: 500 }
    );
  }
}

