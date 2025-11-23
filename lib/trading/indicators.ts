// 技术指标计算工具

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

export function calculateMA(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b) / slice.length;
}

export function calculateMACD(prices: number[]) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  return {
    macd: macdLine,
    signal: 0,
    histogram: macdLine
  };
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  const ma = calculateMA(prices, period);
  const slice = prices.slice(-period);
  
  const variance = slice.reduce((sum, price) => {
    return sum + Math.pow(price - ma, 2);
  }, 0) / period;
  const sd = Math.sqrt(variance);
  
  return {
    upper: ma + stdDev * sd,
    middle: ma,
    lower: ma - stdDev * sd
  };
}

