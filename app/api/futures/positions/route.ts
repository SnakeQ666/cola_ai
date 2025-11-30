import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserBinanceFuturesClient, getFuturesPositions } from '@/lib/binance-futures';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const futuresAccount = await db.futuresAccount.findUnique({
      where: { userId: user.id }
    });

    if (!futuresAccount) {
      return NextResponse.json({ positions: [] });
    }

    // 获取实时持仓（以 Binance 为准，这是真实数据源）
    const { client } = await getUserBinanceFuturesClient(user.id);
    const livePositions = await getFuturesPositions(client); 
    // 获取数据库中的持仓记录（用于补充元数据）
    const dbPositions = await db.futuresPosition.findMany({
      where: {
        accountId: futuresAccount.id,
        status: 'OPEN'
      },
      include: {
        aiDecision: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 同步数据库状态：如果数据库有 OPEN 状态但 Binance 没有的持仓，应该关闭数据库记录
    const livePositionKeys = new Set(
      livePositions.map((lp: any) => {
        const side = parseFloat(lp.positionAmt) > 0 ? 'LONG' : 'SHORT';
        return `${lp.symbol}_${side}`;
      })
    );

    // 找出数据库中有但 Binance 没有的持仓（可能被手动平仓了）
    const positionsToClose = dbPositions.filter(dbPos => {
      const key = `${dbPos.symbol}_${dbPos.side}`;
      return !livePositionKeys.has(key);
    });

    // 异步关闭这些持仓记录（不阻塞响应）
    if (positionsToClose.length > 0) {
      Promise.all(
        positionsToClose.map(pos =>
          db.futuresPosition.update({
            where: { id: pos.id },
            data: {
              status: 'CLOSED',
              closedAt: new Date()
            }
          })
        )
      ).catch(err => {
        console.error('[Futures Positions] 同步数据库状态失败:', err);
      });
    }

    // 合并实时数据和数据库记录（以 Binance 实时持仓为准）
    const positions = livePositions.map((lp: any) => {
      const lpSide = parseFloat(lp.positionAmt) > 0 ? 'LONG' : 'SHORT';
      
      // 正确匹配：symbol + side
      const dbPos = dbPositions.find(
        p => p.symbol === lp.symbol && p.side === lpSide
      );
      
      // 计算保证金和 ROE
      // 在全仓模式下，isolatedMargin 为 0，需要使用 notional 和 leverage 计算
      const isolatedMargin = parseFloat(lp.isolatedMargin || '0');
      const notional = Math.abs(parseFloat(lp.notional || '0')); // 名义价值（取绝对值）
      const leverage = parseInt(lp.leverage || '1');
      const unrealizedPnl = parseFloat(lp.unRealizedProfit || '0');
      
      // 计算保证金：
      // 1. 如果是逐仓模式，使用 isolatedMargin
      // 2. 如果是全仓模式，使用 notional / leverage
      // 3. 如果都没有，尝试使用数据库的保证金
      let margin = 0;
      if (isolatedMargin > 0) {
        // 逐仓模式
        margin = isolatedMargin;
      } else if (notional > 0 && leverage > 0) {
        // 全仓模式：保证金 = 名义价值 / 杠杆倍数
        margin = notional / leverage;
      } else if (dbPos && parseFloat(dbPos.margin.toString()) > 0) {
        // 回退到数据库的保证金
        margin = parseFloat(dbPos.margin.toString());
      }
      
      // 计算 ROE（回报率）= (未实现盈亏 / 保证金) * 100
      const roe = margin > 0 ? (unrealizedPnl / margin) * 100 : 0;
      
      return {
        symbol: lp.symbol,
        side: lpSide,
        quantity: Math.abs(parseFloat(lp.positionAmt)),
        entryPrice: parseFloat(lp.entryPrice),
        markPrice: parseFloat(lp.markPrice),
        leverage: parseInt(lp.leverage),
        unrealizedPnl,
        liquidationPrice: parseFloat(lp.liquidationPrice),
        margin,
        roe,
        // 从数据库补充的元数据
        aiDecision: dbPos?.aiDecision,
        createdAt: dbPos?.createdAt,
        // 标记是否是 AI 管理的持仓
        isAIManaged: !!dbPos
      };
    });

    return NextResponse.json({ positions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取合约持仓失败' },
      { status: 500 }
    );
  }
}

