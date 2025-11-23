'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function TradingMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const [decisionsRes, tradesRes, balanceRes] = await Promise.all([
        fetch('/api/trading/decisions'),
        fetch('/api/trading/trades'),
        fetch('/api/trading/balance')
      ]);

      const [decisions, trades, balance] = await Promise.all([
        decisionsRes.json(),
        tradesRes.json(),
        balanceRes.json()
      ]);

      if (decisions.success && trades.success) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTrades = trades.trades.filter((t: any) => 
          new Date(t.executedAt) >= today
        );

        const todayProfit = todayTrades.reduce((sum: number, t: any) => {
          const pnl = t.realizedPnl ? parseFloat(t.realizedPnl.toString()) : 0;
          return sum + pnl;
        }, 0);

        const buyCount = todayTrades.filter((t: any) => t.side === 'BUY').length;
        const sellCount = todayTrades.filter((t: any) => t.side === 'SELL').length;

        setStats({
          totalDecisions: decisions.decisions.length,
          totalTrades: trades.trades.length,
          todayTrades: todayTrades.length,
          todayProfit,
          buyCount,
          sellCount,
          balance: balance.success ? balance.balance : null
        });
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">实时监控</h1>
          <p className="text-muted-foreground mt-1">
            交易统计和实时数据监控（每30秒刷新）
          </p>
        </div>
        <Badge variant="outline" className="animate-pulse">
          实时
        </Badge>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">今日交易</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayTrades}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  买入 {stats.buyCount} · 卖出 {stats.sellCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">今日盈亏</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  stats.todayProfit > 0 ? 'text-green-600' : 
                  stats.todayProfit < 0 ? 'text-red-600' : ''
                }`}>
                  ${stats.todayProfit.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.todayProfit >= 0 ? '盈利' : '亏损'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">总决策</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDecisions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI 分析次数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">总交易</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTrades}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  历史交易数
                </p>
              </CardContent>
            </Card>
          </div>

          {stats.balance && (
            <Card>
              <CardHeader>
                <CardTitle>账户状态</CardTitle>
                <CardDescription>当前余额和持仓</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.balance.balances.slice(0, 8).map((b: any) => (
                    <div key={b.asset} className="p-3 bg-secondary rounded-lg">
                      <div className="text-sm text-muted-foreground">{b.asset}</div>
                      <div className="text-xl font-bold">
                        {b.total.toFixed(b.asset === 'USDT' ? 2 : 6)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                风控提醒
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Math.abs(stats.todayProfit) > 40 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="text-sm text-amber-900 dark:text-amber-100">
                      今日盈亏已接近限额，请注意风险控制
                    </div>
                  </div>
                )}
                {stats.todayTrades > 10 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="text-sm text-amber-900 dark:text-amber-100">
                      今日交易频率较高，建议降低交易频次
                    </div>
                  </div>
                )}
                {stats.todayTrades === 0 && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      今日暂无交易，系统运行正常
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

