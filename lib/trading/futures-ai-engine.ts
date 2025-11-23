/**
 * AI 合约交易决策引擎
 * 基于 DeepSeek AI 进行合约交易决策
 */

import OpenAI from 'openai';
import { db } from '../db';
import { getUserBinanceFuturesClient, getFuturesKlineData, getFuturesPositions, getFuturesMarkPrice, getFundingRate } from '../binance-futures';
import { calculateRSI, calculateMACD, calculateEMA, calculateBollingerBands } from './indicators';
import { Decimal } from '@prisma/client/runtime/library';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
});

const SYSTEM_PROMPT = `你是专业的加密货币合约交易AI，负责分析市场并决定合约交易策略。

分析要求：
1. 分析市场趋势，判断多空方向
2. 基于技术指标（RSI、MACD、EMA、布林带）分析
3. 考虑当前持仓情况和盈亏状态
4. 给出明确建议：OPEN_LONG（开多）/ OPEN_SHORT（开空）/ CLOSE_LONG（平多）/ CLOSE_SHORT（平空）/ HOLD（持有）
5. 建议合适的杠杆倍数和保证金
6. 设置止损和止盈价格

输出格式（必须严格遵守）：
交易币种：[BTCUSDT/ETHUSDT等]
趋势：[强烈上升/上升/震荡/下降/强烈下降]
关键指标：[核心数据]
建议：[OPEN_LONG/OPEN_SHORT/CLOSE_LONG/CLOSE_SHORT/HOLD]
杠杆倍数：[1-125的整数]
保证金：[USDT金额]
止损价格：[价格]
止盈价格：[价格]
信心指数：[0.0-1.0]
风险等级：[LOW/MEDIUM/HIGH]
理由：[1-2句话说明]

交易规则：
- **强烈上升趋势 + RSI < 70**：考虑开多仓
- **强烈下降趋势 + RSI > 30**：考虑开空仓
- **RSI > 80 或 < 20**：极端超买超卖，谨慎操作
- **MACD 金叉 + EMA12 > EMA26**：多头信号
- **MACD 死叉 + EMA12 < EMA26**：空头信号
- **有持仓时，优先考虑止盈止损**：
  - 盈利 > 10%：考虑止盈
  - 亏损 > 5%：考虑止损
  - 亏损 > 10%：立即止损
- **杠杆选择**：
  - 信心高 + 风险低：可用 10-20x
  - 信心中等：使用 5-10x
  - 风险高：使用 2-5x
- **保证金控制**：单仓位不超过用户设定的最大值
- **资金费率考虑**：费率过高时避免开仓
- **避免在震荡市使用高杠杆**`;

export async function runFuturesAIDecision(userId: string) {
  console.log(`[Futures AI] 开始决策，用户: ${userId}`);

  try {
    const { client, account: spotAccount } = await getUserBinanceFuturesClient(userId);

    // 获取合约账户配置
    const futuresAccount = await db.futuresAccount.findUnique({
      where: { userId }
    });

    if (!futuresAccount || !futuresAccount.enableAutoTrade) {
      console.log('[Futures AI] 自动交易未启用');
      return null;
    }

    // 获取所有允许交易的币种数据
    const symbols = futuresAccount.allowedSymbols.length > 0 
      ? futuresAccount.allowedSymbols 
      : ['BTCUSDT'];
    
    const marketData: any = {};

    for (const symbol of symbols) {
      try {
        const klines = await getFuturesKlineData(client, symbol, '1h', 100);
        
        // 如果没有K线数据，跳过这个币种
        if (!klines || klines.length === 0) {
          console.log(`[Futures AI] ${symbol} 没有K线数据，跳过`);
          continue;
        }
        
        const closes = klines.map(k => k.close);

        const rsi = calculateRSI(closes, 14);
        const macd = calculateMACD(closes);
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);
        const boll = calculateBollingerBands(closes, 20, 2);
        const markPrice = await getFuturesMarkPrice(client, symbol);
        const fundingRate = await getFundingRate(client, symbol);

        // 如果标记价格为 0，跳过
        if (markPrice === 0) {
          console.log(`[Futures AI] ${symbol} 标记价格为 0，跳过`);
          continue;
        }

        marketData[symbol] = {
          rsi,
          macd: macd.macd,
          ema12,
          ema26,
          boll,
          markPrice,
          fundingRate: fundingRate?.fundingRate || 0,
          klines: klines.slice(-5)
        };
      } catch (error) {
        console.error(`[Futures AI] 获取 ${symbol} 数据失败:`, error);
      }
    }

    // 如果没有任何有效的市场数据，返回 null
    if (Object.keys(marketData).length === 0) {
      console.log('[Futures AI] 没有有效的市场数据，跳过分析');
      return null;
    }

    // 获取当前持仓
    const positions = await getFuturesPositions(client);
    let positionsInfo = '无持仓';
    let positionsWithPnl: any[] = [];

    if (positions.length > 0) {
      positionsWithPnl = positions.map((p: any) => {
        const unrealizedPnl = parseFloat(p.unRealizedProfit);
        const margin = parseFloat(p.isolatedMargin) || parseFloat(p.positionInitialMargin);
        const roe = margin > 0 ? (unrealizedPnl / margin) * 100 : 0;

        return {
          symbol: p.symbol,
          side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
          quantity: Math.abs(parseFloat(p.positionAmt)),
          entryPrice: parseFloat(p.entryPrice),
          markPrice: parseFloat(p.markPrice),
          leverage: parseInt(p.leverage),
          unrealizedPnl,
          roe,
          liquidationPrice: parseFloat(p.liquidationPrice)
        };
      });

      positionsInfo = positionsWithPnl
        .map(p => {
          const pnlSign = p.unrealizedPnl >= 0 ? '+' : '';
          return `${p.symbol} ${p.side} ${p.leverage}x: 开仓价 $${p.entryPrice}, 标记价 $${p.markPrice}, 盈亏 ${pnlSign}$${p.unrealizedPnl.toFixed(2)} (${pnlSign}${p.roe.toFixed(2)}%), 强平价 $${p.liquidationPrice}`;
        })
        .join('\n');
    }

    // 构建市场分析信息
    let marketAnalysis = '';
    for (const [sym, data] of Object.entries(marketData)) {
      marketAnalysis += `
${sym}:
- 标记价格: ${data.markPrice.toFixed(2)}
- RSI(14): ${data.rsi.toFixed(2)}
- MACD: ${data.macd.toFixed(2)}
- EMA12: ${data.ema12.toFixed(2)}
- EMA26: ${data.ema26.toFixed(2)}
- 布林带上轨: ${data.boll.upper.toFixed(2)}
- 布林带中轨: ${data.boll.middle.toFixed(2)}
- 布林带下轨: ${data.boll.lower.toFixed(2)}
- 资金费率: ${(data.fundingRate * 100).toFixed(4)}%
`;
    }

    const analysisPrompt = `请分析以下合约市场状况：

${marketAnalysis}

当前持仓：
${positionsInfo}

风控限制：
- 单仓位最大保证金: $${futuresAccount.maxPositionSize} USDT
- 最大杠杆倍数: ${futuresAccount.maxLeverage}x
- 默认杠杆: ${futuresAccount.defaultLeverage}x
- 止损百分比: ${futuresAccount.stopLossPercent}%
- 止盈百分比: ${futuresAccount.takeProfitPercent}%
- 允许交易币种: ${futuresAccount.allowedSymbols.join(', ')}

请按照系统提示的格式输出，特别注意：
1. **必须明确给出"交易币种"**
2. **必须给出具体的杠杆倍数和保证金**
3. **必须设置止损和止盈价格**
4. 如果有持仓，优先判断是否该止盈或止损
5. 考虑资金费率，费率过高时避免开仓
6. 分析所有币种，选择最优机会`;

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const reasoning = response.choices[0].message.content || '';
    console.log('[Futures AI] AI 分析完成');
    
    const decision = parseFuturesAIDecision(reasoning);

    // 使用 AI 选择的币种
    const selectedSymbol = decision.symbol || symbols[0];
    const selectedMarketData = marketData[selectedSymbol];

    // 保存决策记录
    const aiDecision = await db.futuresAIDecision.create({
      data: {
        accountId: futuresAccount.id,
        marketData: selectedMarketData ? {
          symbol: selectedSymbol,
          markPrice: selectedMarketData.markPrice,
          fundingRate: selectedMarketData.fundingRate,
          klines: selectedMarketData.klines
        } : {},
        accountBalance: {},
        currentPositions: positionsWithPnl,
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
        suggestedLeverage: decision.leverage,
        suggestedMargin: decision.margin ? new Decimal(decision.margin) : null,
        targetPrice: decision.targetPrice ? new Decimal(decision.targetPrice) : null,
        stopLoss: decision.stopLoss ? new Decimal(decision.stopLoss) : null,
        takeProfit: decision.takeProfit ? new Decimal(decision.takeProfit) : null
      }
    });

    console.log(`[Futures AI] 决策完成: ${decision.action} ${selectedSymbol}, 杠杆: ${decision.leverage}x, 信心: ${decision.confidence}`);

    return { decision, reasoning, aiDecision };
  } catch (error: any) {
    console.error('[Futures AI] 决策失败:', error);
    throw error;
  }
}

function parseFuturesAIDecision(reasoning: string) {
  const confidenceMatch = reasoning.match(/信心指数[：:]\s*(0?\.\d+|\d+)/);
  const riskMatch = reasoning.match(/风险等级[：:]\s*(LOW|MEDIUM|HIGH)/i);
  const actionMatch = reasoning.match(/建议[：:]\s*(OPEN_LONG|OPEN_SHORT|CLOSE_LONG|CLOSE_SHORT|HOLD)/i);
  const symbolMatch = reasoning.match(/交易币种[：:]\s*([A-Z]+USDT)/i);
  const leverageMatch = reasoning.match(/杠杆倍数[：:]\s*(\d+)/);
  const marginMatch = reasoning.match(/保证金[：:]\s*\$?(\d+(?:\.\d+)?)/);
  const stopLossMatch = reasoning.match(/止损价格[：:]\s*\$?(\d+(?:\.\d+)?)/);
  const takeProfitMatch = reasoning.match(/止盈价格[：:]\s*\$?(\d+(?:\.\d+)?)/);

  return {
    confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
    riskLevel: riskMatch ? riskMatch[1].toUpperCase() : 'MEDIUM',
    action: actionMatch ? actionMatch[1].toUpperCase() : 'HOLD',
    symbol: symbolMatch ? symbolMatch[1].toUpperCase() : null,
    leverage: leverageMatch ? parseInt(leverageMatch[1]) : 10,
    margin: marginMatch ? parseFloat(marginMatch[1]) : null,
    stopLoss: stopLossMatch ? parseFloat(stopLossMatch[1]) : null,
    takeProfit: takeProfitMatch ? parseFloat(takeProfitMatch[1]) : null,
    targetPrice: null
  };
}

