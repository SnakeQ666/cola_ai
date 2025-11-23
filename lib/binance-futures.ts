/**
 * Binance 合约交易 API 封装
 */

import Binance from 'binance-api-node';
import { db } from './db';
import { decryptApiKey } from './crypto';

// 创建 Binance 合约客户端
export function createBinanceFuturesClient(apiKey: string, apiSecret: string, isTestnet: boolean = true) {
  return Binance({
    apiKey,
    apiSecret,
    ...(isTestnet ? {
      httpBase: 'https://testnet.binancefuture.com',
      wsBase: 'wss://stream.binancefuture.com'
    } : {})
  });
}

// 获取用户的 Binance 合约客户端
export async function getUserBinanceFuturesClient(userId: string) {
  // 合约交易使用现货账户的 API Key
  const account = await db.binanceAccount.findUnique({
    where: { userId }
  });

  if (!account) {
    throw new Error('未找到 Binance 账户配置');
  }

  const apiKey = decryptApiKey(account.apiKey);
  const apiSecret = decryptApiKey(account.apiSecret);

  const client = createBinanceFuturesClient(apiKey, apiSecret, account.isTestnet);

  return { client, account };
}

// 获取合约账户余额
export async function getFuturesAccountBalance(client: any) {
  try {
    const accountInfo = await client.futuresAccountBalance();
    return Array.isArray(accountInfo) ? accountInfo : [];
  } catch (error: any) {
    console.error('[Binance Futures] 获取账户余额失败:', error);
    // 如果是测试网或权限问题，返回空数组
    if (error.message?.includes('testnet') || error.message?.includes('Invalid')) {
      console.log('[Binance Futures] 返回空余额列表');
      return [];
    }
    throw new Error(`获取账户余额失败: ${error.message}`);
  }
}

// 获取合约持仓信息
export async function getFuturesPositions(client: any, symbol?: string) {
  try {
    // 不传参数获取所有持仓
    const positions = symbol 
      ? await client.futuresPositionRisk({ symbol })
      : await client.futuresPositionRisk();
    
    // 过滤出有持仓的
    if (Array.isArray(positions)) {
      return positions.filter((p: any) => parseFloat(p.positionAmt) !== 0);
    }
    return [];
  } catch (error: any) {
    console.error('[Binance Futures] 获取持仓信息失败:', error);
    // 如果是测试网或没有持仓，返回空数组而不是抛出错误
    if (error.message?.includes('Invalid symbol') || error.message?.includes('testnet')) {
      console.log('[Binance Futures] 返回空持仓列表');
      return [];
    }
    throw new Error(`获取持仓信息失败: ${error.message}`);
  }
}

// 设置杠杆倍数
export async function setLeverage(client: any, symbol: string, leverage: number) {
  try {
    const result = await client.futuresLeverage({
      symbol,
      leverage
    });
    return result;
  } catch (error: any) {
    console.error('[Binance Futures] 设置杠杆失败:', error);
    throw new Error(`设置杠杆失败: ${error.message}`);
  }
}

// 设置保证金模式（逐仓/全仓）
export async function setMarginType(client: any, symbol: string, marginType: 'ISOLATED' | 'CROSSED') {
  try {
    const result = await client.futuresMarginType({
      symbol,
      marginType
    });
    return result;
  } catch (error: any) {
    // 如果已经是该模式，会返回错误，忽略
    if (error.message?.includes('No need to change margin type')) {
      return { success: true, message: '保证金模式已是目标模式' };
    }
    console.error('[Binance Futures] 设置保证金模式失败:', error);
    throw new Error(`设置保证金模式失败: ${error.message}`);
  }
}

// 下合约市价单
export async function placeFuturesMarketOrder(
  client: any,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  positionSide?: 'LONG' | 'SHORT'
) {
  try {
    // 检查持仓模式
    const isDualSide = await getPositionMode(client);
    
    const orderParams: any = {
      symbol,
      side,
      type: 'MARKET',
      quantity: quantity.toString()
    };

    // 双向持仓模式：必须指定 positionSide
    if (isDualSide) {
      if (!positionSide) {
        throw new Error('双向持仓模式下必须指定仓位方向');
      }
      orderParams.positionSide = positionSide;
    } else {
      // 单向持仓模式：不能指定 positionSide，或者指定为 BOTH
      // 不设置 positionSide 参数
    }

    console.log('[Binance Futures] 下单参数:', orderParams);
    const order = await client.futuresOrder(orderParams);
    console.log('[Binance Futures] 订单成功:', order);
    return order;
  } catch (error: any) {
    console.error('[Binance Futures] 下单失败:', error);
    throw new Error(`下单失败: ${error.message}`);
  }
}

// 平仓（市价）
export async function closeFuturesPosition(
  client: any,
  symbol: string,
  positionSide: 'LONG' | 'SHORT',
  quantity: number
) {
  try {
    // LONG 仓位用 SELL 平仓，SHORT 仓位用 BUY 平仓
    const side = positionSide === 'LONG' ? 'SELL' : 'BUY';
    
    const order = await placeFuturesMarketOrder(
      client,
      symbol,
      side,
      quantity,
      positionSide
    );
    
    return order;
  } catch (error: any) {
    console.error('[Binance Futures] 平仓失败:', error);
    throw new Error(`平仓失败: ${error.message}`);
  }
}

// 获取合约交易对信息
export async function getFuturesSymbolInfo(client: any, symbol: string) {
  try {
    const exchangeInfo = await client.futuresExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find((s: any) => s.symbol === symbol);
    
    if (!symbolInfo) {
      throw new Error(`未找到交易对 ${symbol}`);
    }

    // 提取关键过滤器
    const filters = symbolInfo.filters;
    const priceFilter = filters.find((f: any) => f.filterType === 'PRICE_FILTER');
    const lotSizeFilter = filters.find((f: any) => f.filterType === 'LOT_SIZE');
    const minNotionalFilter = filters.find((f: any) => f.filterType === 'MIN_NOTIONAL');

    return {
      symbol: symbolInfo.symbol,
      status: symbolInfo.status,
      baseAsset: symbolInfo.baseAsset,
      quoteAsset: symbolInfo.quoteAsset,
      pricePrecision: symbolInfo.pricePrecision,
      quantityPrecision: symbolInfo.quantityPrecision,
      minPrice: priceFilter?.minPrice,
      maxPrice: priceFilter?.maxPrice,
      tickSize: priceFilter?.tickSize,
      minQty: lotSizeFilter?.minQty,
      maxQty: lotSizeFilter?.maxQty,
      stepSize: lotSizeFilter?.stepSize,
      minNotional: minNotionalFilter?.notional
    };
  } catch (error: any) {
    console.error('[Binance Futures] 获取交易对信息失败:', error);
    throw new Error(`获取交易对信息失败: ${error.message}`);
  }
}

// 调整数量以符合交易规则
export function adjustFuturesQuantity(quantity: number, stepSize: string, minQty: string, maxQty: string): number {
  const step = parseFloat(stepSize);
  const min = parseFloat(minQty);
  const max = parseFloat(maxQty);

  // 确保数量是 stepSize 的整数倍
  let adjusted = Math.floor(quantity / step) * step;

  // 确保在最小和最大范围内
  adjusted = Math.max(min, Math.min(max, adjusted));

  // 根据 stepSize 的小数位数进行四舍五入
  const decimals = stepSize.indexOf('1') - 1;
  adjusted = parseFloat(adjusted.toFixed(Math.max(0, decimals)));

  return adjusted;
}

// 获取合约K线数据
export async function getFuturesKlineData(
  client: any,
  symbol: string,
  interval: string = '1h',
  limit: number = 100
) {
  try {
    const candles = await client.futuresCandles({
      symbol,
      interval,
      limit
    });

    if (!Array.isArray(candles)) {
      return [];
    }

    return candles.map((candle: any) => ({
      openTime: candle.openTime,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
      closeTime: candle.closeTime
    }));
  } catch (error: any) {
    console.error('[Binance Futures] 获取K线数据失败:', error);
    // 如果是无效币种，返回空数组让 AI 跳过
    if (error.message?.includes('Invalid symbol')) {
      console.log(`[Binance Futures] ${symbol} 无效，跳过`);
      return [];
    }
    throw new Error(`获取K线数据失败: ${error.message}`);
  }
}

// 获取当前标记价格
export async function getFuturesMarkPrice(client: any, symbol: string) {
  try {
    const markPrice = await client.futuresMarkPrice({ symbol });
    if (Array.isArray(markPrice) && markPrice.length > 0) {
      return parseFloat(markPrice[0].markPrice);
    }
    return parseFloat(markPrice.markPrice);
  } catch (error: any) {
    console.error('[Binance Futures] 获取标记价格失败:', error);
    if (error.message?.includes('Invalid symbol')) {
      console.log(`[Binance Futures] ${symbol} 无效，返回 0`);
      return 0;
    }
    throw new Error(`获取标记价格失败: ${error.message}`);
  }
}

// 获取资金费率
export async function getFundingRate(client: any, symbol: string) {
  try {
    const fundingRate = await client.futuresFundingRate({ symbol, limit: 1 });
    if (fundingRate && fundingRate.length > 0) {
      return {
        fundingRate: parseFloat(fundingRate[0].fundingRate),
        fundingTime: fundingRate[0].fundingTime
      };
    }
    return null;
  } catch (error: any) {
    console.error('[Binance Futures] 获取资金费率失败:', error);
    return null;
  }
}

// 获取合约交易所信息
export async function getFuturesExchangeInfo(client: any) {
  try {
    const exchangeInfo = await client.futuresExchangeInfo();
    return exchangeInfo;
  } catch (error: any) {
    console.error('[Binance Futures] 获取交易所信息失败:', error);
    throw new Error(`获取交易所信息失败: ${error.message}`);
  }
}

// 获取持仓模式
export async function getPositionMode(client: any) {
  try {
    const result = await client.futuresPositionSideDual();
    return result.dualSidePosition; // true = 双向持仓, false = 单向持仓
  } catch (error: any) {
    console.error('[Binance Futures] 获取持仓模式失败:', error);
    return false; // 默认单向持仓
  }
}

// 设置持仓模式
export async function setPositionMode(client: any, dualSidePosition: boolean) {
  try {
    await client.futuresPositionSideDual({ dualSidePosition });
    console.log(`[Binance Futures] 持仓模式已设置为: ${dualSidePosition ? '双向持仓' : '单向持仓'}`);
    return true;
  } catch (error: any) {
    console.error('[Binance Futures] 设置持仓模式失败:', error);
    throw new Error(`设置持仓模式失败: ${error.message}`);
  }
}

// 获取所有可用的合约交易对
export async function getAllFuturesSymbols(client: any) {
  try {
    const exchangeInfo = await client.futuresExchangeInfo();
    return exchangeInfo.symbols
      .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s: any) => s.symbol);
  } catch (error: any) {
    console.error('[Binance Futures] 获取交易对列表失败:', error);
    throw new Error(`获取交易对列表失败: ${error.message}`);
  }
}

