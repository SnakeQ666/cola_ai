import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runFuturesAIDecision } from '@/lib/trading/futures-ai-engine';
import { getUserBinanceFuturesClient, placeFuturesMarketOrder, setLeverage, getFuturesMarkPrice, getFuturesSymbolInfo, adjustFuturesQuantity, getFuturesAccountInfo, getFuturesPositions } from '@/lib/binance-futures';
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

      // 确定交易方向和仓位方向，并执行下单
      let side: 'BUY' | 'SELL';
      let positionSide: 'LONG' | 'SHORT';
      let order: any;
      let executedQty: number;
      let avgPrice: number;

      if (decision.action === 'OPEN_LONG') {
        side = 'BUY';
        positionSide = 'LONG';
        
        // 开仓下单
        order = await placeFuturesMarketOrder(
          client,
          symbol,
          side,
          quantity,
          positionSide
        );
      } else if (decision.action === 'OPEN_SHORT') {
        side = 'SELL';
        positionSide = 'SHORT';
        
        // 开仓下单
        order = await placeFuturesMarketOrder(
          client,
          symbol,
          side,
          quantity,
          positionSide
        );
      } else if (decision.action === 'CLOSE_LONG' || decision.action === 'CLOSE_SHORT') {
        // 平仓：先获取实际持仓数量，然后使用 reduceOnly 平仓
        const currentPositions = await getFuturesPositions(client, symbol);
        const currentPosition = currentPositions.find((p: any) => {
          const pSide = parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT';
          const targetSide = decision.action === 'CLOSE_LONG' ? 'LONG' : 'SHORT';
          return p.symbol === symbol && pSide === targetSide;
        });
        
        if (!currentPosition) {
          throw new Error(`未找到 ${symbol} ${decision.action === 'CLOSE_LONG' ? 'LONG' : 'SHORT'} 持仓`);
        }
        
        // 使用实际持仓数量，确保完全平仓
        const actualPositionQty = Math.abs(parseFloat(currentPosition.positionAmt));
        quantity = Math.min(quantity, actualPositionQty); // 确保不超过实际持仓
        
        side = decision.action === 'CLOSE_LONG' ? 'SELL' : 'BUY';
        positionSide = decision.action === 'CLOSE_LONG' ? 'LONG' : 'SHORT';
        
        // 平仓时使用 reduceOnly=true，确保只减少持仓，不会开反向仓位
        order = await placeFuturesMarketOrder(
          client,
          symbol,
          side,
          quantity,
          positionSide,
          true // reduceOnly = true
        );
      } else {
        throw new Error(`未知的交易动作: ${decision.action}`);
      }

      // 使用我们自己计算的值，因为 Binance 可能不返回 avgPrice 和 executedQty
      executedQty = parseFloat(order.executedQty?.toString() || order.cumQty?.toString() || order.origQty?.toString() || quantity.toString());
      avgPrice = parseFloat(order.avgPrice?.toString() || markPrice.toString());

      // 等待一下，让 Binance 更新持仓状态
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 从 Binance 获取实际持仓状态
      const livePositions = await getFuturesPositions(client, symbol);
      const livePosition = livePositions.find((p: any) => {
        const pSide = parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT';
        return p.symbol === symbol && pSide === positionSide;
      });

      // 如果是平仓，先验证 Binance 实际状态，再更新数据库
      let orderPnl: number | null = null;
      let isDustClose = false; // 是否为灰烬平仓
      
      if (decision.action === 'CLOSE_LONG' || decision.action === 'CLOSE_SHORT') {
        // 查找对应的持仓记录（包括已关闭的，用于检测灰烬平仓）
        const position = await db.futuresPosition.findFirst({
          where: {
            accountId: futuresAccount.id,
            symbol,
            side: positionSide
          },
          orderBy: { createdAt: 'desc' }
        });
        
        // 验证 Binance 实际持仓状态
        const livePositionAmt = livePosition ? parseFloat(livePosition.positionAmt) : 0;
        const livePositionQty = Math.abs(livePositionAmt);
        const executedQtyNum = parseFloat(executedQty.toString());
        
        // 检测是否为灰烬平仓：
        // 1. 数据库中的 position 已经是 CLOSED 状态
        // 2. 或者 position 的 USDT 价值很小（小于 $1，可能是之前没平干净的）
        // 3. 或者 Binance 实际持仓的 USDT 价值很小但数据库还有记录
        if (position) {
          const positionQty = parseFloat(position.quantity.toString());
          const isPositionClosed = position.status === 'CLOSED';
          
          // 计算持仓的 USDT 价值来判断是否为灰烬持仓
          // 使用当前标记价格或开仓价来计算价值
          const positionValue = positionQty * parseFloat(avgPrice.toString());
          const livePositionValue = livePositionQty * parseFloat(avgPrice.toString());
          const executedValue = executedQtyNum * parseFloat(avgPrice.toString());
          
          // 灰烬持仓阈值：USDT 价值 < $1
          const DUST_THRESHOLD_USDT = 1;
          const isSmallPosition = positionValue < DUST_THRESHOLD_USDT;
          const isSmallLivePosition = livePositionValue < DUST_THRESHOLD_USDT && livePositionValue > 0;
          
          isDustClose = isPositionClosed || isSmallPosition || (isSmallLivePosition && executedValue < DUST_THRESHOLD_USDT);
          
          if (isDustClose) {
            console.warn(`[Futures Analyze] 检测到灰烬平仓：${symbol} ${positionSide}，数据库状态=${position.status}，数据库数量=${positionQty}，Binance数量=${livePositionQty}`);
          }
          
          // 如果 position 已经是 CLOSED，不应该再次更新，避免异常更改
          if (isPositionClosed) {
            console.warn(`[Futures Analyze] 持仓已关闭，跳过数据库更新，仅记录订单：${symbol} ${positionSide}`);
            // 仍然计算盈亏，但使用最后一次的开仓价（如果有历史记录）
            // 或者使用当前标记价格作为参考
            const entryPrice = parseFloat(position.entryPrice.toString());
            const closePrice = parseFloat(avgPrice.toString());
            if (positionSide === 'LONG') {
              orderPnl = (closePrice - entryPrice) * executedQtyNum;
            } else {
              orderPnl = (entryPrice - closePrice) * executedQtyNum;
            }
          } else if (position.status === 'OPEN') {
            // 正常平仓逻辑
            const entryPrice = parseFloat(position.entryPrice.toString());
            const closePrice = parseFloat(avgPrice.toString());
            const positionQty = parseFloat(position.quantity.toString());
            
            // 检查平仓数量是否合理
            if (executedQtyNum > positionQty) {
              console.warn(`[Futures Analyze] 警告：平仓数量 ${executedQtyNum} 大于开仓数量 ${positionQty}，可能形成反向仓位`);
            }
            
            // 计算盈亏（基于实际平仓数量）
            const actualCloseQty = Math.min(executedQtyNum, positionQty);
            if (positionSide === 'LONG') {
              // 多单盈亏 = (平仓价 - 开仓价) × 数量
              orderPnl = (closePrice - entryPrice) * actualCloseQty;
            } else {
              // 空单盈亏 = (开仓价 - 平仓价) × 数量
              orderPnl = (entryPrice - closePrice) * actualCloseQty;
            }
            
            // 如果 Binance 那边该方向的持仓已经为 0 或接近 0（考虑精度误差），说明真的平仓了
            // 使用 USDT 价值判断，阈值设为 $0.1（考虑不同币种的价值差异）
            const livePositionValue = livePositionQty * parseFloat(avgPrice.toString());
            const isFullyClosed = livePositionValue < 0.1;
            
            if (isFullyClosed) {
              // 完全平仓：更新持仓状态为已关闭
              // 注意：即使 executedQtyNum < positionQty，只要 Binance 持仓为 0，就认为完全平仓了
              await db.futuresPosition.update({
                where: { id: position.id },
                data: {
                  status: 'CLOSED',
                  closedAt: new Date(),
                  realizedPnl: position.realizedPnl 
                    ? new Decimal(parseFloat(position.realizedPnl.toString()) + orderPnl)
                    : new Decimal(orderPnl),
                  quantity: new Decimal(0) // 设置为 0，表示已完全平仓
                }
              });
              console.log(`[Futures Analyze] 完全平仓：${symbol} ${positionSide}`);
            } else {
              // 部分平仓：更新持仓数量，但不关闭状态
              // 使用 Binance 实际持仓数量，而不是计算值，确保数据一致
              const remainingQty = livePositionQty;
              
              // 如果数据库数量与 Binance 不一致，使用 Binance 的数量
              if (Math.abs(remainingQty - (positionQty - executedQtyNum)) > 0.0001) {
                console.warn(`[Futures Analyze] 持仓数量不一致：数据库 ${positionQty - executedQtyNum}，Binance ${remainingQty}，使用 Binance 数据`);
              }
              
              await db.futuresPosition.update({
                where: { id: position.id },
                data: {
                  quantity: new Decimal(remainingQty),
                  // 注意：部分平仓时，realizedPnl 应该累加，而不是直接赋值
                  realizedPnl: position.realizedPnl 
                    ? new Decimal(parseFloat(position.realizedPnl.toString()) + orderPnl)
                    : new Decimal(orderPnl)
                }
              });
              console.log(`[Futures Analyze] 部分平仓：${symbol} ${positionSide}，剩余数量 ${remainingQty}`);
            }
          }
        } else {
          // 没有找到对应的持仓记录，可能是灰烬平仓（之前已经被手动平仓或完全平仓了）
          isDustClose = true;
          console.warn(`[Futures Analyze] 未找到对应的持仓记录，可能是灰烬平仓: ${symbol} ${positionSide}`);
          
          // 仍然计算一个参考盈亏（使用当前价格）
          // 但因为没有开仓价，无法准确计算，设为 0 或使用标记价格估算
          orderPnl = 0; // 灰烬平仓的盈亏设为 0，因为无法准确计算
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
            // @ts-ignore - Prisma Client 需要重新生成以识别 leverage 和 isDustClose 字段
            leverage: leverage,  // 保存杠杆倍数
            status: order.status || 'FILLED',
            pnl: orderPnl !== null ? new Decimal(orderPnl) : null,  // 保存盈亏
            // @ts-ignore - Prisma Client 需要重新生成以识别 leverage 和 isDustClose 字段
            isDustClose: isDustClose,  // 标记是否为灰烬平仓
            aiDecisionId: aiDecision.id
          }
        });
      } else {
        // 如果订单已存在，更新 pnl（平仓时可能之前没有 pnl）、杠杆倍数和灰烬平仓标记
        if (orderPnl !== null && !futuresOrder.pnl) {
          await db.futuresOrder.update({
            where: { id: futuresOrder.id },
            data: {
              pnl: new Decimal(orderPnl),
              status: order.status || 'FILLED',
              executedQty: new Decimal(executedQty),
              avgPrice: new Decimal(avgPrice),
              // @ts-ignore - Prisma Client 需要重新生成以识别 leverage 和 isDustClose 字段
              leverage: leverage,  // 更新杠杆倍数
              // @ts-ignore - Prisma Client 需要重新生成以识别 leverage 和 isDustClose 字段
              isDustClose: isDustClose  // 更新灰烬平仓标记
            }
          });
        } else if (!(futuresOrder as any).leverage || (isDustClose && !(futuresOrder as any).isDustClose)) {
          // 如果订单存在但没有杠杆倍数，或者需要更新灰烬平仓标记
          await db.futuresOrder.update({
            where: { id: futuresOrder.id },
            data: {
              // @ts-ignore - Prisma Client 需要重新生成以识别 leverage 和 isDustClose 字段
              leverage: leverage || (futuresOrder as any).leverage,
              // @ts-ignore - Prisma Client 需要重新生成以识别 leverage 和 isDustClose 字段
              isDustClose: isDustClose || (futuresOrder as any).isDustClose
            }
          });
        }
      }

      // 如果是开仓，先验证 Binance 实际状态，再创建持仓记录
      if (decision.action === 'OPEN_LONG' || decision.action === 'OPEN_SHORT') {
        // 验证 Binance 是否真的开仓成功
        const livePositionAmt = livePosition ? parseFloat(livePosition.positionAmt) : 0;
        const expectedAmt = positionSide === 'LONG' ? executedQty : -executedQty;
        
        // 检查 Binance 实际持仓是否与预期一致（考虑精度误差）
        const isPositionOpened = Math.abs(livePositionAmt - expectedAmt) < 0.0001 || 
                                  (positionSide === 'LONG' && livePositionAmt > 0) ||
                                  (positionSide === 'SHORT' && livePositionAmt < 0);
        
        if (isPositionOpened && livePosition) {
          // 开仓成功：使用 Binance 返回的实际数据创建持仓记录
          const actualQty = Math.abs(livePositionAmt);
          const actualEntryPrice = parseFloat(livePosition.entryPrice);
          const actualLiquidationPrice = parseFloat(livePosition.liquidationPrice);
          const actualLeverage = parseInt(livePosition.leverage);
          
          // 计算强平价格（如果 Binance 没有返回，自己计算）
          const maintenanceMarginRate = 0.005;
          let liquidationPrice: number;
          if (positionSide === 'LONG') {
            liquidationPrice = actualLiquidationPrice || parseFloat(avgPrice.toString()) * (1 - 1 / actualLeverage + maintenanceMarginRate);
          } else {
            liquidationPrice = actualLiquidationPrice || parseFloat(avgPrice.toString()) * (1 + 1 / actualLeverage - maintenanceMarginRate);
          }
          
          await db.futuresPosition.create({
            data: {
              accountId: futuresAccount.id,
              symbol,
              side: positionSide,
              leverage: actualLeverage || leverage,
              entryPrice: new Decimal(actualEntryPrice || avgPrice),
              quantity: new Decimal(actualQty),
              margin: new Decimal(margin),
              markPrice: new Decimal(parseFloat(livePosition.markPrice) || markPrice),
              liquidationPrice: new Decimal(liquidationPrice),
              aiDecisionId: aiDecision.id,
              status: 'OPEN'
            }
          });
          console.log(`[Futures Analyze] 开仓成功：${symbol} ${positionSide}，数量 ${actualQty}`);
        } else {
          // 开仓失败：记录警告
          console.warn(`[Futures Analyze] 开仓验证失败：${symbol} ${positionSide}，期望数量 ${executedQty}，Binance 实际持仓 ${livePositionAmt}`);
        }
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

