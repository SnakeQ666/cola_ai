// Binance API 工具函数

import Binance from 'binance-api-node';
import { db } from './db';
import { decryptApiKey } from './crypto';

/**
 * 创建 Binance 客户端
 */
export function createBinanceClient(apiKey: string, apiSecret: string, isTestnet: boolean = true) {
  const config: any = {
    apiKey,
    apiSecret,
  };
  
  // 如果是测试网，使用测试网地址
  if (isTestnet) {
    config.httpBase = 'https://testnet.binance.vision';
    config.wsBase = 'wss://testnet.binance.vision/ws';
  }
  
  return Binance(config);
}

/**
 * 获取用户的 Binance 客户端
 */
export async function getUserBinanceClient(userId: string) {
  const account = await db.binanceAccount.findUnique({
    where: { userId }
  });
  
  if (!account) {
    throw new Error('未找到 Binance 账户配置');
  }
  
  // 解密 API 凭证
  const apiKey = decryptApiKey(account.apiKey);
  const apiSecret = decryptApiKey(account.apiSecret);
  
  return {
    client: createBinanceClient(apiKey, apiSecret, account.isTestnet),
    account
  };
}

/**
 * 测试 Binance API 连接
 */
export async function testBinanceConnection(
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean = true
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const client = createBinanceClient(apiKey, apiSecret, isTestnet);
    
    // 测试连接：获取账户信息
    const accountInfo = await (client as any).accountInfo();
    
    return {
      success: true,
      message: '连接成功',
      data: {
        canTrade: accountInfo.canTrade,
        canWithdraw: accountInfo.canWithdraw,
        canDeposit: accountInfo.canDeposit,
        balances: accountInfo.balances
          .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .slice(0, 5) // 只返回前5个有余额的币种
      }
    };
  } catch (error: any) {
    
    return {
      success: false,
      message: error.message || '连接失败，请检查 API Key 和 Secret'
    };
  }
}

/**
 * 获取账户余额
 */
export async function getAccountBalance(client: any) {
  try {
    const accountInfo = await client.accountInfo();
    
    const balances = accountInfo.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));
    
    return {
      balances,
      canTrade: accountInfo.canTrade,
      canWithdraw: accountInfo.canWithdraw,
      updateTime: new Date()
    };
  } catch (error: any) {
    throw new Error('获取账户余额失败: ' + error.message);
  }
}

/**
 * 获取 K 线数据
 */
export async function getKlineData(
  client: any,
  symbol: string,
  interval: string = '1h',
  limit: number = 100
) {
  try {
    const candles = await client.candles({
      symbol,
      interval,
      limit
    });
    
    return candles.map((c: any) => ({
      openTime: new Date(c.openTime),
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume),
      closeTime: new Date(c.closeTime)
    }));
  } catch (error: any) {
    throw new Error('获取K线数据失败: ' + error.message);
  }
}

/**
 * 获取当前价格
 */
export async function getCurrentPrice(client: any, symbol: string): Promise<number> {
  try {
    const ticker = await client.prices({ symbol });
    return parseFloat(ticker[symbol]);
  } catch (error: any) {
    throw new Error('获取当前价格失败: ' + error.message);
  }
}

/**
 * 获取交易对信息（包含精度和数量限制）
 */
export async function getSymbolInfo(client: any, symbol: string) {
  try {
    const exchangeInfo = await client.exchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find((s: any) => s.symbol === symbol);
    
    if (!symbolInfo) {
      throw new Error(`找不到交易对 ${symbol}`);
    }
    
    // 提取 LOT_SIZE 过滤器
    const lotSize = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    // 提取 MIN_NOTIONAL 过滤器（最小交易金额）
    const minNotional = symbolInfo.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL' || f.filterType === 'NOTIONAL');
    
    return {
      symbol: symbolInfo.symbol,
      baseAsset: symbolInfo.baseAsset, // 如 BTC
      quoteAsset: symbolInfo.quoteAsset, // 如 USDT
      status: symbolInfo.status,
      // 数量精度
      baseAssetPrecision: symbolInfo.baseAssetPrecision,
      quotePrecision: symbolInfo.quotePrecision,
      // LOT_SIZE 限制
      minQty: parseFloat(lotSize?.minQty || '0'),
      maxQty: parseFloat(lotSize?.maxQty || '0'),
      stepSize: parseFloat(lotSize?.stepSize || '0'),
      // 最小交易金额
      minNotional: parseFloat(minNotional?.minNotional || minNotional?.notional || '0')
    };
  } catch (error: any) {
    throw new Error('获取交易对信息失败: ' + error.message);
  }
}

/**
 * 调整数量以符合交易对规则
 */
export function adjustQuantity(quantity: number, symbolInfo: any): number {
  const { minQty, maxQty, stepSize } = symbolInfo;
  
  // 确保不低于最小数量
  if (quantity < minQty) {
    console.warn(`[Binance] 数量 ${quantity} 低于最小值 ${minQty}，已调整为 ${minQty}`);
    quantity = minQty;
  }
  
  // 确保不超过最大数量
  if (quantity > maxQty) {
    console.warn(`[Binance] 数量 ${quantity} 超过最大值 ${maxQty}，已调整为 ${maxQty}`);
    quantity = maxQty;
  }
  
  // 调整到正确的步长（精度）
  const precision = stepSize.toString().split('.')[1]?.length || 0;
  quantity = Math.floor(quantity / stepSize) * stepSize;
  quantity = parseFloat(quantity.toFixed(precision));
  
  return quantity;
}

/**
 * 下市价单
 */
export async function placeMarketOrder(
  client: any,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number
) {
  try {
    // 获取交易对信息
    const symbolInfo = await getSymbolInfo(client, symbol);
    
    // 调整数量以符合规则
    const adjustedQuantity = adjustQuantity(quantity, symbolInfo);
    
    // 验证最小交易金额
    const currentPrice = await getCurrentPrice(client, symbol);
    const orderValue = adjustedQuantity * currentPrice;
    
    if (orderValue < symbolInfo.minNotional) {
      throw new Error(`订单金额 $${orderValue.toFixed(2)} 低于最小要求 $${symbolInfo.minNotional.toFixed(2)}`);
    }
    
    const order = await client.order({
      symbol,
      side,
      type: 'MARKET',
      quantity: adjustedQuantity.toString()
    });
    
    return {
      orderId: order.orderId.toString(),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      executedQty: parseFloat(order.executedQty),
      cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty),
      status: order.status,
      fills: order.fills.map((f: any) => ({
        price: parseFloat(f.price),
        qty: parseFloat(f.qty),
        commission: parseFloat(f.commission),
        commissionAsset: f.commissionAsset
      })),
      transactTime: new Date(order.transactTime)
    };
  } catch (error: any) {
    throw new Error('下单失败: ' + error.message);
  }
}
/**
 * 计算订单价值（USDT）
 */
export async function calculateOrderValue(
  client: any,
  symbol: string,
  quantity: number
): Promise<number> {
  const price = await getCurrentPrice(client, symbol);
  
  // 如果是 USDT 交易对，直接返回数量
  if (symbol.endsWith('USDT')) {
    return price * quantity;
  }
  
  // 否则需要转换
  // TODO: 实现其他币种到 USDT 的转换
  return price * quantity;
}

