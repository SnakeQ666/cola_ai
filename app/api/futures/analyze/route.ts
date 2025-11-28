import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runFuturesAIDecision } from '@/lib/trading/futures-ai-engine';
import { getUserBinanceFuturesClient, placeFuturesMarketOrder, setLeverage, getFuturesMarkPrice, getFuturesSymbolInfo, adjustFuturesQuantity, getFuturesAccountInfo } from '@/lib/binance-futures';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const result = await runFuturesAIDecision(user.id);

    if (!result) {
      return NextResponse.json({ error: '自动交易未启用' }, { status: 400 });
    }

    const { decision, aiDecision } = result;

    // 如果是持有，直接返回
    if (decision.action === 'HOLD') {
      return NextResponse.json({
        success: true,
        decision: result.decision,
        reasoning: result.reasoning,
        decisionId: result.aiDecision.id,
        executed: false,
        reason: '建议持有，不执行交易'
      });
    }

    // 检查信心指数（合约交易：65% 以上即可执行）
    if (decision.confidence < 0.65) {
      await db.futuresAIDecision.update({
        where: { id: aiDecision.id },
        data: { 
          outcome: 'CANCELLED',
          executedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        decision: result.decision,
        reasoning: result.reasoning,
        decisionId: result.aiDecision.id,
        executed: false,
        reason: `信心指数过低 (${(decision.confidence * 100).toFixed(0)}%)，已取消交易（需要 ≥65%）`
      });
    }

    // 执行交易
    try {
      const { client } = await getUserBinanceFuturesClient(user.id);
      const futuresAccount = await db.futuresAccount.findUnique({
        where: { userId: user.id }
      });

      if (!futuresAccount) {
        throw new Error('合约账户未找到');
      }

      const symbol = decision.symbol;
      
      if (!symbol) {
        await db.futuresAIDecision.update({
          where: { id: aiDecision.id },
          data: { 
            outcome: 'CANCELLED',
            executedAt: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          decision: result.decision,
          reasoning: result.reasoning,
          decisionId: result.aiDecision.id,
          executed: false,
          reason: 'AI 未指定交易币种'
        });
      }

      // 风控检查：币种白名单
      if (!futuresAccount.allowedSymbols.includes(symbol)) {
        await db.futuresAIDecision.update({
          where: { id: aiDecision.id },
          data: { 
            outcome: 'CANCELLED',
            executedAt: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          decision: result.decision,
          reasoning: result.reasoning,
          decisionId: result.aiDecision.id,
          executed: false,
          reason: `${symbol} 不在允许交易列表中`
        });
      }

      // 风控检查：日亏损限额
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayOrders = await db.futuresOrder.findMany({
        where: {
          accountId: futuresAccount.id,
          createdAt: {
            gte: today
          }
        }
      });

      const todayPnl = todayOrders.reduce((sum, order) => {
        return sum + parseFloat(order.pnl?.toString() || '0');
      }, 0);

      const maxDailyLoss = parseFloat(futuresAccount.maxDailyLoss.toString());
      
      if (todayPnl < -maxDailyLoss) {
        await db.futuresAIDecision.update({
          where: { id: aiDecision.id },
          data: { 
            outcome: 'CANCELLED',
            executedAt: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          decision: result.decision,
          reasoning: result.reasoning,
          decisionId: result.aiDecision.id,
          executed: false,
          reason: `今日亏损 $${Math.abs(todayPnl).toFixed(2)} 已达到限额 $${maxDailyLoss}`
        });
      }

      // 风控检查：保证金限制
      const margin = decision.margin || 0;
      const maxMargin = parseFloat(futuresAccount.maxPositionSize.toString());
      
      if (margin > maxMargin) {
        await db.futuresAIDecision.update({
          where: { id: aiDecision.id },
          data: { 
            outcome: 'CANCELLED',
            executedAt: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          decision: result.decision,
          reasoning: result.reasoning,
          decisionId: result.aiDecision.id,
          executed: false,
          reason: `保证金 $${margin} 超过限额 $${maxMargin}`
        });
      }

      // 风控检查：杠杆限制
      const leverage = decision.leverage || futuresAccount.defaultLeverage;
      const maxLeverage = futuresAccount.maxLeverage;
      
      if (leverage > maxLeverage) {
        await db.futuresAIDecision.update({
          where: { id: aiDecision.id },
          data: { 
            outcome: 'CANCELLED',
            executedAt: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          decision: result.decision,
          reasoning: result.reasoning,
          decisionId: result.aiDecision.id,
          executed: false,
          reason: `杠杆 ${leverage}x 超过限额 ${maxLeverage}x`
        });
      }

      // 设置杠杆
      await setLeverage(client, symbol, leverage);

      // 获取当前价格和交易对信息
      const markPrice = await getFuturesMarkPrice(client, symbol);
      const symbolInfo = await getFuturesSymbolInfo(client, symbol);

      // 计算数量
      let quantity = margin * leverage / markPrice;
      quantity = adjustFuturesQuantity(
        quantity,
        symbolInfo.stepSize,
        symbolInfo.minQty,
        symbolInfo.maxQty
      );

      // 确定交易方向和仓位方向
      let side: 'BUY' | 'SELL';
      let positionSide: 'LONG' | 'SHORT';

      if (decision.action === 'OPEN_LONG') {
        side = 'BUY';
        positionSide = 'LONG';
      } else if (decision.action === 'OPEN_SHORT') {
        side = 'SELL';
        positionSide = 'SHORT';
      } else if (decision.action === 'CLOSE_LONG') {
        side = 'SELL';
        positionSide = 'LONG';
      } else if (decision.action === 'CLOSE_SHORT') {
        side = 'BUY';
        positionSide = 'SHORT';
      } else {
        throw new Error(`未知的交易动作: ${decision.action}`);
      }

      // 下单
      const order = await placeFuturesMarketOrder(
        client,
        symbol,
        side,
        quantity,
        positionSide
      );

      // 使用我们自己计算的值，因为 Binance 可能不返回 avgPrice 和 executedQty
      const executedQty = order.executedQty || order.cumQty || order.origQty || quantity;
      const avgPrice = order.avgPrice || markPrice;  // 市价单使用标记价格

      // 如果是平仓，计算盈亏
      let orderPnl: number | null = null;
      
      if (decision.action === 'CLOSE_LONG' || decision.action === 'CLOSE_SHORT') {
        // 查找对应的持仓记录
        const position = await db.futuresPosition.findFirst({
          where: {
            accountId: futuresAccount.id,
            symbol,
            side: positionSide,
            status: 'OPEN'
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (position) {
          const entryPrice = parseFloat(position.entryPrice.toString());
          const closePrice = parseFloat(avgPrice.toString());
          const qty = parseFloat(executedQty.toString());
          
          // 计算盈亏
          if (positionSide === 'LONG') {
            // 多单盈亏 = (平仓价 - 开仓价) × 数量
            orderPnl = (closePrice - entryPrice) * qty;
          } else {
            // 空单盈亏 = (开仓价 - 平仓价) × 数量
            orderPnl = (entryPrice - closePrice) * qty;
          }
          
          // 更新持仓状态为已关闭
          await db.futuresPosition.update({
            where: { id: position.id },
            data: {
              status: 'CLOSED',
              closedAt: new Date(),
              realizedPnl: new Decimal(orderPnl)
            }
          });
        } else {
          console.warn(`[Futures Analyze] 未找到对应的持仓记录: ${symbol} ${positionSide}`);
        }
      }

      // 记录订单（检查是否已存在，避免重复保存）
      let futuresOrder = await db.futuresOrder.findUnique({
        where: { orderId: order.orderId.toString() }
      });
      
      if (!futuresOrder) {
        // 如果订单不存在，创建新记录
        futuresOrder = await db.futuresOrder.create({
          data: {
            accountId: futuresAccount.id,
            orderId: order.orderId.toString(),
            symbol,
            side,
            positionSide,
            type: 'MARKET',
            quantity: new Decimal(quantity),
            executedQty: new Decimal(executedQty),
            avgPrice: new Decimal(avgPrice),
            status: order.status || 'FILLED',
            pnl: orderPnl !== null ? new Decimal(orderPnl) : null,  // 保存盈亏
            aiDecisionId: aiDecision.id
          }
        });
      } else {
        // 如果订单已存在，更新 pnl（平仓时可能之前没有 pnl）
        if (orderPnl !== null && !futuresOrder.pnl) {
          await db.futuresOrder.update({
            where: { id: futuresOrder.id },
            data: {
              pnl: new Decimal(orderPnl),
              status: order.status || 'FILLED',
              executedQty: new Decimal(executedQty),
              avgPrice: new Decimal(avgPrice)
            }
          });
        }
      }

      // 如果是开仓，创建持仓记录
      if (decision.action === 'OPEN_LONG' || decision.action === 'OPEN_SHORT') {
        // 计算强平价格
        // 维持保证金率（一般为 0.5% - 1%，这里使用 0.5%）
        const maintenanceMarginRate = 0.005;
        
        let liquidationPrice: number;
        if (positionSide === 'LONG') {
          // 多单强平价格 = 开仓价 × (1 - 1/杠杆 + 维持保证金率)
          liquidationPrice = parseFloat(avgPrice.toString()) * (1 - 1 / leverage + maintenanceMarginRate);
        } else {
          // 空单强平价格 = 开仓价 × (1 + 1/杠杆 - 维持保证金率)
          liquidationPrice = parseFloat(avgPrice.toString()) * (1 + 1 / leverage - maintenanceMarginRate);
        }
        
        await db.futuresPosition.create({
          data: {
            accountId: futuresAccount.id,
            symbol,
            side: positionSide,
            leverage,
            entryPrice: new Decimal(avgPrice),
            quantity: new Decimal(executedQty),
            margin: new Decimal(margin),
            markPrice: new Decimal(markPrice),
            liquidationPrice: new Decimal(liquidationPrice),
            aiDecisionId: aiDecision.id,
            status: 'OPEN'
          }
        });
      }

      // 更新决策记录
      await db.futuresAIDecision.update({
        where: { id: aiDecision.id },
        data: {
          executed: true,
          executedAt: new Date(),
          outcome: 'SUCCESS'
        }
      });

      // 保存余额快照
      try {
        const accountInfo = await getFuturesAccountInfo(client);
        const totalBalance = parseFloat(accountInfo.totalWalletBalance || '0');
        const availableBalance = parseFloat(accountInfo.availableBalance || '0');
        const usedMargin = parseFloat(accountInfo.totalInitialMargin || '0');
        const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit || '0');

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
      } catch (balanceError) {
      }

      return NextResponse.json({
        success: true,
        decision: result.decision,
        reasoning: result.reasoning,
        decisionId: result.aiDecision.id,
        executed: true,
        order: {
          id: futuresOrder.id,
          symbol: futuresOrder.symbol,
          side: futuresOrder.side,
          positionSide: futuresOrder.positionSide,
          quantity: order.executedQty || quantity,
          price: order.avgPrice || markPrice,
          leverage
        }
      });
    } catch (tradeError: any) {
      
      await db.futuresAIDecision.update({
        where: { id: aiDecision.id },
        data: {
          outcome: 'FAILED',
          executedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        decision: result.decision,
        reasoning: result.reasoning,
        decisionId: result.aiDecision.id,
        executed: false,
        reason: '交易执行失败: ' + tradeError.message
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '合约 AI 分析失败' },
      { status: 500 }
    );
  }
}

