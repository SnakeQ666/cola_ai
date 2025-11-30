'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, AlertTriangle, CheckCircle2, Settings, Activity, TrendingUp, History,Shield, Rocket, ChevronDown, ChevronUp,ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BinanceAccount {
  id: string;
  isTestnet: boolean;
  enableAutoTrade: boolean;
  maxTradeAmount: number;
  maxDailyLoss: number;
  allowedSymbols: string[];
}

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export default function TradingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<BinanceAccount | null>(null);
  const [balance, setBalance] = useState<Balance[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [latestDecision, setLatestDecision] = useState<any>(null);
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [aiPortfolio, setAiPortfolio] = useState<any[]>([]); // AI 管理的资产组合
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);
  
  // 连接表单
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestnet, setIsTestnet] = useState(true);

  // 加载账户信息
  useEffect(() => {
    loadAccount();
  }, []);

  // 加载余额和决策历史
  useEffect(() => {
    if (connected && account) {
      loadBalance();
      loadDecisions();
      loadBalanceHistory();
      loadAiPortfolio();
      
      const balanceInterval = setInterval(loadBalance, 30000);
      const historyInterval = setInterval(loadBalanceHistory, 60000); // 每分钟刷新历史
      const portfolioInterval = setInterval(loadAiPortfolio, 60000); // 每分钟刷新 AI 组合
      
      // 如果开启了自动交易，按用户配置的间隔自动分析
      let analysisInterval: NodeJS.Timeout | null = null;
      if (account.enableAutoTrade) {
        const intervalMinutes = (account as any).tradeInterval || 5;
        const intervalMs = intervalMinutes * 60 * 1000;
        analysisInterval = setInterval(() => {
          handleAnalyze();
        }, intervalMs);
      }
      
      return () => {
        clearInterval(balanceInterval);
        clearInterval(historyInterval);
        clearInterval(portfolioInterval);
        if (analysisInterval) clearInterval(analysisInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, account]);

  const loadAccount = async () => {
    try {
      const response = await fetch('/api/trading/account');
      const data = await response.json();
      
      if (data.connected) {
        setConnected(true);
        setAccount(data.account);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await fetch('/api/trading/balance');
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.balance.balances);
      }
    } catch (error) {
    }
  };

  const loadDecisions = async () => {
    try {
      const response = await fetch('/api/trading/decisions');
      const data = await response.json();
      
      if (data.success) {
        setDecisions(data.decisions || []);
        if (data.decisions && data.decisions.length > 0) {
          setLatestDecision(data.decisions[0]);
        }
      } else {
      }
    } catch (error) {
    }
  };

  const loadBalanceHistory = async () => {
    try {
      const response = await fetch('/api/trading/balance-history?days=7');
      const data = await response.json();
      
      if (data.success) {
        setBalanceHistory(data.history || []);
      }
    } catch (error) {
    }
  };

  const loadAiPortfolio = async () => {
    try {
      const response = await fetch('/api/trading/portfolio?days=7');
      const data = await response.json();
      
      if (data.success) {
        setAiPortfolio(data.portfolio || []);
      }
    } catch (error) {
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    
    try {
      const response = await fetch('/api/trading/analyze', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 显示执行结果
        if (data.executed && data.trade) {
          const side = data.trade.side === 'BUY' ? '买入' : '卖出';
          const price = parseFloat(data.trade.price).toFixed(2);
          const total = parseFloat(data.trade.total).toFixed(2);
          toast.success(
            `✅ ${side}成功: ${data.trade.quantity} ${data.trade.symbol.replace('USDT', '')} @ $${price} = $${total}`,
            { duration: 5000 }
          );
        } else if (data.reason) {
          if (data.reason.includes('信心指数过低')) {
            toast.warning(data.reason);
          } else if (data.reason.includes('失败')) {
            toast.error(data.reason, { duration: 5000 });
          } else {
            toast.info(data.reason);
          }
        } else {
          toast.success('AI 分析完成');
        }
        
        setLatestDecision({
          ...data.decision,
          reasoning: data.reasoning,
          createdAt: new Date(),
          executed: data.executed
        });
        await loadDecisions();
        if (data.executed) {
          await loadBalance(); // 只有执行了交易才刷新余额
        }
      } else {
        toast.error(data.error || 'AI 分析失败', { duration: 5000 });
      }
    } catch (error: any) {
      toast.error('AI 分析失败: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !apiSecret) {
      toast.error('请填写完整的 API Key 和 Secret');
      return;
    }
    
    setConnecting(true);
    
    try {
      const response = await fetch('/api/trading/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          isTestnet
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('连接成功！');
        setConnected(true);
        setShowConnectForm(false);
        setApiKey('');
        setApiSecret('');
        await loadAccount();
      } else {
        toast.error(data.error || '连接失败');
      }
    } catch (error: any) {
      toast.error('连接失败: ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('确定要断开连接吗？这将删除所有账户配置。')) {
      return;
    }
    
    try {
      const response = await fetch('/api/trading/account', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('已断开连接');
        setConnected(false);
        setAccount(null);
        setBalance([]);
      }
    } catch (error) {
      toast.error('断开连接失败');
    }
  };

  const toggleAutoTrade = async () => {
    if (!account) return;
    
    const newState = !account.enableAutoTrade;
    
    try {
      const response = await fetch('/api/trading/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableAutoTrade: newState
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(newState ? '已启动自动交易' : '已停止自动交易');
        setAccount({ ...account, enableAutoTrade: newState });
        
        // 开启自动交易后立即执行一次分析
        if (newState) {
          toast.info('正在执行首次 AI 分析...');
          setTimeout(() => handleAnalyze(), 1000);
        }
      }
    } catch (error) {
      toast.error('操作失败');
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
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI 加密货币交易</h1>
          <p className="text-muted-foreground mt-1">
            连接 Binance 账户，让 AI 自动分析市场并执行交易
          </p>
        </div>
        
        {connected && account && (
          <Badge variant={account.isTestnet ? "secondary" : "destructive"}>
            {account.isTestnet ? '测试网' : '主网'}
          </Badge>
        )}
      </div>

      {/* 未连接状态 */}
      {!connected && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              连接 Binance 账户
            </CardTitle>
            <CardDescription>
              开始之前，请先连接您的 Binance 账户。建议先使用测试网验证功能。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showConnectForm ? (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="flex-1 space-y-2 text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        重要提示
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                        <li>强烈建议先使用 Binance 测试网进行验证</li>
                        <li>API Key 仅需要 &quot;读取&quot; 和 &quot;现货交易&quot; 权限</li>
                        <li>请勿授予 &quot;提币&quot; 权限</li>
                        <li>建议限制 IP 白名单</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button onClick={() => setShowConnectForm(true)}>
                    开始连接
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://testnet.binance.vision', '_blank')}
                  >
                    获取测试网 API Key
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="输入您的 Binance API Key"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="输入您的 Binance API Secret"
                    required
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="testnet">使用测试网</Label>
                    <p className="text-xs text-muted-foreground">
                      推荐先在测试网环境验证功能
                    </p>
                  </div>
                  <Switch
                    id="testnet"
                    checked={isTestnet}
                    onCheckedChange={setIsTestnet}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button type="submit" disabled={connecting}>
                    {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    连接
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowConnectForm(false);
                      setApiKey('');
                      setApiSecret('');
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* 已连接状态 */}
      {connected && account && (
        <>
          {/* 账户状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                账户已连接
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 自动交易开关 */}
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">自动交易</div>
                  <p className="text-sm text-muted-foreground">
                    启用后，AI 将自动分析市场并执行交易
                  </p>
                </div>
                <Switch
                  checked={account.enableAutoTrade}
                  onCheckedChange={toggleAutoTrade}
                />
              </div>
              
              {/* 风控配置 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground">单笔最大金额</div>
                  <div className="text-2xl font-bold mt-1">
                    ${account.maxTradeAmount.toString()}
                  </div>
                </div>
                
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground">单日最大亏损</div>
                  <div className="text-2xl font-bold mt-1">
                    ${account.maxDailyLoss.toString()}
                  </div>
                </div>
                
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground">允许交易币种</div>
                  <div className="text-sm font-medium mt-1">
                    {account.allowedSymbols.join(', ')}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push('/trading/manual')}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  手动交易
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/trading/history')}>
                  <History className="w-4 h-4 mr-2" />
                  交易历史
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/trading/monitor')}>
                  <Activity className="w-4 h-4 mr-2" />
                  实时监控
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/trading/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  风控设置
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect} className="w-full mt-2">
                断开连接
              </Button>
            </CardContent>
          </Card>

          {/* 账户余额 */}
          <Card>
            <CardHeader>
              <CardTitle>账户余额</CardTitle>
              <CardDescription>
                当前账户的资产分布（每30秒自动刷新）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balance.length > 0 ? (
                <>
                  {/* 总资产价值展示 */}
                  {balanceHistory.length > 0 && (
                    <div className="mb-4 p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                      <div className="text-sm text-muted-foreground mb-1">总资产价值（USDT 计价）</div>
                      <div className="text-3xl font-bold">
                        ${balanceHistory[balanceHistory.length - 1]?.totalValueUSDT.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        包含所有币种按当前市场价换算
                      </div>
                    </div>
                  )}
                  
                  <div className="max-h-64 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {balance.map((b) => (
                        <div key={b.asset} className="p-4 bg-secondary rounded-lg">
                          <div className="text-sm text-muted-foreground">{b.asset}</div>
                          <div className="text-2xl font-bold mt-1">
                            {b.total.toFixed(b.asset === 'USDT' ? 2 : 6)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            可用: {b.free.toFixed(b.asset === 'USDT' ? 2 : 6)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无余额数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI 资产组合变化趋势图 */}
          {aiPortfolio.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  AI 资产组合表现
                </CardTitle>
                <CardDescription>
                  最近 7 天 AI 管理的资产总价值变化（只包含 AI 买入/卖出的币种，以 USDT 计价）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={aiPortfolio}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                        }}
                      />
                      <YAxis 
                        label={{ value: 'USDT', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString('zh-CN')}
                        formatter={(value: any) => [`$${value.toFixed(2)}`, 'AI 组合价值']}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="text-sm font-medium mb-2">
                                  {new Date(data.timestamp).toLocaleString('zh-CN')}
                                </p>
                                <p className="text-lg font-bold text-primary mb-2">
                                  ${data.totalValueUSDT.toFixed(2)}
                                </p>
                                {data.trade && (
                                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                                    <p className={data.trade.side === 'BUY' ? 'text-green-600' : 'text-red-600'}>
                                      {data.trade.side} {data.trade.quantity.toFixed(6)} {data.trade.symbol.replace('USDT', '')}
                                    </p>
                                    <p>金额: ${data.trade.quoteQty.toFixed(2)}</p>
                                  </div>
                                )}
                                {data.holdings && Object.keys(data.holdings).length > 0 && (
                                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                                    <p className="font-medium mb-1">持仓:</p>
                                    {Object.entries(data.holdings).map(([asset, amount]: [string, any]) => (
                                      amount > 0 && (
                                        <p key={asset}>{asset}: {amount.toFixed(6)}</p>
                                      )
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalValueUSDT" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#10b981' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 当前 AI 持仓和盈亏信息 */}
                {aiPortfolio.length > 0 && aiPortfolio[aiPortfolio.length - 1] && (
                  <div className="mt-4 space-y-3">
                    {/* 盈亏统计 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-secondary rounded-lg">
                        <div className="text-xs text-muted-foreground">初始投入</div>
                        <div className="text-lg font-bold mt-1">
                          ${aiPortfolio[aiPortfolio.length - 1].initialInvestment.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-secondary rounded-lg">
                        <div className="text-xs text-muted-foreground">当前价值</div>
                        <div className="text-lg font-bold mt-1">
                          ${aiPortfolio[aiPortfolio.length - 1].totalValueUSDT.toFixed(2)}
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        aiPortfolio[aiPortfolio.length - 1].pnl >= 0 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <div className="text-xs text-muted-foreground">盈亏</div>
                        <div className={`text-lg font-bold mt-1 ${
                          aiPortfolio[aiPortfolio.length - 1].pnl >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {aiPortfolio[aiPortfolio.length - 1].pnl >= 0 ? '+' : ''}
                          ${aiPortfolio[aiPortfolio.length - 1].pnl.toFixed(2)}
                          {' '}
                          ({aiPortfolio[aiPortfolio.length - 1].pnl >= 0 ? '+' : ''}
                          {aiPortfolio[aiPortfolio.length - 1].pnlPercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    
                    {/* 持仓明细 */}
                    <div className="p-4 bg-secondary rounded-lg">
                      <div className="text-sm font-medium mb-2">当前 AI 持仓</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(aiPortfolio[aiPortfolio.length - 1].holdings).map(([asset, amount]: [string, any]) => (
                          amount > 0 && (
                            <div key={asset} className="text-sm">
                              <span className="text-muted-foreground">{asset}:</span>
                              <span className="ml-2 font-medium">{amount.toFixed(6)}</span>
                            </div>
                          )
                        ))}
                        <div className="text-sm">
                          <span className="text-muted-foreground">USDT:</span>
                          <span className="ml-2 font-medium">
                            ${aiPortfolio[aiPortfolio.length - 1].usdtBalance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI 分析面板 */}
          <Card>
            <CardHeader>
              <CardTitle>AI 市场分析</CardTitle>
              <CardDescription>
                {account.enableAutoTrade 
                  ? 'AI 每分钟自动分析市场并给出交易建议' 
                  : '开启自动交易后，AI 将每分钟自动分析市场'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestDecision ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-secondary rounded-lg">
                      <div className="text-sm text-muted-foreground">交易建议</div>
                      <div className={`text-2xl font-bold mt-1 ${
                        latestDecision.action === 'BUY' ? 'text-green-600' :
                        latestDecision.action === 'SELL' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {latestDecision.action === 'BUY' ? '买入' :
                         latestDecision.action === 'SELL' ? '卖出' : '持有'}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-secondary rounded-lg">
                      <div className="text-sm text-muted-foreground">建议金额</div>
                      <div className="text-2xl font-bold mt-1">
                        ${latestDecision.tradeAmount ? latestDecision.tradeAmount.toFixed(2) : '0.00'}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-secondary rounded-lg">
                      <div className="text-sm text-muted-foreground">信心指数</div>
                      <div className="text-2xl font-bold mt-1">
                        {(latestDecision.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-4 bg-secondary rounded-lg">
                      <div className="text-sm text-muted-foreground">风险等级</div>
                      <div className={`text-2xl font-bold mt-1 ${
                        latestDecision.riskLevel === 'LOW' ? 'text-green-600' :
                        latestDecision.riskLevel === 'HIGH' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {latestDecision.riskLevel}
                      </div>
                    </div>
                  </div>
                  
                  {latestDecision.reasoning && (
                    <div className="p-4 bg-secondary rounded-lg">
                      <div className="text-sm font-medium mb-2">分析过程</div>
                      <div className="text-sm whitespace-pre-wrap">
                        {latestDecision.reasoning}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    分析时间: {new Date(latestDecision.createdAt).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  点击 &quot;立即分析&quot; 开始 AI 市场分析
                </div>
              )}
            </CardContent>
          </Card>

          {/* 决策历史 */}
          {decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>决策历史</CardTitle>
                <CardDescription>最近 10 条 AI 决策记录（点击展开详情）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {decisions.slice(0, 10).map((decision) => (
                    <div 
                      key={decision.id}
                      className="border rounded-lg overflow-hidden transition-all hover:shadow-md"
                    >
                      {/* 决策概览 - 可点击 */}
                      <div 
                        className="flex items-center justify-between p-3 bg-secondary cursor-pointer hover:bg-secondary/80"
                        onClick={() => setExpandedDecisionId(
                          expandedDecisionId === decision.id ? null : decision.id
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-2 h-2 rounded-full ${
                            decision.action === 'BUY' ? 'bg-green-600' :
                            decision.action === 'SELL' ? 'bg-red-600' :
                            'bg-gray-600'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{decision.symbol}</span>
                              <span className={`text-sm font-semibold ${
                                decision.action === 'BUY' ? 'text-green-600' :
                                decision.action === 'SELL' ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {decision.action === 'BUY' ? '买入' :
                                 decision.action === 'SELL' ? '卖出' : '持有'}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              信心 {(parseFloat(decision.confidence.toString()) * 100).toFixed(0)}% · {decision.riskLevel}
                              {decision.executed && <span className="ml-2 text-green-600">✓ 已执行</span>}
                              {decision.outcome === 'CANCELLED' && <span className="ml-2 text-yellow-600">⊗ 已取消</span>}
                              {decision.outcome === 'FAILED' && <span className="ml-2 text-red-600">✗ 失败</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              {new Date(decision.createdAt).toLocaleString('zh-CN', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            {expandedDecisionId === decision.id ? '▲' : '▼'}
                          </div>
                        </div>
                      </div>
                      
                      {/* 决策详情 - 可展开 */}
                      {expandedDecisionId === decision.id && (
                        <div className="p-4 bg-background border-t space-y-3">
                          {/* 关键指标 */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-2 bg-secondary rounded">
                              <div className="text-xs text-muted-foreground">交易建议</div>
                              <div className="text-sm font-semibold mt-1">{decision.action}</div>
                            </div>
                            <div className="p-2 bg-secondary rounded">
                              <div className="text-xs text-muted-foreground">建议金额</div>
                              <div className="text-sm font-semibold mt-1">
                                ${decision.targetQuantity ? parseFloat(decision.targetQuantity.toString()).toFixed(2) : '0.00'}
                              </div>
                            </div>
                            <div className="p-2 bg-secondary rounded">
                              <div className="text-xs text-muted-foreground">信心指数</div>
                              <div className="text-sm font-semibold mt-1">
                                {(parseFloat(decision.confidence.toString()) * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div className="p-2 bg-secondary rounded">
                              <div className="text-xs text-muted-foreground">风险等级</div>
                              <div className={`text-sm font-semibold mt-1 ${
                                decision.riskLevel === 'LOW' ? 'text-green-600' :
                                decision.riskLevel === 'HIGH' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {decision.riskLevel}
                              </div>
                            </div>
                          </div>
                          
                          {/* AI 分析推理 */}
                          {decision.reasoning && (
                            <div className="p-3 bg-secondary rounded-lg">
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                AI 分析过程
                              </div>
                              <div className="text-sm whitespace-pre-wrap">
                                {decision.reasoning}
                              </div>
                            </div>
                          )}
                          
                          {/* 技术指标 */}
                          {decision.technicalIndicators && (
                            <div className="p-3 bg-secondary rounded-lg">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                技术指标
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                {decision.technicalIndicators.rsi !== undefined && (
                                  <div>RSI: {Number(decision.technicalIndicators.rsi).toFixed(2)}</div>
                                )}
                                {decision.technicalIndicators.macd !== undefined && (
                                  <div>MACD: {typeof decision.technicalIndicators.macd === 'object' 
                                    ? Number(decision.technicalIndicators.macd.macd || 0).toFixed(2)
                                    : Number(decision.technicalIndicators.macd).toFixed(2)}</div>
                                )}
                                {decision.technicalIndicators.ema12 !== undefined && (
                                  <div>EMA12: {Number(decision.technicalIndicators.ema12).toFixed(2)}</div>
                                )}
                                {decision.technicalIndicators.ema26 !== undefined && (
                                  <div>EMA26: {Number(decision.technicalIndicators.ema26).toFixed(2)}</div>
                                )}
                                {decision.technicalIndicators.boll !== undefined && typeof decision.technicalIndicators.boll === 'object' && (
                                  <>
                                    <div>布林上轨: {Number(decision.technicalIndicators.boll.upper || 0).toFixed(2)}</div>
                                    <div>布林中轨: {Number(decision.technicalIndicators.boll.middle || 0).toFixed(2)}</div>
                                    <div>布林下轨: {Number(decision.technicalIndicators.boll.lower || 0).toFixed(2)}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* 关联交易 */}
                          {decision.trades && decision.trades.length > 0 && (
                            <div className="p-3 bg-secondary rounded-lg">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                关联交易
                              </div>
                              {decision.trades.map((trade: any) => (
                                <div key={trade.id} className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span>订单ID:</span>
                                    <span className="font-mono">{trade.orderId}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>数量:</span>
                                    <span>{parseFloat(trade.quantity.toString()).toFixed(6)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>价格:</span>
                                    <span>${parseFloat(trade.price.toString()).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>总价:</span>
                                    <span className="font-semibold">
                                      ${parseFloat(trade.quoteQty.toString()).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>状态:</span>
                                    <span className={`font-semibold ${
                                      trade.status === 'FILLED' ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                      {trade.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

