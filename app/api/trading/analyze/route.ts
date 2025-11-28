import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runAITradingDecision } from '@/lib/trading/ai-engine';
import { getUserBinanceClient, placeMarketOrder } from '@/lib/binance';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const result = await runAITradingDecision(user.id);
    
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

    // 检查信心指数
    if (decision.confidence < 0.7) {
      await db.aIDecision.update({
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
        reason: `信心指数过低 (${(decision.confidence * 100).toFixed(0)}%)，已取消交易`
      });
    }

    // 执行交易
    try {
      const { client, account } = await getUserBinanceClient(user.id);
      // 使用 AI 选择的币种
      const symbol = decision.symbol;
      
      if (!symbol) {
        await db.aIDecision.update({
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
      
      // 风控检查1: 检查币种是否在允许列表中
      if (!account.allowedSymbols.includes(symbol)) {
        await db.aIDecision.update({
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
      
      // 风控检查2: 检查今日亏损
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTrades = await db.trade.findMany({
        where: {
          accountId: account.id,
          executedAt: { gte: today }
        }
      });
      
      const todayLoss = todayTrades.reduce((sum, t) => {
        const pnl = t.realizedPnl ? parseFloat(t.realizedPnl.toString()) : 0;
        return sum + (pnl < 0 ? Math.abs(pnl) : 0);
      }, 0);
      
      const maxDailyLoss = parseFloat(account.maxDailyLoss.toString());
      
      if (todayLoss >= maxDailyLoss) {
        await db.aIDecision.update({
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
          reason: `今日亏损 $${todayLoss.toFixed(2)} 已达限额 $${maxDailyLoss.toFixed(2)}`
        });
      }
      
      // 风控检查3: 验证 AI 建议的交易金额
      const maxAmount = parseFloat(account.maxTradeAmount.toString());
      let aiTradeAmount = decision.tradeAmount || 0;
      const MIN_TRADE_VALUE = 5; // Binance 最小交易金额
      
      // 对于卖出操作，如果 AI 没有给出金额，自动使用持仓价值
      if (decision.action === 'SELL' && aiTradeAmount <= 0) {
        // 从 AI 决策中获取持仓信息
        const aiDecisionData = await db.aIDecision.findUnique({
          where: { id: aiDecision.id },
          select: { accountBalance: true }
        });
        
        const accountBalanceData = aiDecisionData?.accountBalance as any;
        const holdings = accountBalanceData?.aiHoldings || {};
        
        // 查找要卖出的币种的持仓
        const asset = symbol.replace('USDT', '');
        const holdingQty = holdings[asset] || 0;
        
        if (holdingQty > 0) {
          const { getCurrentPrice } = await import('@/lib/binance');
          const currentPrice = await getCurrentPrice(client, symbol);
          aiTradeAmount = holdingQty * currentPrice;
        }
      }
      
      // 检查 AI 是否给出了交易金额
      if (aiTradeAmount <= 0) {
        await db.aIDecision.update({
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
          reason: 'AI 未给出有效的交易金额，且无可卖出的持仓'
        });
      }
      
      // 检查是否低于 Binance 最小交易金额
      if (aiTradeAmount < MIN_TRADE_VALUE) {
        await db.aIDecision.update({
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
          reason: `订单金额 $${aiTradeAmount.toFixed(2)} 低于最小要求 $${MIN_TRADE_VALUE.toFixed(2)}`
        });
      }
      
      // 只对买入验证金额限制，卖出不限制（因为是卖持仓）
      if (decision.action === 'BUY' && aiTradeAmount > maxAmount) {
        await db.aIDecision.update({
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
          reason: `AI 建议买入金额 $${aiTradeAmount.toFixed(2)} 超过限额 $${maxAmount.toFixed(2)}`
        });
      }
      
      // 获取当前价格并计算数量
      const { getCurrentPrice } = await import('@/lib/binance');
      const currentPrice = await getCurrentPrice(client, symbol);
      
      // 根据 AI 建议的金额计算交易数量
      let quantity = aiTradeAmount / currentPrice;
      
      const order = await placeMarketOrder(
        client,
        symbol,
        decision.action as 'BUY' | 'SELL',
        quantity
      );

      // 记录交易
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

      // 更新决策记录
      await db.aIDecision.update({
        where: { id: aiDecision.id },
        data: {
          executed: true,
          executedAt: new Date(),
          outcome: 'SUCCESS'
        }
      });

      return NextResponse.json({
        success: true,
        decision: result.decision,
        reasoning: result.reasoning,
        decisionId: result.aiDecision.id,
        executed: true,
        trade: {
          id: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          quantity: order.executedQty,
          price: order.fills[0].price,
          total: order.cummulativeQuoteQty
        }
      });
    } catch (tradeError: any) {
      
      await db.aIDecision.update({
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
      { error: error.message || 'AI 分析失败' },
      { status: 500 }
    );
  }
}

