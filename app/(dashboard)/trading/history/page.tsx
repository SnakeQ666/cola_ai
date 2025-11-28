'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

export default function TradeHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    try {
      const response = await fetch('/api/trading/trades');
      const data = await response.json();

      if (data.success) {
        setTrades(data.trades);
      }
    } catch (error) {
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
      <div>
        <h1 className="text-3xl font-bold">交易历史</h1>
        <p className="text-muted-foreground mt-1">
          所有交易记录（最近 50 条）
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
          <CardDescription>
            包含手动交易和 AI 自动交易
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length > 0 ? (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 bg-secondary rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {trade.side === 'BUY' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{trade.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {trade.side} · {parseFloat(trade.quantity.toString()).toFixed(6)} @ $
                        {parseFloat(trade.price.toString()).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      ${parseFloat(trade.quoteQty.toString()).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(trade.executedAt).toLocaleString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {trade.aiReasoning === '手动交易' && (
                      <Badge variant="outline" className="mt-1">手动</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无交易记录
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

