import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserBinanceClient } from '@/lib/binance';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const { client } = await getUserBinanceClient(user.id);
    
    const exchangeInfo = await client.exchangeInfo();
    
    const usdtPairs = exchangeInfo.symbols
      .filter((s: any) => 
        s.symbol.endsWith('USDT') && 
        s.status === 'TRADING' &&
        s.isSpotTradingAllowed
      )
      .map((s: any) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset
      }))
      .sort((a: any, b: any) => a.symbol.localeCompare(b.symbol));
    
    return NextResponse.json({
      success: true,
      symbols: usdtPairs
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '获取交易对失败: ' + error.message },
      { status: 500 }
    );
  }
}

