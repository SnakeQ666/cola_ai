'use client';

import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Zap, 
  Shield, 
  Activity, 
  Lock,
  CheckCircle2,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      const data = await res.json();
      if (res.ok && data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const spot = summary?.spot || {};
  const futures = summary?.futures || {};

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        {/* 标题区域 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">交易数据大盘</h1>
              <p className="text-muted-foreground mt-1">实时监控您的交易表现和风控状态</p>
            </div>
          </div>
        </div>

        {/* 现货交易数据 */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white">现货交易</CardTitle>
                    <CardDescription className="text-slate-300">
                      AI 管理的现货资产组合
                    </CardDescription>
                  </div>
                </div>
                {spot.enabled ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    已开通
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Lock className="h-3 w-3 mr-1" />
                    待开通
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {spot.enabled ? (
                spot.portfolio ? (
                  <div className="space-y-6">
                    {/* 核心指标 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">初始投入</div>
                        <div className="text-2xl font-bold">
                          ${spot.portfolio.initialInvestment.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">当前价值</div>
                        <div className="text-2xl font-bold">
                          ${spot.portfolio.currentValue.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">盈亏</div>
                        <div className={`text-2xl font-bold ${spot.portfolio.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {spot.portfolio.pnl >= 0 ? '+' : ''}${spot.portfolio.pnl.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">收益率</div>
                        <div className={`text-2xl font-bold ${spot.portfolio.pnlPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {spot.portfolio.pnlPercent >= 0 ? '+' : ''}{spot.portfolio.pnlPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* 持仓信息 */}
                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">当前持仓币种数</div>
                        <div className="text-xl font-bold">{spot.portfolio.holdings}</div>
                      </div>
                    </div>

                    {/* 风控设置 */}
                    {spot.riskControl && (
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm font-semibold">风控设置</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">单笔限额: </span>
                            <span>${spot.riskControl.maxTradeAmount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">日亏损限制: </span>
                            <span>${spot.riskControl.maxDailyLoss}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">允许交易对: </span>
                            <span>{spot.riskControl.allowedSymbols.join(', ') || '无'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>暂无交易数据</p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-2">现货交易功能尚未开通</p>
                  <p className="text-sm text-muted-foreground">前往设置页面连接 Binance 账户以启用</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 合约交易数据 */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Zap className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white">合约交易</CardTitle>
                    <CardDescription className="text-slate-300">
                      AI 管理的合约资产组合
                    </CardDescription>
                  </div>
                </div>
                {futures.enabled ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    已开通
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Lock className="h-3 w-3 mr-1" />
                    待开通
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {futures.enabled ? (
                futures.portfolio ? (
                  <div className="space-y-6">
                    {/* 核心指标 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">初始投入</div>
                        <div className="text-2xl font-bold">
                          ${futures.portfolio.initialInvestment.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">当前价值</div>
                        <div className="text-2xl font-bold">
                          ${futures.portfolio.currentValue.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">盈亏</div>
                        <div className={`text-2xl font-bold ${futures.portfolio.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {futures.portfolio.pnl >= 0 ? '+' : ''}${futures.portfolio.pnl.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">收益率</div>
                        <div className={`text-2xl font-bold ${futures.portfolio.pnlPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {futures.portfolio.pnlPercent >= 0 ? '+' : ''}{futures.portfolio.pnlPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* 持仓信息 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">当前持仓数</div>
                        <div className="text-xl font-bold">{futures.portfolio.positions}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="text-sm text-muted-foreground mb-1">未实现盈亏</div>
                        <div className={`text-xl font-bold ${futures.portfolio.unrealizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {futures.portfolio.unrealizedPnl >= 0 ? '+' : ''}${futures.portfolio.unrealizedPnl.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* 风控设置 */}
                    {futures.riskControl && (
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm font-semibold">风控设置</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">单仓位限额: </span>
                            <span>${futures.riskControl.maxPositionSize}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">日亏损限制: </span>
                            <span>${futures.riskControl.maxDailyLoss}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">止损比例: </span>
                            <span>{futures.riskControl.stopLossPercent}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">止盈比例: </span>
                            <span>{futures.riskControl.takeProfitPercent}%</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">允许交易对: </span>
                            <span>{futures.riskControl.allowedSymbols.join(', ') || '无'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>暂无交易数据</p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-2">合约交易功能尚未开通</p>
                  <p className="text-sm text-muted-foreground">前往设置页面连接 Binance 合约账户以启用</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 账户状态汇总 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">账户状态</CardTitle>
                <CardDescription className="text-slate-300">
                  功能开通状态和自动交易设置
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">现货交易</span>
                  {spot.enabled ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                      已开通
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                      待开通
                    </Badge>
                  )}
                </div>
                {spot.account && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {spot.account.enableAutoTrade ? (
                      <span className="text-green-600 dark:text-green-400">自动交易已开启 · 间隔 {spot.account.tradeInterval} 分钟</span>
                    ) : (
                      <span>自动交易已关闭</span>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">合约交易</span>
                  {futures.enabled ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                      已开通
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                      待开通
                    </Badge>
                  )}
                </div>
                {futures.account && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {futures.account.enableAutoTrade ? (
                      <span className="text-green-600 dark:text-green-400">自动交易已开启 · 间隔 {futures.account.tradeInterval} 分钟</span>
                    ) : (
                      <span>自动交易已关闭</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
