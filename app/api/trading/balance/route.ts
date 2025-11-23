// 获取账户余额 API

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserBinanceClient, getAccountBalance } from '@/lib/binance';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET /api/trading/balance
 * 获取当前账户余额
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
    
    const { client, account } = await getUserBinanceClient(user.id);
    
    const balance = await getAccountBalance(client);
    
    // 自动记录余额快照（每次获取时）
    try {
      let totalValueUSDT = 0;
      const balances: any = {};
      
      // 获取所有币种的当前价格并计算总价值
      const prices = await client.prices();
      
      for (const b of balance.balances) {
        balances[b.asset] = b.total;
        
        if (b.total > 0) {
          if (b.asset === 'USDT') {
            // USDT 直接累加
            totalValueUSDT += b.total;
          } else {
            // 其他币种需要转换为 USDT
            const symbol = `${b.asset}USDT`;
            const price = prices[symbol];
            
            if (price) {
              const valueInUSDT = b.total * parseFloat(price);
              totalValueUSDT += valueInUSDT;
              console.log(`[Balance] ${b.asset}: ${b.total} × $${price} = $${valueInUSDT.toFixed(2)}`);
            } else {
              console.warn(`[Balance] 无法获取 ${symbol} 价格，跳过`);
            }
          }
        }
      }
      
      console.log(`[Balance] 总资产价值: $${totalValueUSDT.toFixed(2)} USDT`);
      
      await db.balanceHistory.create({
        data: {
          accountId: account.id,
          balances,
          totalValueUSDT: new Decimal(totalValueUSDT)
        }
      });
    } catch (snapshotError) {
      console.error('[API] 记录余额快照失败:', snapshotError);
      // 不影响主流程，继续返回余额
    }
    
    return NextResponse.json({
      success: true,
      balance,
      isTestnet: account.isTestnet
    });
  } catch (error: any) {
    console.error('[API] 获取余额失败:', error);
    return NextResponse.json(
      { error: error.message || '获取余额失败' },
      { status: 500 }
    );
  }
}

