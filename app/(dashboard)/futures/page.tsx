'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Rocket, TrendingUp, Shield, AlertCircle, Activity, Loader2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FuturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);

  useEffect(() => {
    loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connected) {
      loadBalance();
      loadPositions();
      loadDecisions();
      loadBalanceHistory();

      // 定时刷新数据
      const interval = setInterval(() => {
        loadBalance();
        loadPositions();
        loadDecisions();
        loadBalanceHistory();
      }, 30000); // 30秒刷新一次

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    if (connected && account?.enableAutoTrade) {
      // 使用用户配置的交易间隔
      const intervalMinutes = account.tradeInterval || 5;
      const intervalMs = intervalMinutes * 60 * 1000;
      
      console.log(`[Futures] AI 自动交易已启用，间隔: ${intervalMinutes} 分钟`);
      
      const interval = setInterval(() => {
        handleAnalyze();
      }, intervalMs);

      // 立即执行一次
      handleAnalyze();

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, account?.enableAutoTrade, account?.tradeInterval]);

  const loadAccount = async () => {
    try {
      const res = await fetch('/api/futures/account');
      const data = await res.json();
      
      if (data.account) {
        setAccount(data.account);
        setConnected(true);
        loadBalance();
        loadPositions();
      }
    } catch (error) {
      console.error('加载合约账户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const res = await fetch('/api/futures/balance');
      const data = await res.json();
      if (res.ok) {
        setBalance(data);
      }
    } catch (error) {
      console.error('加载余额失败:', error);
    }
  };

  const loadPositions = async () => {
    try {
      const res = await fetch('/api/futures/positions');
      const data = await res.json();
      if (res.ok) {
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error('加载持仓失败:', error);
    }
  };

  const loadDecisions = async () => {
    try {
      const res = await fetch('/api/futures/decisions');
      const data = await res.json();
      if (res.ok) {
        setDecisions(data.decisions || []);
      }
    } catch (error) {
      console.error('加载决策历史失败:', error);
    }
  };

  const loadBalanceHistory = async () => {
    try {
      const res = await fetch('/api/futures/balance-history');
      const data = await res.json();
      if (res.ok) {
        const history = data.history || [];
        const chartData = history.map((item: any, index: number) => {
          // 如果 snapshotAt 不存在或无效，使用索引作为时间标识
          let timeLabel = `#${index + 1}`;
          
          if (item.snapshotAt) {
            try {
              const date = new Date(item.snapshotAt);
              if (!isNaN(date.getTime())) {
                timeLabel = date.toLocaleString('zh-CN', { 
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
              }
            } catch (e) {
              console.error('解析日期失败:', e);
            }
          }
          
          return {
            time: timeLabel,
            balance: parseFloat(item.totalBalance || 0)
          };
        });
        setBalanceHistory(chartData);
      }
    } catch (error) {
      console.error('加载余额历史失败:', error);
    }
  };

  const handleAnalyze = async () => {
    if (analyzing) return;
    
    try {
      setAnalyzing(true);
      const res = await fetch('/api/futures/analyze', {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.executed) {
          toast.success(`交易执行成功: ${data.order.side} ${data.order.symbol} ${data.order.leverage}x`);
          loadBalance();
          loadPositions();
          loadDecisions();
          loadBalanceHistory();
        } else {
          toast.info(data.reason || '未执行交易');
          loadDecisions();
        }
      } else {
        toast.error(data.error || 'AI 分析失败');
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      toast.error('AI 分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/futures/account', {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAccount(data.account);
        setConnected(true);
        toast.success('合约账户已启用');
      } else {
        toast.error(data.error || '启用失败');
      }
    } catch (error) {
      toast.error('启用失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoTrade = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/futures/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableAutoTrade: enabled })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAccount(data.account);
        toast.success(enabled ? '自动交易已开启，AI 将每分钟分析一次市场' : '自动交易已关闭');
        if (enabled) {
          // 立即执行一次分析
          setTimeout(() => handleAnalyze(), 1000);
        }
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-8 w-8 text-purple-500" />
              AI 合约交易
            </h1>
            <p className="text-muted-foreground mt-2">
              智能合约交易系统
            </p>
          </div>
        </div>

        <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Rocket className="h-6 w-6 text-purple-500" />
              <CardTitle className="text-2xl">启用合约交易</CardTitle>
            </div>
            <CardDescription className="text-base">
              请先连接 Binance 现货账户，然后启用合约交易功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleConnect}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Rocket className="mr-2 h-4 w-4" />
              启用合约交易
            </Button>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>核心功能</CardTitle>
              <CardDescription>AI 合约交易系统特性</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span>永续合约多空交易</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>1x-125x 杠杆倍数</span>
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span>AI 自动开平仓</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span>智能止盈止损</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>风险提示</CardTitle>
              <CardDescription>合约交易注意事项</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>合约交易具有高风险，杠杆可能放大收益也可能放大亏损</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>建议先在测试网熟悉操作，并设置合理的风控参数</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>新手用户建议使用低杠杆（2-5x）开始</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-purple-500" />
            AI 合约交易
          </h1>
          <p className="text-muted-foreground mt-2">
            智能合约交易系统 - 自动开平仓、智能止盈止损
          </p>
        </div>
        <Badge variant={account?.enableAutoTrade ? "default" : "secondary"} className="text-sm px-3 py-1">
          {account?.enableAutoTrade ? "自动交易中" : "手动模式"}
        </Badge>
      </div>

      {/* 自动交易控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              自动交易
            </span>
            <Switch
              checked={account?.enableAutoTrade || false}
              onCheckedChange={toggleAutoTrade}
            />
          </CardTitle>
          <CardDescription>
            {account?.enableAutoTrade 
              ? 'AI 正在自动监控市场并执行交易决策' 
              : '开启后 AI 将自动进行合约交易'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 账户余额 */}
      {balance && (
        <Card>
          <CardHeader>
            <CardTitle>账户余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">总余额</Label>
                <p className="text-2xl font-bold text-blue-500">${balance.totalBalance?.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">可用余额</Label>
                <p className="text-2xl font-bold text-green-500">${balance.availableBalance?.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">已用保证金</Label>
                <p className="text-2xl font-bold text-orange-500">${balance.usedMargin?.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">未实现盈亏</Label>
                <p className={`text-2xl font-bold ${balance.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {balance.unrealizedPnl >= 0 ? '+' : ''}${balance.unrealizedPnl?.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 余额变化图表 */}
      {balanceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>余额变化</CardTitle>
            <CardDescription>AI 管理的合约账户余额变化趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="总余额 (USDT)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 当前持仓 */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>当前持仓</CardTitle>
            <CardDescription>AI 管理的合约持仓</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positions.map((pos, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{pos.symbol}</span>
                      <Badge variant={pos.side === 'LONG' ? 'default' : 'destructive'}>
                        {pos.side} {pos.leverage}x
                      </Badge>
                    </div>
                    <div className={`text-lg font-bold ${pos.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl?.toFixed(2)}
                      <span className="text-sm ml-1">({pos.roe >= 0 ? '+' : ''}{pos.roe?.toFixed(2)}%)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">开仓价: </span>
                      <span className="font-medium">${pos.entryPrice?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">标记价: </span>
                      <span className="font-medium">${pos.markPrice?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">数量: </span>
                      <span className="font-medium">{pos.quantity?.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">强平价: </span>
                      <span className="font-medium text-red-500">${pos.liquidationPrice?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 决策历史 */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI 决策历史</CardTitle>
            <CardDescription>最近 10 条 AI 合约交易决策</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {decisions.map((decision) => (
                <div key={decision.id} className="border rounded-lg p-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedDecisionId(
                      expandedDecisionId === decision.id ? null : decision.id
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        decision.action === 'OPEN_LONG' ? 'default' :
                        decision.action === 'OPEN_SHORT' ? 'destructive' :
                        decision.action === 'CLOSE_LONG' || decision.action === 'CLOSE_SHORT' ? 'secondary' :
                        'outline'
                      }>
                        {decision.action}
                      </Badge>
                      <span className="font-medium">{decision.symbol}</span>
                      {decision.leverage && (
                        <span className="text-sm text-muted-foreground">{decision.leverage}x</span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(decision.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={decision.executed ? 'default' : 'secondary'}>
                        {decision.executed ? '已执行' : '未执行'}
                      </Badge>
                      {expandedDecisionId === decision.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {expandedDecisionId === decision.id && (
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <Label className="text-muted-foreground">AI 分析</Label>
                        <p className="mt-1">{decision.reasoning}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-muted-foreground">置信度</Label>
                          <p className="font-medium">{(decision.confidence * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">风险等级</Label>
                          <p className="font-medium">{decision.riskLevel}</p>
                        </div>
                        {decision.leverage && (
                          <div>
                            <Label className="text-muted-foreground">杠杆倍数</Label>
                            <p className="font-medium">{decision.leverage}x</p>
                          </div>
                        )}
                        {decision.margin && (
                          <div>
                            <Label className="text-muted-foreground">保证金</Label>
                            <p className="font-medium">${decision.margin.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      {decision.technicalIndicators && (
                        <div>
                          <Label className="text-muted-foreground">技术指标</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                            {decision.technicalIndicators.rsi && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">RSI: </span>
                                <span>{Number(decision.technicalIndicators.rsi).toFixed(2)}</span>
                              </div>
                            )}
                            {decision.technicalIndicators.macd && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">MACD: </span>
                                <span>{typeof decision.technicalIndicators.macd === 'object' 
                                  ? Number(decision.technicalIndicators.macd.macd).toFixed(4)
                                  : Number(decision.technicalIndicators.macd).toFixed(4)
                                }</span>
                              </div>
                            )}
                            {decision.technicalIndicators.ema20 && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">EMA20: </span>
                                <span>${Number(decision.technicalIndicators.ema20).toFixed(2)}</span>
                              </div>
                            )}
                            {decision.technicalIndicators.currentPrice && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">当前价: </span>
                                <span>${Number(decision.technicalIndicators.currentPrice).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {decision.orders && decision.orders.length > 0 && (
                        <div>
                          <Label className="text-muted-foreground">关联订单</Label>
                          <div className="mt-1 space-y-1">
                            {decision.orders.map((order: any) => (
                              <div key={order.id} className="text-xs p-2 bg-muted rounded">
                                <div className="flex items-center justify-between">
                                  <span>
                                    {order.side} {order.symbol} {order.leverage}x
                                  </span>
                                  <Badge variant={order.status === 'FILLED' ? 'default' : 'secondary'}>
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground mt-1">
                                  数量: {order.quantity} | 价格: ${order.price?.toFixed(2)}
                                  {order.pnl && (
                                    <span className={order.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                      {' '}| PnL: {order.pnl >= 0 ? '+' : ''}${order.pnl.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {decision.executionOutcome && (
                        <div>
                          <Label className="text-muted-foreground">执行结果</Label>
                          <p className="mt-1 text-xs">{decision.executionOutcome}</p>
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

      {/* 风控配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>风控配置</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/futures/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              修改设置
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">默认杠杆</Label>
              <p className="text-2xl font-bold text-purple-500">{account?.defaultLeverage}x</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">最大杠杆</Label>
              <p className="text-2xl font-bold text-pink-500">{account?.maxLeverage}x</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">单仓最大</Label>
              <p className="text-2xl font-bold text-blue-500">${account?.maxPositionSize}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">日亏损限额</Label>
              <p className="text-2xl font-bold text-red-500">${account?.maxDailyLoss}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground">允许交易币种</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {account?.allowedSymbols?.map((symbol: string) => (
                <Badge key={symbol} variant="secondary">
                  {symbol}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 功能说明 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>核心功能</CardTitle>
            <CardDescription>已启用的交易功能</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>永续合约多空交易</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>动态杠杆调整</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>AI 自动开平仓</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>智能止盈止损</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span>网格交易策略（开发中）</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span>套利策略（开发中）</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>风险提示</CardTitle>
            <CardDescription>交易注意事项</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  合约交易具有高风险，请谨慎使用高杠杆
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  已启用多层风控保护，包括止损、日亏损限额等
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  AI 会实时监控持仓并自动执行止盈止损
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
