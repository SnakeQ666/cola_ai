// Binance 账户管理 API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { encryptApiKey, decryptApiKey } from '@/lib/crypto';
import { testBinanceConnection, getUserBinanceClient } from '@/lib/binance';

/**
 * GET /api/trading/account
 * 获取当前用户的 Binance 账户配置
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }
    
    const account = await db.binanceAccount.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        isTestnet: true,
        enableAutoTrade: true,
        tradeInterval: true,
        maxTradeAmount: true,
        maxDailyLoss: true,
        allowedSymbols: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!account) {
      return NextResponse.json(
        { connected: false },
        { status: 200 }
      );
    }
    
    return NextResponse.json({
      connected: true,
      account
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '获取账户配置失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trading/account
 * 连接 Binance 账户（添加或更新 API Key）
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { apiKey, apiSecret, isTestnet = true } = body;
    
    // 验证必填字段
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'API Key 和 Secret 不能为空' },
        { status: 400 }
      );
    }
    
    const testResult = await testBinanceConnection(apiKey, apiSecret, isTestnet);
    
    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.message },
        { status: 400 }
      );
    }
    
    // 加密 API 凭证
    const encryptedApiKey = encryptApiKey(apiKey);
    const encryptedApiSecret = encryptApiKey(apiSecret);
    
    // 保存到数据库（upsert：如果存在则更新，否则创建）
    const account = await db.binanceAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        isTestnet
      },
      update: {
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        isTestnet
      }
    });
    
    return NextResponse.json({
      success: true,
      message: '连接成功',
      account: {
        id: account.id,
        isTestnet: account.isTestnet,
        enableAutoTrade: account.enableAutoTrade,
        tradeInterval: account.tradeInterval,
      },
      testData: testResult.data
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '连接失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trading/account
 * 更新风控配置
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const {
      enableAutoTrade,
      tradeInterval,
      maxTradeAmount,
      maxDailyLoss,
      allowedSymbols
    } = body;
    
    // 验证账户是否存在
    const existingAccount = await db.binanceAccount.findUnique({
      where: { userId: user.id }
    });
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: '请先连接 Binance 账户' },
        { status: 400 }
      );
    }
    
    // 更新配置
    const account = await db.binanceAccount.update({
      where: { userId: user.id },
      data: {
        ...(enableAutoTrade !== undefined && { enableAutoTrade }),
        ...(tradeInterval !== undefined && { tradeInterval }),
        ...(maxTradeAmount !== undefined && { maxTradeAmount }),
        ...(maxDailyLoss !== undefined && { maxDailyLoss }),
        ...(allowedSymbols !== undefined && { allowedSymbols })
      }
    });
    
    return NextResponse.json({
      success: true,
      message: '配置已更新',
      account: {
        enableAutoTrade: account.enableAutoTrade,
        tradeInterval: account.tradeInterval,
        maxTradeAmount: account.maxTradeAmount,
        maxDailyLoss: account.maxDailyLoss,
        allowedSymbols: account.allowedSymbols
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '更新配置失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trading/account
 * 断开 Binance 账户
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }
    
    // 删除账户配置（级联删除所有相关数据）
    await db.binanceAccount.delete({
      where: { userId: user.id }
    });
    
    return NextResponse.json({
      success: true,
      message: '账户已断开'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: '断开账户失败' },
      { status: 500 }
    );
  }
}

