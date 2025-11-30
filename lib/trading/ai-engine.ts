// AI 交易决策引擎

import OpenAI from 'openai';
import { db } from '@/lib/db';
import { getUserBinanceClient, getKlineData, getCurrentPrice, placeMarketOrder } from '@/lib/binance';
import { calculateRSI, calculateMACD, calculateEMA, calculateBollingerBands } from './indicators';
import { Decimal } from '@prisma/client/runtime/library';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1'
});

const SYSTEM_PROMPT = `你是专业的加密货币交易AI，负责分析市场并决定交易策略。

分析要求：
1. 分析所有提供的交易对，找出最佳交易机会
2. 基于技术指标（RSI、MACD、EMA、布林带）分析市场
3. 判断趋势方向和强度
4. **考虑当前持仓情况**
5. 给出明确建议：BUY/SELL/HOLD
6. 决定具体交易币种和金额

输出格式（必须严格遵守）：
交易币种：[BTCUSDT/ETHUSDT等]
趋势：[上升/下降/震荡]
关键指标：[核心数据]
建议：[BUY/SELL/HOLD]
交易金额：[数字]
信心指数：[0.0-1.0]
风险等级：[LOW/MEDIUM/HIGH]
理由：[1-2句话说明]

交易规则：
- **分析所有币种，选择信号最强的进行交易**
- RSI > 70 超买考虑卖出，< 30 超卖考虑买入
- EMA12上穿EMA26金叉买入，下穿死叉卖出
- 价格突破布林带上轨卖出，跌破下轨买入
- **有持仓时，必须结合盈亏状况决策：**
  - 盈利 > 5% 且技术指标转弱 → 获利了结
  - 盈利 > 10% → 强烈建议止盈
  - 亏损 5-10% 且趋势未改 → 继续持有
  - 亏损 > 10% → 立即止损
- **卖出决策优先级：止损 > 止盈 > 新买入**
- **灰尘持仓（价值 < $5）无法在 Binance 交易，绝对不要尝试卖出**
- 根据风险等级决定交易金额：LOW可用较大金额，HIGH用较小金额
- 交易金额必须在用户设定的最大限额内
- 避免在震荡市频繁交易`;

export async function runAITradingDecision(userId: string) {
  try {
    const { client, account } = await getUserBinanceClient(userId);
    
    if (!account.enableAutoTrade) {
      return null;
    }
    
    // 获取所有允许交易的币种数据
    const symbols = account.allowedSymbols.length > 0 ? account.allowedSymbols : ['BTCUSDT'];
    const marketData: any = {};
    
    for (const symbol of symbols) {
      try {
        const klines = await getKlineData(client, symbol, '1h', 100);
        const closes = klines.map(k => k.close);
        
        const rsi = calculateRSI(closes, 14);
        const macd = calculateMACD(closes);
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);
        const boll = calculateBollingerBands(closes, 20, 2);
        const currentPrice = closes[closes.length - 1];
        
        marketData[symbol] = {
          rsi,
          macd: macd.macd,
          ema12,
          ema26,
          boll,
          currentPrice,
          klines: klines.slice(-5)
        };
      } catch (error) {
      }
    }
    
    // 获取账户所有交易记录（手动 + AI），用于还原真实持仓
    const allTrades = await db.trade.findMany({
      where: {
        accountId: account.id
      },
      orderBy: { executedAt: 'asc' }
    });
    
    const aiHoldings: { [key: string]: number } = {};
    for (const trade of allTrades) {
      const asset = trade.symbol.replace('USDT', '');
      const quantity = parseFloat(trade.quantity.toString());
      
      if (trade.side === 'BUY') {
        aiHoldings[asset] = (aiHoldings[asset] || 0) + quantity;
      } else if (trade.side === 'SELL') {
        aiHoldings[asset] = (aiHoldings[asset] || 0) - quantity;
      }
    }
    
    
    // 构建持仓信息和盈亏
    let holdingsInfo = '无持仓';
    const holdingsWithValue: any[] = [];
    const dustHoldings: any[] = []; // 低于最小交易额的持仓（灰尘）
    let totalPnL = 0;
    const MIN_TRADE_VALUE = 5; // Binance 最小交易金额 $5 USDT
    if (Object.keys(aiHoldings).length > 0) {
      for (const [asset, qty] of Object.entries(aiHoldings)) {
        if (qty > 0) {
          const assetSymbol = `${asset}USDT`;
          const assetData = marketData[assetSymbol];
          const currentPrice = assetData?.currentPrice || 0;
          const currentValue = qty * currentPrice;
          
          // 计算该币种的成本（从交易记录中计算）
          let totalCost = 0;
          let totalBought = 0;
          
          for (const trade of allTrades) {
            if (trade.symbol === assetSymbol) {
              const tradeQty = parseFloat(trade.quantity.toString());
              const tradeCost = parseFloat(trade.quoteQty.toString());
              
              if (trade.side === 'BUY') {
                totalCost += tradeCost;
                totalBought += tradeQty;
              } else if (trade.side === 'SELL') {
                // 卖出时按比例减少成本
                const soldRatio = totalBought > 0 ? tradeQty / totalBought : 0;
                totalCost -= totalCost * soldRatio;
                totalBought -= tradeQty;
              }
            }
          }
          
          const pnl = currentValue - totalCost;
          const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
          totalPnL += pnl;
          
          const holding = {
            asset,
            quantity: qty,
            cost: totalCost,
            value: currentValue,
            pnl,
            pnlPercent,
            symbol: assetSymbol
          };
          
          // 区分可交易持仓和灰尘持仓
          if (currentValue >= MIN_TRADE_VALUE) {
            holdingsWithValue.push(holding);
          } else {
            dustHoldings.push(holding);
          }
        }
      }
     
      
      if (holdingsWithValue.length > 0 || dustHoldings.length > 0) {
        let infoLines: string[] = [];
        
        // 可交易持仓
        if (holdingsWithValue.length > 0) {
          infoLines.push('【可交易持仓】');
          holdingsWithValue.forEach(h => {
          const pnlSign = h.pnl >= 0 ? '+' : '';
          infoLines.push(`${h.asset}: ${h.quantity.toFixed(6)} (成本 $${h.cost.toFixed(2)}, 现价 $${h.value.toFixed(2)}, 盈亏 ${pnlSign}$${h.pnl.toFixed(2)} / ${pnlSign}${h.pnlPercent.toFixed(2)}%)`);
          });
        }
        
        // 灰尘持仓（不可交易）
        if (dustHoldings.length > 0) {
          if (infoLines.length > 0) infoLines.push('');
          infoLines.push('【灰尘持仓（价值低于 $5，暂不可交易）】');
          dustHoldings.forEach(h => {
          const pnlSign = h.pnl >= 0 ? '+' : '';
          infoLines.push(`${h.asset}: ${h.quantity.toFixed(6)} (价值 $${h.value.toFixed(2)}, 盈亏 ${pnlSign}$${h.pnl.toFixed(2)})`);
          });
        }
        
        holdingsInfo = infoLines.length > 0 ? infoLines.join('\n') : '无持仓';
      }
    }
    
    // 构建市场分析信息
    let marketAnalysis = '';
    for (const [sym, data] of Object.entries(marketData)) {
      const marketDataItem = data as {
        rsi: number;
        macd: number;
        ema12: number;
        ema26: number;
        boll: { upper: number; middle: number; lower: number };
        currentPrice: number;
      };
      marketAnalysis += `
${sym}:
- RSI(14): ${marketDataItem.rsi.toFixed(2)}
- MACD: ${marketDataItem.macd.toFixed(2)}
- EMA12: ${marketDataItem.ema12.toFixed(2)}
- EMA26: ${marketDataItem.ema26.toFixed(2)}
- 布林带上轨: ${marketDataItem.boll.upper.toFixed(2)}
- 布林带中轨: ${marketDataItem.boll.middle.toFixed(2)}
- 布林带下轨: ${marketDataItem.boll.lower.toFixed(2)}
- 当前价格: ${marketDataItem.currentPrice.toFixed(2)}
`;
    }
    
    const analysisPrompt = `请分析以下交易对的市场状况：

${marketAnalysis}

当前持仓：
${holdingsInfo}
${totalPnL !== 0 ? `总盈亏: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}` : ''}

风控限制：
- 单笔最大买入金额: $${account.maxTradeAmount} USDT
- 允许交易币种: ${account.allowedSymbols.join(', ')}

请按照系统提示的格式输出，特别注意：
1. **必须明确给出"交易币种"（如 BTCUSDT）**
2. **必须明确给出"交易金额"（单位USDT）**
   - **买入时**：交易金额不能超过 $${account.maxTradeAmount}
   - **卖出时**：交易金额为要卖出的币种的价值（如持有 0.001 BTC，当前价 $87000，则交易金额为 $87）
3. **卖出时**，只能卖出"可交易持仓"中的币种，**禁止卖出"灰尘持仓"**（价值低于$5无法交易）
4. 根据市场信心和风险等级合理分配金额
5. 如果建议HOLD，交易金额填0
6. **根据盈亏状况做决策：**
   - 盈利 > 5%：考虑获利了结
   - 亏损 > 5%：考虑止损或等待反弹
   - 亏损 > 10%：强烈建议止损
7. **分析所有币种，选择最优机会进行交易**
8. **灰尘持仓无法交易，忽略即可，只关注可交易持仓**
9. **卖出时可以部分卖出或全部卖出，根据市场情况决定**`;

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 800, // 限制输出长度，加快响应
    });
    
    const reasoning = response.choices[0].message.content || '';
    const decision = parseAIDecision(reasoning);
    
    // 使用 AI 选择的币种，如果没有则使用第一个
    const selectedSymbol = decision.symbol || symbols[0];
    const selectedMarketData = marketData[selectedSymbol];
    
    const aiDecision = await db.aIDecision.create({
      data: {
        accountId: account.id,
        marketData: selectedMarketData ? {
          symbol: selectedSymbol,
          price: selectedMarketData.currentPrice,
          klines: selectedMarketData.klines
        } : {},
        accountBalance: {},
        technicalIndicators: selectedMarketData ? {
          rsi: selectedMarketData.rsi,
          macd: selectedMarketData.macd,
          ema12: selectedMarketData.ema12,
          ema26: selectedMarketData.ema26,
          boll: selectedMarketData.boll
        } : {},
        reasoning,
        confidence: new Decimal(decision.confidence),
        riskLevel: decision.riskLevel,
        action: decision.action,
        symbol: selectedSymbol,
        targetPrice: decision.targetPrice ? new Decimal(decision.targetPrice) : null,
        targetQuantity: decision.targetQuantity ? new Decimal(decision.targetQuantity) : null,
      }
    });
    
    
    return { decision, reasoning, aiDecision };
  } catch (error: any) {
    throw error;
  }
}

function parseAIDecision(reasoning: string) {
  const confidenceMatch = reasoning.match(/信心指数[：:]\s*(0?\.\d+|\d+)/);
  const riskMatch = reasoning.match(/风险等级[：:]\s*(LOW|MEDIUM|HIGH)/i);
  const actionMatch = reasoning.match(/建议[：:]\s*(买入|卖出|持有|BUY|SELL|HOLD)/i);
  const amountMatch = reasoning.match(/交易金额[：:]\s*\$?(\d+(?:\.\d+)?)/);
  const symbolMatch = reasoning.match(/交易币种[：:]\s*([A-Z]+USDT)/i);
  
  let action = 'HOLD';
  if (actionMatch) {
    const matched = actionMatch[1];
    if (matched === '买入' || matched === 'BUY') action = 'BUY';
    else if (matched === '卖出' || matched === 'SELL') action = 'SELL';
  }
  
  // 解析 AI 建议的交易金额（USDT）
  const tradeAmount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  
  // 解析交易币种
  const symbol = symbolMatch ? symbolMatch[1].toUpperCase() : null;
  
  return {
    confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
    riskLevel: riskMatch ? riskMatch[1].toUpperCase() : 'MEDIUM',
    action,
    tradeAmount, // AI 建议的交易金额（USDT）
    symbol, // AI 选择的交易币种
    targetPrice: null,
    targetQuantity: null
  };
}

