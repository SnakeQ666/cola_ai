import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserBinanceClient, placeMarketOrder, getCurrentPrice } from '@/lib/binance';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const { symbol, side, quantity } = await request.json();
    
    if (!symbol || !side || !quantity) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }
    
    const { client, account } = await getUserBinanceClient(user.id);
    
    // 风控检查
    if (!account.allowedSymbols.includes(symbol)) {
      return NextResponse.json({ error: `${symbol} 不在允许交易列表中` }, { status: 400 });
    }
    
    const price = await getCurrentPrice(client, symbol);
    const orderValue = price * quantity;
    
    if (orderValue > parseFloat(account.maxTradeAmount.toString())) {
      return NextResponse.json({ 
        error: `订单金额 $${orderValue.toFixed(2)} 超过限额 $${account.maxTradeAmount}` 
      }, { status: 400 });
    }
    
    // 检查今日亏损
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
      return sum + (pnl < 0 ? pnl : 0);
    }, 0);
    
    if (Math.abs(todayLoss) >= parseFloat(account.maxDailyLoss.toString())) {
      return NextResponse.json({ 
        error: `今日亏损已达限额 $${account.maxDailyLoss}` 
      }, { status: 400 });
    }
    
    // 执行交易
    const order = await placeMarketOrder(client, symbol, side, quantity);
    
    // 记录交易
    const trade = await db.trade.create({
      data: {
        accountId: account.id,
        orderId: order.orderId,
        symbol,
        side,
        type: 'MARKET',
        price: new Decimal(order.fills[0].price),
        quantity: new Decimal(order.executedQty),
        quoteQty: new Decimal(order.cummulativeQuoteQty),
        commission: new Decimal(order.fills[0].commission),
        status: order.status,
        aiReasoning: '手动交易',
        executedAt: order.transactTime
      }
    });
    
    return NextResponse.json({
      success: true,
      trade,
      order
    });
  } catch (error: any) {
    console.error('[API] 交易失败:', error);
    return NextResponse.json(
      { error: '交易失败: ' + error.message },
      { status: 500 }
    );
  }
}

