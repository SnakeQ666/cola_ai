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
**⚠️ 平仓规则（非常重要，避免频繁交易导致手续费亏损）**：
- **核心原则：优先持有，减少频繁交易**
- **手续费成本**：每次开仓+平仓的手续费约为 0.04%-0.1%（双向），盈亏必须足够覆盖手续费
- **盈利平仓条件**（必须同时满足，更严格的阈值）：
  - 盈利幅度 ≥ 5%（ROE ≥ 5%，覆盖手续费后仍有足够利润），且
  - 出现明确的趋势反转信号（如：MACD 死叉/金叉、RSI 极端超买超卖、价格突破关键支撑/阻力位），或
  - 盈利幅度 ≥ 10%（ROE ≥ 10%）且持仓时间 ≥ 6小时，或
  - 盈利幅度 ≥ 15%（ROE ≥ 15%，无论趋势如何都建议止盈）
  - **禁止**：仅因为小幅盈利（< 5%）就平仓
- **亏损平仓条件**（必须同时满足，更严格的阈值）：
  - 亏损幅度 ≥ 8%（ROE ≤ -8%，避免因小幅波动就止损），且
  - 趋势明显恶化（如：MACD 持续背离、价格跌破关键支撑/阻力位、RSI 极端超卖/超买），或
  - 亏损幅度 ≥ 12%（ROE ≤ -12%）立即止损
  - **禁止**：仅因为小幅亏损（< 8%）就平仓
- **持仓时间考虑**（更长的持有时间）：
  - 持仓时间 < 2小时：除非极端情况（亏损 > 12% 或盈利 > 15%），否则继续持有
  - 持仓时间 2-6小时：需要明确的趋势反转信号才平仓
  - 持仓时间 ≥ 6小时：可以更灵活地根据盈亏和趋势决定
- **趋势延续判断**（强化持有逻辑）：
  - 如果当前趋势仍在延续，即使有小幅盈利/亏损，也应继续持有
  - 只有在趋势明确反转或达到较大盈亏目标时才平仓
  - **优先考虑趋势延续，而不是频繁交易**

**杠杆选择（必须严格遵守用户风控参数）**：
- 你的杠杆决策必须结合后续「风控限制」中给出的 **最大杠杆倍数** 和 **默认杠杆倍数**
- 所有UM 时，应在「默认杠杆倍数」附近小幅调整，避免极端放大杠杆
- 当风险等级为 HIGH 时，应在建议的杠杆倍数 **必须是 1-125 的整数**，且 **绝不能超过用户的最大杠杆倍数**
- 默认情况下，应优先在「默认杠杆倍数」附近小幅上下浮动，而不是任意选择过低或过高的杠杆
- 当风险等级为 LOW 且信心指数较高时，可以在「默认杠杆倍数」和「最大杠杆倍数」之间选择偏高的杠杆
- 当风险等级为 MEDI「默认杠杆倍数」以下适度降低杠杆，避免接近最大杠杆
- 即使市场非常有利，也 **禁止** 超过用户配置的最大杠杆倍数

**其他规则**：
- **保证金控制**：单仓位不超过用户设定的最大值
- **资金费率考虑**：费率过高时避免开仓
- **避免在震荡市使用高杠杆**
- **避免频繁交易**：每次平仓后，至少等待市场出现明确机会再开新仓`;

export async function runFuturesAIDecision(userId: string) {
  try {
    const { client, account: spotAccount } = await getUserBinanceFuturesClient(userId);

    // 获取合约账户配置
    const futuresAccount = await db.futuresAccount.findUnique({
      where: { userId }
    });

    if (!futuresAccount || !futuresAccount.enableAutoTrade) {
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
      }
    }

    // 如果没有任何有效的市场数据，返回 null
    if (Object.keys(marketData).length === 0) {
      return null;
    }

    // 获取当前持仓
    const positions = await getFuturesPositions(client);
    console.log('[Futures AI] 获取到的持仓数量:', positions.length);
    console.log('[Futures AI] 持仓数据:', positions);
    let positionsInfo = '无持仓';
    let positionsWithPnl: any[] = [];

    if (positions.length > 0) {
      // 从数据库获取持仓记录以获取开仓时间
      const dbPositions = await db.futuresPosition.findMany({
        where: {
          accountId: futuresAccount.id,
          status: 'OPEN'
        },
        orderBy: { createdAt: 'desc' }
      });
      console.log('[Futures AI] 数据库中的持仓记录数量:', dbPositions.length);
      console.log('[Futures AI] 数据库持仓记录:', dbPositions);
      console.log('[Futures AI] Binance 实时持仓:', positions);

      positionsWithPnl = positions.map((p: any) => {
        const unrealizedPnl = parseFloat(p.unRealizedProfit || '0');
        // 计算保证金：全仓模式下 isolatedMargin 为 0，需要使用 notional 和 leverage
        const isolatedMargin = parseFloat(p.isolatedMargin || '0');
        const notional = Math.abs(parseFloat(p.notional || '0')); // 名义价值（取绝对值）
        const leverage = parseInt(p.leverage || '1');
        
        let margin = 0;
        if (isolatedMargin > 0) {
          // 逐仓模式
          margin = isolatedMargin;
        } else if (notional > 0 && leverage > 0) {
          // 全仓模式：保证金 = 名义价值 / 杠杆倍数
          margin = notional / leverage;
        }
        
        const roe = margin > 0 ? (unrealizedPnl / margin) * 100 : 0;
        const dbPos = dbPositions.find(dp => dp.symbol === p.symbol && dp.side === (parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT'));
        const createdAt = dbPos?.createdAt || new Date();
        const holdingHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

        return {
          symbol: p.symbol,
          side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
          quantity: Math.abs(parseFloat(p.positionAmt)),
          entryPrice: parseFloat(p.entryPrice),
          markPrice: parseFloat(p.markPrice),
          leverage: parseInt(p.leverage),
          unrealizedPnl,
          roe,
          liquidationPrice: parseFloat(p.liquidationPrice),
          holdingHours
        };
      });

      positionsInfo = positionsWithPnl
        .map(p => {
          const pnlSign = p.unrealizedPnl >= 0 ? '+' : '';
          const holdingTime = p.holdingHours < 1 
            ? `${(p.holdingHours * 60).toFixed(0)}分钟`
            : p.holdingHours < 24
            ? `${p.holdingHours.toFixed(1)}小时`
            : `${(p.holdingHours / 24).toFixed(1)}天`;
          return `${p.symbol} ${p.side} ${p.leverage}x: 开仓价 $${p.entryPrice}, 标记价 $${p.markPrice}, 盈亏 ${pnlSign}$${p.unrealizedPnl.toFixed(2)} (${pnlSign}${p.roe.toFixed(2)}%), 强平价 $${p.liquidationPrice}, 持仓时间 ${holdingTime}`;
        })
        .join('\n');
    }

    // 构建市场分析信息
    let marketAnalysis = '';
    for (const [sym, data] of Object.entries(marketData)) {
      const marketDataItem = data as {
        markPrice: number;
        rsi: number;
        macd: number;
        ema12: number;
        ema26: number;
        boll: { upper: number; middle: number; lower: number };
        fundingRate: number;
      };
      marketAnalysis += `
${sym}:
- 标记价格: ${marketDataItem.markPrice.toFixed(2)}
- RSI(14): ${marketDataItem.rsi.toFixed(2)}
- MACD: ${marketDataItem.macd.toFixed(2)}
- EMA12: ${marketDataItem.ema12.toFixed(2)}
- EMA26: ${marketDataItem.ema26.toFixed(2)}
- 布林带上轨: ${marketDataItem.boll.upper.toFixed(2)}
- 布林带中轨: ${marketDataItem.boll.middle.toFixed(2)}
- 布林带下轨: ${marketDataItem.boll.lower.toFixed(2)}
- 资金费率: ${(marketDataItem.fundingRate * 100).toFixed(4)}%
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
4. **如果有持仓，判断是否平仓时，必须严格遵守平仓规则（更严格的阈值）**：
   - 计算当前盈亏百分比（ROE）
   - 评估趋势是否反转
   - 考虑持仓时间
   - **盈利平仓**：必须 ROE ≥ 5% 且有趋势反转信号，或 ROE ≥ 15%（无论趋势如何）
   - **亏损平仓**：必须 ROE ≤ -8% 且趋势恶化，或 ROE ≤ -12%（立即止损）
   - **持仓时间 < 2小时**：除非极端情况，否则继续持有
   - **持仓时间 2-6小时**：需要明确趋势反转才平仓
   - **持仓时间 ≥ 6小时**：可以更灵活地根据盈亏和趋势决定
   - **只有在盈亏足够覆盖手续费且有明确趋势反转信号时，才建议平仓**
   - **避免因为小幅波动（< 5% 盈利或 < 8% 亏损）就平仓**
5. **优先持有，减少交易频率**：
   - 如果当前持仓趋势仍在延续，即使有小幅盈利/亏损，也应继续持有
   - 只有在趋势明确反转或达到较大盈亏目标时才平仓
   - 避免因为小幅波动就频繁交易
6. 考虑资金费率，费率过高时避免开仓
7. 分析所有币种，但只在信号非常明确时才交易
8. **优先考虑趋势延续和持有，而不是频繁交易**`;

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


    return { decision, reasoning, aiDecision };
  } catch (error: any) {
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

