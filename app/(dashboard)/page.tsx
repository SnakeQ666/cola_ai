'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TrendingUp, Shield, Zap, BarChart3, Brain, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-500/10 rounded-full">
              <Brain className="h-16 w-16 text-blue-400" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            AI 加密货币交易平台
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            基于 DeepSeek AI 的智能交易系统，自动分析市场趋势，执行最优交易策略
          </p>
          <div className="flex gap-4 justify-center">
            {status === 'authenticated' ? (
              <Button
                size="lg"
                onClick={() => router.push('/trading')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
              >
                进入交易平台
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push('/auth/login')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
                >
                  立即开始
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/auth/register')}
                  className="border-blue-400 text-blue-400 hover:bg-blue-400/10 px-8 py-6 text-lg"
                >
                  注册账户
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-blue-500/10 rounded-lg w-fit mb-4">
                <Brain className="h-8 w-8 text-blue-400" />
              </div>
              <CardTitle className="text-white">DeepSeek AI 驱动</CardTitle>
              <CardDescription className="text-slate-400">
                采用最先进的 DeepSeek AI 模型，实时分析市场数据，做出智能交易决策
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-green-500/10 rounded-lg w-fit mb-4">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <CardTitle className="text-white">技术指标分析</CardTitle>
              <CardDescription className="text-slate-400">
                集成 RSI、MACD、EMA、布林带等多种技术指标，全方位分析市场趋势
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-purple-500/10 rounded-lg w-fit mb-4">
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
              <CardTitle className="text-white">自动化交易</CardTitle>
              <CardDescription className="text-slate-400">
                7×24 小时自动监控市场，在最佳时机自动执行买入和卖出操作
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-red-500/10 rounded-lg w-fit mb-4">
                <Shield className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-white">智能风控</CardTitle>
              <CardDescription className="text-slate-400">
                多层风控机制，包括单笔限额、日亏损限制、止盈止损等，保护您的资产安全
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-yellow-500/10 rounded-lg w-fit mb-4">
                <BarChart3 className="h-8 w-8 text-yellow-400" />
              </div>
              <CardTitle className="text-white">实时监控</CardTitle>
              <CardDescription className="text-slate-400">
                可视化展示 AI 决策过程、交易记录、盈亏统计，让您全面掌控交易状况
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-cyan-500/10 rounded-lg w-fit mb-4">
                <Lock className="h-8 w-8 text-cyan-400" />
              </div>
              <CardTitle className="text-white">安全可靠</CardTitle>
              <CardDescription className="text-slate-400">
                API 密钥 AES-256 加密存储，支持 Binance 测试网和主网，安全无忧
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Trading Types */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="bg-gradient-to-br from-blue-900/50 to-slate-800/50 border-blue-700">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-400" />
                AI 现货交易
              </CardTitle>
              <CardDescription className="text-slate-300 text-base">
                已上线 - 支持 BTC、ETH、BNB、SOL 等主流币种现货交易
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-400">
              <ul className="space-y-2">
                <li>✓ 自动买入卖出</li>
                <li>✓ 智能止盈止损</li>
                <li>✓ 多币种策略</li>
                <li>✓ 盈亏实时追踪</li>
              </ul>
              {status === 'authenticated' && (
                <Button
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.push('/trading')}
                >
                  开始现货交易
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-slate-800/50 border-purple-700 relative">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
                即将推出
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <Zap className="h-6 w-6 text-purple-400" />
                AI 合约交易
              </CardTitle>
              <CardDescription className="text-slate-300 text-base">
                敬请期待 - 支持永续合约、杠杆交易、网格策略等高级功能
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-400">
              <ul className="space-y-2 opacity-60">
                <li>○ 永续合约交易</li>
                <li>○ 杠杆倍数调节</li>
                <li>○ 网格交易策略</li>
                <li>○ 套利策略</li>
              </ul>
              <Button
                className="w-full mt-6 bg-purple-600 hover:bg-purple-700 opacity-60 cursor-not-allowed"
                disabled
              >
                开发中
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">平台优势</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">24/7</div>
              <div className="text-slate-400">全天候监控</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">&lt;1s</div>
              <div className="text-slate-400">毫秒级响应</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">10+</div>
              <div className="text-slate-400">技术指标</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">100%</div>
              <div className="text-slate-400">自动化执行</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

