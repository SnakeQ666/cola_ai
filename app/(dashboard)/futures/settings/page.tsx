'use client';

import { useEffect, useState } from 'react';
import { Shield, Save, Loader2, AlertCircle, Search, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function FuturesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);

  // 表单状态
  const [tradeInterval, setTradeInterval] = useState(5);
  const [defaultLeverage, setDefaultLeverage] = useState(10);
  const [maxLeverage, setMaxLeverage] = useState(20);
  const [maxPositionSize, setMaxPositionSize] = useState(1000);
  const [maxDailyLoss, setMaxDailyLoss] = useState(500);
  const [allowedSymbols, setAllowedSymbols] = useState<string[]>([]);

  useEffect(() => {
    loadAccount();
    loadAvailableSymbols();
  }, []);

  const loadAccount = async () => {
    try {
      const res = await fetch('/api/futures/account');
      const data = await res.json();
      
      if (data.account) {
        setAccount(data.account);
        setTradeInterval(data.account.tradeInterval || 5);
        setDefaultLeverage(data.account.defaultLeverage || 10);
        setMaxLeverage(data.account.maxLeverage || 20);
        setMaxPositionSize(parseFloat(data.account.maxPositionSize) || 1000);
        setMaxDailyLoss(parseFloat(data.account.maxDailyLoss) || 500);
        setAllowedSymbols(data.account.allowedSymbols || []);
      }
    } catch (error) {
      console.error('加载账户失败:', error);
      toast.error('加载账户失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSymbols = async () => {
    try {
      const res = await fetch('/api/futures/symbols');
      const data = await res.json();
      
      if (data.symbols) {
        setAvailableSymbols(data.symbols);
      }
    } catch (error) {
      console.error('加载交易对失败:', error);
    }
  };

  const handleSave = async () => {
    // 验证
    if (tradeInterval < 1 || tradeInterval > 1440) {
      toast.error('交易间隔必须在 1-1440 分钟之间');
      return;
    }

    if (defaultLeverage < 1 || defaultLeverage > 125) {
      toast.error('默认杠杆必须在 1-125 之间');
      return;
    }

    if (maxLeverage < defaultLeverage || maxLeverage > 125) {
      toast.error('最大杠杆必须 >= 默认杠杆且 <= 125');
      return;
    }

    if (maxPositionSize <= 0) {
      toast.error('单仓最大金额必须大于 0');
      return;
    }

    if (maxDailyLoss <= 0) {
      toast.error('日亏损限额必须大于 0');
      return;
    }

    if (allowedSymbols.length === 0) {
      toast.error('请至少选择一个交易对');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/futures/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeInterval,
          defaultLeverage,
          maxLeverage,
          maxPositionSize,
          maxDailyLoss,
          allowedSymbols
        })
      });

      const data = await res.json();

      if (res.ok) {
        setAccount(data.account);
        toast.success('风控设置已保存');
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleSymbol = (symbol: string) => {
    if (allowedSymbols.includes(symbol)) {
      setAllowedSymbols(allowedSymbols.filter(s => s !== symbol));
    } else {
      setAllowedSymbols([...allowedSymbols, symbol]);
    }
  };

  const filteredSymbols = availableSymbols.filter(symbol =>
    symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-purple-500" />
          合约风控设置
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>未启用合约交易</CardTitle>
            <CardDescription>请先在合约交易页面启用合约交易功能</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-500" />
            合约风控设置
          </h1>
          <p className="text-muted-foreground mt-2">
            配置 AI 合约交易的风险控制参数
          </p>
        </div>
      </div>

      {/* 风险提示 */}
      <Card className="border-yellow-500/50 bg-yellow-500/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">重要提示</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• 合约交易具有高风险，请根据自身风险承受能力设置合理的参数</p>
          <p>• 高杠杆会放大收益，同时也会放大亏损，建议新手使用低杠杆（2-5x）</p>
          <p>• 设置止损限额可以有效控制单日最大亏损</p>
          <p>• AI 会在达到风控限制时自动停止交易</p>
        </CardContent>
      </Card>

      {/* AI 交易间隔 */}
      <Card>
        <CardHeader>
          <CardTitle>AI 交易间隔</CardTitle>
          <CardDescription>设置 AI 多久分析并交易一次</CardDescription>
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
              onChange={(e) => setTradeInterval(parseInt(e.target.value) || 1)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              AI 将每隔 {tradeInterval} 分钟分析一次市场并做出交易决策（1-1440 分钟）
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">当前设置：</span>
              AI 将每隔 <Badge variant="default">{tradeInterval} 分钟</Badge> 执行一次分析
              {tradeInterval < 5 && (
                <span className="text-yellow-600 dark:text-yellow-500 ml-2">
                  ⚠️ 间隔过短可能导致频繁交易
                </span>
              )}
              {tradeInterval >= 60 && (
                <span className="text-blue-600 dark:text-blue-500 ml-2">
                  ℹ️ 约 {Math.floor(tradeInterval / 60)} 小时 {tradeInterval % 60} 分钟
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 杠杆设置 */}
      <Card>
        <CardHeader>
          <CardTitle>杠杆设置</CardTitle>
          <CardDescription>配置合约交易的杠杆倍数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="defaultLeverage">默认杠杆倍数</Label>
              <Input
                id="defaultLeverage"
                type="number"
                min="1"
                max="125"
                value={defaultLeverage}
                onChange={(e) => setDefaultLeverage(parseInt(e.target.value) || 1)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                AI 开仓时默认使用的杠杆倍数（1-125x）
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxLeverage">最大杠杆倍数</Label>
              <Input
                id="maxLeverage"
                type="number"
                min="1"
                max="125"
                value={maxLeverage}
                onChange={(e) => setMaxLeverage(parseInt(e.target.value) || 1)}
                placeholder="20"
              />
              <p className="text-xs text-muted-foreground">
                AI 可以使用的最大杠杆倍数（1-125x）
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">当前设置：</span>
              AI 将默认使用 <Badge variant="default">{defaultLeverage}x</Badge> 杠杆开仓，
              最高可使用 <Badge variant="destructive">{maxLeverage}x</Badge> 杠杆
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 资金管理 */}
      <Card>
        <CardHeader>
          <CardTitle>资金管理</CardTitle>
          <CardDescription>配置单笔交易和每日亏损限额</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxPositionSize">单仓最大金额 (USDT)</Label>
              <Input
                id="maxPositionSize"
                type="number"
                min="1"
                step="100"
                value={maxPositionSize}
                onChange={(e) => setMaxPositionSize(parseFloat(e.target.value) || 0)}
                placeholder="1000"
              />
              <p className="text-xs text-muted-foreground">
                单个仓位最大保证金金额
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDailyLoss">日亏损限额 (USDT)</Label>
              <Input
                id="maxDailyLoss"
                type="number"
                min="1"
                step="50"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value) || 0)}
                placeholder="500"
              />
              <p className="text-xs text-muted-foreground">
                达到此亏损额度后，当日将停止交易
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">当前设置：</span>
              单仓最大 <Badge variant="default">${maxPositionSize}</Badge> 保证金，
              日亏损限额 <Badge variant="destructive">${maxDailyLoss}</Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 允许交易的币种 */}
      <Card>
        <CardHeader>
          <CardTitle>允许交易的币种</CardTitle>
          <CardDescription>
            选择 AI 可以交易的合约交易对（已选择 {allowedSymbols.length} 个）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 已选择的币种 */}
          {allowedSymbols.length > 0 && (
            <div className="space-y-2">
              <Label>已选择的交易对</Label>
              <div className="flex flex-wrap gap-2">
                {allowedSymbols.map(symbol => (
                  <Badge
                    key={symbol}
                    variant="default"
                    className="cursor-pointer hover:bg-destructive"
                    onClick={() => toggleSymbol(symbol)}
                  >
                    {symbol}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 添加币种按钮 */}
          <Button
            variant="outline"
            onClick={() => setShowSymbolSelector(!showSymbolSelector)}
            className="w-full"
          >
            <Search className="mr-2 h-4 w-4" />
            {showSymbolSelector ? '隐藏交易对选择器' : '添加交易对'}
          </Button>

          {/* 币种选择器 */}
          {showSymbolSelector && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索交易对 (例如: BTCUSDT)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredSymbols.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? '未找到匹配的交易对' : '加载中...'}
                  </p>
                ) : (
                  filteredSymbols.map(symbol => (
                    <div
                      key={symbol}
                      onClick={() => toggleSymbol(symbol)}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        allowedSymbols.includes(symbol)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{symbol}</span>
                        {allowedSymbols.includes(symbol) && (
                          <Badge variant="secondary">已选择</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {allowedSymbols.length === 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                ⚠️ 请至少选择一个交易对，否则 AI 无法进行交易
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || allowedSymbols.length === 0}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

