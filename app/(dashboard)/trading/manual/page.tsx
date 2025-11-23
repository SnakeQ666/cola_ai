'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export default function ManualTradePage() {
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [quantity, setQuantity] = useState('');
  const [balance, setBalance] = useState<any>(null);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const response = await fetch('/api/trading/balance');
      const data = await response.json();
      if (data.success) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('加载余额失败:', error);
    }
  };

  const handleTrade = async (side: 'BUY' | 'SELL') => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('请输入有效的数量');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/trading/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          side,
          quantity: parseFloat(quantity)
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${side === 'BUY' ? '买入' : '卖出'}成功`);
        setQuantity('');
        await loadBalance();
      } else {
        toast.error(data.error || '交易失败');
      }
    } catch (error: any) {
      toast.error('交易失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">手动交易</h1>
        <p className="text-muted-foreground mt-1">
          手动执行交易操作
        </p>
      </div>

      {balance && (
        <Card>
          <CardHeader>
            <CardTitle>当前余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {balance.balances.slice(0, 4).map((b: any) => (
                <div key={b.asset} className="p-3 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground">{b.asset}</div>
                  <div className="text-xl font-bold">{b.free.toFixed(b.asset === 'USDT' ? 2 : 6)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>交易表单</CardTitle>
          <CardDescription>
            请谨慎操作，所有交易都会受到风控限制
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">交易对</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTCUSDT"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">数量</Label>
            <Input
              id="quantity"
              type="number"
              step="0.000001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleTrade('BUY')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <TrendingUp className="w-4 h-4 mr-2" />
              买入
            </Button>

            <Button
              onClick={() => handleTrade('SELL')}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <TrendingDown className="w-4 h-4 mr-2" />
              卖出
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

