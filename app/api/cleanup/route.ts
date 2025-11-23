import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * 数据清理 API
 * 定期清理旧的历史数据，防止数据库无限增长
 * 
 * 建议通过 cron job 每天调用一次
 * 例如：curl -X POST http://localhost:3000/api/cleanup?secret=YOUR_CLEANUP_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // 验证密钥
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CLEANUP_SECRET) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const results = {
      balanceHistory: 0,
      futuresBalanceHistory: 0,
      aiDecisions: 0,
      futuresAIDecisions: 0
    };

    // 保留最近 30 天的余额历史
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 清理现货余额历史
    const deletedBalanceHistory = await db.balanceHistory.deleteMany({
      where: {
        snapshotAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    results.balanceHistory = deletedBalanceHistory.count;

    // 清理合约余额历史
    const deletedFuturesBalanceHistory = await db.futuresBalanceHistory.deleteMany({
      where: {
        snapshotAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    results.futuresBalanceHistory = deletedFuturesBalanceHistory.count;

    // 保留最近 100 条 AI 决策记录（每个账户）
    // 注意：不删除关联的 Trade 记录，因为需要完整的交易历史来计算组合价值
    const binanceAccounts = await db.binanceAccount.findMany({
      select: { id: true }
    });

    for (const account of binanceAccounts) {
      // 获取该账户最近 100 条决策的 ID
      const recentDecisions = await db.aIDecision.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true }
      });

      const recentIds = recentDecisions.map(d => d.id);

      // 删除旧决策（但保留关联的 Trade 记录）
      if (recentIds.length > 0) {
        // 先将旧决策的 Trade 记录的 aiDecisionId 设置为 null
        await db.trade.updateMany({
          where: {
            accountId: account.id,
            aiDecisionId: { notIn: recentIds }
          },
          data: {
            aiDecisionId: null
          }
        });

        // 然后删除旧决策
        const deleted = await db.aIDecision.deleteMany({
          where: {
            accountId: account.id,
            id: { notIn: recentIds }
          }
        });
        results.aiDecisions += deleted.count;
      }
    }

    // 保留最近 100 条合约 AI 决策记录（每个账户）
    // 注意：不删除关联的 Order 记录，保留完整的交易历史
    const futuresAccounts = await db.futuresAccount.findMany({
      select: { id: true }
    });

    for (const account of futuresAccounts) {
      const recentDecisions = await db.futuresAIDecision.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true }
      });

      const recentIds = recentDecisions.map(d => d.id);

      if (recentIds.length > 0) {
        // 先将旧决策的 Order 记录的 aiDecisionId 设置为 null
        await db.futuresOrder.updateMany({
          where: {
            accountId: account.id,
            aiDecisionId: { notIn: recentIds }
          },
          data: {
            aiDecisionId: null
          }
        });

        // 然后删除旧决策
        const deleted = await db.futuresAIDecision.deleteMany({
          where: {
            accountId: account.id,
            id: { notIn: recentIds }
          }
        });
        results.futuresAIDecisions += deleted.count;
      }
    }

    console.log('[Cleanup] 数据清理完成:', results);

    return NextResponse.json({
      success: true,
      message: '数据清理完成',
      results
    });
  } catch (error: any) {
    console.error('[Cleanup] 数据清理失败:', error);
    return NextResponse.json(
      { error: '数据清理失败: ' + error.message },
      { status: 500 }
    );
  }
}

