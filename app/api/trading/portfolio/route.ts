import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserBinanceClient } from '@/lib/binance';

/**
 * GET /api/trading/portfolio
 * 获取 AI 管理的资产组合历史
 * 只计算通过 AI 买入的币种的总价值
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const account = await db.binanceAccount.findUnique({
      where: { userId: user.id }
    });
    
    if (!account) {
      return NextResponse.json({
        success: true,
        portfolio: []
      });
    }
    
    // 获取所有 AI 交易记录（不限制时间，需要完整历史来计算成本）
    const allTrades = await db.trade.findMany({
      where: {
        accountId: account.id,
        // 包含所有交易，不管是否有 aiDecisionId
        // 因为清理后 aiDecisionId 会被设置为 null
      },
      orderBy: { executedAt: 'asc' }
    });
    
    // 只返回最近 7 天的数据用于图表显示
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const trades = allTrades.filter(t => t.executedAt >= startDate);
    
    // 如果没有任何交易记录，返回空数据
    if (allTrades.length === 0) {
      return NextResponse.json({
        success: true,
        portfolio: [],
        initialInvestment: 0,
        currentValue: 0,
        pnl: 0,
        pnlPercent: 0,
        holdings: [],
        history: []
      });
    }
    
    // 如果最近 7 天没有交易，但有历史交易，仍然需要计算当前状态
    // 继续执行，使用所有历史交易计算成本
    
    // 获取当前账户余额和价格
    const { client } = await getUserBinanceClient(user.id);
    const { getAccountBalance } = await import('@/lib/binance');
    const accountBalance = await getAccountBalance(client);
    const prices = await (client as any).prices();
    
    // 获取当前账户 USDT 余额
    const currentUSDT = accountBalance.balances.find(b => b.asset === 'USDT')?.total || 0;
    console.log("currentUSDT", currentUSDT)
    // 计算所有交易（包括历史）花费的总 USDT
    let totalSpent = 0;
    for (const trade of allTrades) {
      const quoteQty = parseFloat(trade.quoteQty.toString());
      if (trade.side === 'BUY') {
        totalSpent += quoteQty; // 买入时花费
      } else if (trade.side === 'SELL') {
        totalSpent -= quoteQty; // 卖出时回收
      }
    }
    console.log("totalspent", totalSpent)
    // 初始投入 = 当前 USDT + 已花费的 USDT
    const initialInvestment = currentUSDT + totalSpent;
    
    // 用所有交易计算历史数据点（确保历史数据准确）
    const portfolio: any[] = [];
    const holdings: { [key: string]: number } = {}; // AI 持仓
    let usdtInPortfolio = initialInvestment; // 组合中的 USDT
    
    // 遍历所有交易，生成完整的历史记录
    for (const trade of allTrades) {
      const symbol = trade.symbol;
      const asset = symbol.replace('USDT', ''); // 提取币种，如 BTC
      const quantity = parseFloat(trade.quantity.toString());
      const quoteQty = parseFloat(trade.quoteQty.toString());
      
      if (trade.side === 'BUY') {
        // 买入：增加币种持仓，减少 USDT
        holdings[asset] = (holdings[asset] || 0) + quantity;
        usdtInPortfolio -= quoteQty;
      } else if (trade.side === 'SELL') {
        // 卖出：减少币种持仓，增加 USDT
        holdings[asset] = (holdings[asset] || 0) - quantity;
        usdtInPortfolio += quoteQty;
      }
      
      // 计算此刻的总资产价值
      let totalValue = usdtInPortfolio;
      
      for (const [asset, amount] of Object.entries(holdings)) {
        if (amount > 0) {
          const assetSymbol = `${asset}USDT`;
          const price = prices[assetSymbol];
          
          if (price) {
            totalValue += amount * parseFloat(price);
          }
        }
      }
      
      portfolio.push({
        timestamp: trade.executedAt,
        totalValueUSDT: totalValue,
        holdings: { ...holdings },
        usdtBalance: usdtInPortfolio,
        initialInvestment, // 添加初始投入用于对比
        pnl: totalValue - initialInvestment, // 盈亏
        pnlPercent: initialInvestment > 0 ? ((totalValue - initialInvestment) / initialInvestment) * 100 : 0, // 盈亏百分比
        trade: {
          symbol: trade.symbol,
          side: trade.side,
          quantity,
          quoteQty
        }
      });
    }
    
    // 过滤出最近 N 天的数据用于图表显示
    const recentPortfolio = portfolio.filter(p => p.timestamp >= startDate);
    
    // 计算当前持仓和总价值（使用所有交易计算的最终状态）
    // 注意：holdings 和 usdtInPortfolio 已经在上面遍历所有交易时计算好了
    const allHoldings = holdings;
    const allUsdtInPortfolio = usdtInPortfolio;
    
    // 如果最近 N 天没有交易，添加一个当前状态的快照
    if (recentPortfolio.length === 0) {
      let totalValue = allUsdtInPortfolio;
      
      for (const [asset, amount] of Object.entries(allHoldings)) {
        if (amount > 0) {
          const assetSymbol = `${asset}USDT`;
          const price = prices[assetSymbol];
          
          if (price) {
            totalValue += amount * parseFloat(price);
          }
        }
      }
      
      recentPortfolio.push({
        timestamp: new Date(),
        totalValueUSDT: totalValue,
        holdings: { ...allHoldings },
        usdtBalance: allUsdtInPortfolio,
        initialInvestment,
        pnl: totalValue - initialInvestment,
        pnlPercent: initialInvestment > 0 ? ((totalValue - initialInvestment) / initialInvestment) * 100 : 0,
        trade: null
      });
    }
    
    // 计算当前持仓和总价值（使用所有交易计算的持仓）
    const currentHoldings: any[] = [];
    let currentValue = allUsdtInPortfolio;
    
    for (const [asset, amount] of Object.entries(allHoldings)) {
      if (amount > 0.000001) { // 忽略极小的余额
        const assetSymbol = `${asset}USDT`;
        const price = prices[assetSymbol];
        
        if (price) {
          const value = amount * parseFloat(price);
          currentValue += value;
          
          // 计算该币种的成本和盈亏
          let cost = 0;
          for (const trade of allTrades) {
            if (trade.symbol === assetSymbol && trade.side === 'BUY') {
              cost += parseFloat(trade.quoteQty.toString());
            }
          }
          
          currentHoldings.push({
            asset,
            quantity: amount,
            value,
            cost,
            pnl: value - cost,
            pnlPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0
          });
        }
      }
    }
    
    // 返回两种格式：
    // 1. portfolio 数组（最近 N 天的数据，用于图表显示）
    // 2. 新的汇总数据
    return NextResponse.json({
      success: true,
      portfolio: recentPortfolio, // 最近 N 天的数据，用于图表显示
      // 新的汇总格式
      initialInvestment,
      currentValue,
      pnl: currentValue - initialInvestment,
      pnlPercent: initialInvestment > 0 ? ((currentValue - initialInvestment) / initialInvestment) * 100 : 0,
      holdings: currentHoldings,
      history: recentPortfolio.map(p => ({
        time: new Date(p.timestamp).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        value: p.totalValueUSDT
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '获取资产组合失败: ' + error.message },
      { status: 500 }
    );
  }
}

