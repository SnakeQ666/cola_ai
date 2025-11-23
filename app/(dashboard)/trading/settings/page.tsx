'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Symbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

export default function TradingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [tradeInterval, setTradeInterval] = useState('5');
  const [maxTradeAmount, setMaxTradeAmount] = useState('100');
  const [maxDailyLoss, setMaxDailyLoss] = useState('50');
  const [allowedSymbols, setAllowedSymbols] = useState<string[]>([]);
  const [availableSymbols, setAvailableSymbols] = useState<Symbol[]>([]);
  const [symbolSearch, setSymbolSearch] = useState('');

  useEffect(() => {
    loadSettings();
    loadSymbols();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/trading/account');
      const data = await response.json();

      if (data.connected) {
        setAccount(data.account);
        setTradeInterval((data.account.tradeInterval || 5).toString());
        setMaxTradeAmount(data.account.maxTradeAmount.toString());
        setMaxDailyLoss(data.account.maxDailyLoss.toString());
        setAllowedSymbols(data.account.allowedSymbols || []);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSymbols = async () => {
    try {
      const response = await fetch('/api/trading/symbols');
      const data = await response.json();

      if (data.success) {
        setAvailableSymbols(data.symbols);
      }
    } catch (error) {
      console.error('加载交易对失败:', error);
    }
  };

  const handleSave = async () => {
    if (allowedSymbols.length === 0) {
      toast.error('请至少选择一个交易币种');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/trading/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeInterval: parseInt(tradeInterval),
          maxTradeAmount: parseFloat(maxTradeAmount),
          maxDailyLoss: parseFloat(maxDailyLoss),
          allowedSymbols
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('设置已保存');
        await loadSettings();
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addSymbol = (symbol: string) => {
    if (!allowedSymbols.includes(symbol)) {
      setAllowedSymbols([...allowedSymbols, symbol]);
    }
    setSymbolSearch('');
  };

  const removeSymbol = (symbol: string) => {
    setAllowedSymbols(allowedSymbols.filter(s => s !== symbol));
  };

  const filteredSymbols = availableSymbols.filter(s => 
    s.symbol.toLowerCase().includes(symbolSearch.toLowerCase()) ||
    s.baseAsset.toLowerCase().includes(symbolSearch.toLowerCase())
  ).slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              请先连接 Binance 账户
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">风控设置</h1>
        <p className="text-muted-foreground mt-1">
          配置交易限额和风险控制参数
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI 交易间隔</CardTitle>
          <CardDescription>
            设置 AI 多久分析并交易一次
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tradeInterval">交易间隔（分钟）</Label>
            <Input
              id="tradeInterval"
              type="number"
              min="1"
              max="1440"
              value={tradeInterval}
              onChange={(e) => setTradeInterval(e.target.value)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              AI 将每隔 {tradeInterval} 分钟分析一次市场并做出交易决策（1-1440 分钟）
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交易限额</CardTitle>
          <CardDescription>
            设置单笔和日总交易限额，保护资金安全
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxTradeAmount">单笔最大交易金额 (USDT)</Label>
            <Input
              id="maxTradeAmount"
              type="number"
              value={maxTradeAmount}
              onChange={(e) => setMaxTradeAmount(e.target.value)}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              单次交易的最大金额，建议不超过总资金的 10%
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDailyLoss">单日最大亏损限额 (USDT)</Label>
            <Input
              id="maxDailyLoss"
              type="number"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(e.target.value)}
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground">
              单日累计亏损达到此金额后，将停止自动交易
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交易币种白名单</CardTitle>
          <CardDescription>
            选择允许 AI 自动交易的币种（只支持 USDT 交易对）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 已选择的币种 */}
          <div className="space-y-2">
            <Label>已选择 ({allowedSymbols.length})</Label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-secondary rounded-lg">
              {allowedSymbols.length > 0 ? (
                allowedSymbols.map((symbol) => (
                  <Badge key={symbol} variant="secondary" className="pl-3 pr-1">
                    {symbol}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 ml-1"
                      onClick={() => removeSymbol(symbol)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  暂未选择任何币种
                </p>
              )}
            </div>
          </div>

          {/* 搜索和添加 */}
          <div className="space-y-2">
            <Label htmlFor="symbolSearch">搜索并添加币种</Label>
            <Input
              id="symbolSearch"
              value={symbolSearch}
              onChange={(e) => setSymbolSearch(e.target.value)}
              placeholder="输入币种名称搜索，如 BTC、ETH..."
            />
            {symbolSearch && filteredSymbols.length > 0 && (
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
                {filteredSymbols.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => addSymbol(s.symbol)}
                    disabled={allowedSymbols.includes(s.symbol)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-medium">{s.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.baseAsset} / {s.quoteAsset}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 快捷选择 */}
          <div className="space-y-2">
            <Label>快捷选择</Label>
            <div className="flex flex-wrap gap-2">
              {['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'].map((symbol) => (
                <Button
                  key={symbol}
                  variant="outline"
                  size="sm"
                  onClick={() => addSymbol(symbol)}
                  disabled={allowedSymbols.includes(symbol)}
                >
                  {symbol.replace('USDT', '')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          保存设置
        </Button>
        <Button variant="outline" onClick={loadSettings}>
          重置
        </Button>
      </div>
    </div>
  );
}

