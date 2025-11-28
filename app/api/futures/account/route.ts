import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserBinanceFuturesClient, setPositionMode } from '@/lib/binance-futures';

// GET - 获取合约账户配置
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const account = await db.futuresAccount.findUnique({
      where: { userId: user.id }
    });

    if (!account) {
      return NextResponse.json({ account: null });
    }

    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约账户失败' },
      { status: 500 }
    );
  }
}

// POST - 创建/启用合约账户
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查是否已有现货账户（合约使用现货的 API Key）
    const spotAccount = await db.binanceAccount.findUnique({
      where: { userId: user.id }
    });

    if (!spotAccount) {
      return NextResponse.json(
        { error: '请先连接 Binance 现货账户' },
        { status: 400 }
      );
    }

    // 创建或获取合约账户配置
    const account = await db.futuresAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        enableAutoTrade: false,
        defaultLeverage: 10,
        maxLeverage: 20,
        maxPositionSize: 1000,
        maxDailyLoss: 100,
        stopLossPercent: 5,
        takeProfitPercent: 10,
        allowedSymbols: ['BTCUSDT', 'ETHUSDT']
      },
      update: {}
    });

    // 首次启用时，设置为双向持仓模式
    try {
      const { client } = await getUserBinanceFuturesClient(user.id);
      await setPositionMode(client, true); // true = 双向持仓模式
    } catch (error: any) {
      // 如果已经是双向持仓模式，会报错，但可以忽略
      if (!error.message.includes('No need to change position side')) {
        console.warn('[API] 持仓模式设置警告:', error.message);
      }
    }

    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '创建合约账户失败' },
      { status: 500 }
    );
  }
}

// PATCH - 更新合约账户配置
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enableAutoTrade,
      tradeInterval,
      defaultLeverage,
      maxLeverage,
      maxPositionSize,
      maxDailyLoss,
      stopLossPercent,
      takeProfitPercent,
      allowedSymbols
    } = body;

    const account = await db.futuresAccount.update({
      where: { userId: user.id },
      data: {
        ...(enableAutoTrade !== undefined && { enableAutoTrade }),
        ...(tradeInterval && { tradeInterval }),
        ...(defaultLeverage && { defaultLeverage }),
        ...(maxLeverage && { maxLeverage }),
        ...(maxPositionSize && { maxPositionSize }),
        ...(maxDailyLoss && { maxDailyLoss }),
        ...(stopLossPercent && { stopLossPercent }),
        ...(takeProfitPercent && { takeProfitPercent }),
        ...(allowedSymbols && { allowedSymbols })
      }
    });

    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '更新合约账户失败' },
      { status: 500 }
    );
  }
}

