import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserBinanceFuturesClient, getFuturesExchangeInfo } from '@/lib/binance-futures';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { client } = await getUserBinanceFuturesClient(user.id);
    const exchangeInfo = await getFuturesExchangeInfo(client);

    // 筛选 USDT 永续合约
    const symbols = exchangeInfo.symbols
      .filter((s: any) => 
        s.status === 'TRADING' && 
        s.contractType === 'PERPETUAL' &&
        s.quoteAsset === 'USDT'
      )
      .map((s: any) => s.symbol)
      .sort();

    return NextResponse.json({ symbols });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约交易对失败' },
      { status: 500 }
    );
  }
}

