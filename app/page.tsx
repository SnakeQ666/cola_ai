'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  TrendingUp,
  Zap,
  Shield,
  BarChart3,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Rocket,
  Target,
  Activity,
  TrendingDown,
  DollarSign,
  LineChart
} from 'lucide-react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* 动态网格背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-purple-950" />
        
        {/* 动态网格 */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: `translateY(${scrollY * 0.5}px)`
          }}
        />
        
        {/* 浮动光球 */}
        <div 
          className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500 rounded-full blur-[128px] opacity-30 animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
        <div 
          className="absolute top-1/2 -right-48 w-96 h-96 bg-purple-500 rounded-full blur-[128px] opacity-30 animate-pulse"
          style={{ 
            transform: `translateY(${scrollY * 0.2}px)`,
            animationDelay: '1s'
          }}
        />
        <div 
          className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-cyan-500 rounded-full blur-[128px] opacity-20 animate-pulse"
          style={{ 
            transform: `translateY(${scrollY * 0.4}px)`,
            animationDelay: '2s'
          }}
        />
        
        {/* 粒子效果 */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              opacity: Math.random() * 0.5 + 0.2
            }}
          />
        ))}
      </div>

      {/* 头部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <Brain className="h-8 w-8 text-blue-400 group-hover:text-cyan-400 transition-colors" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                AI 交易平台
              </h1>
              <p className="text-xs text-slate-500">DeepSeek Powered</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/10">
                登录
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 hover:from-blue-700 hover:via-cyan-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-500/50 relative overflow-hidden group">
                <span className="relative z-10">开始使用</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            {/* 浮动标签 */}
            <div 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-purple-500/10 border border-blue-500/20 text-blue-300 mb-8 backdrop-blur-xl animate-bounce-slow"
              style={{ transform: `translateY(${scrollY * 0.1}px)` }}
            >
              <Sparkles className="h-4 w-4 animate-spin-slow" />
              <span className="text-sm font-medium">基于 DeepSeek AI 的智能交易引擎</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            
            {/* 主标题 - 打字机效果 */}
            <h2 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
              <div className="inline-block">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  AI 驱动
                </span>
              </div>
              <br />
              <div className="inline-block mt-4">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  智能交易
                </span>
              </div>
            </h2>
            
            {/* 副标题 */}
            <p className="text-xl md:text-3xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              让 <span className="text-blue-400 font-bold animate-pulse">AI</span> 成为你的专属交易员
              <br />
              <span className="inline-flex items-center gap-2 mt-2">
                <Activity className="h-6 w-6 text-green-400 animate-pulse" />
                <span className="text-cyan-400 font-semibold">7×24 小时</span> 
                自动监控 · 
                <span className="text-purple-400 font-semibold">智能决策</span> · 
                <span className="text-pink-400 font-semibold">精准执行</span>
              </span>
            </p>
            
            {/* CTA 按钮组 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
              <Link href="/auth/register">
                <Button size="lg" className="h-16 px-12 text-lg bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 hover:from-blue-700 hover:via-cyan-700 hover:to-purple-700 text-white border-0 shadow-2xl shadow-blue-500/50 relative overflow-hidden group">
                  <span className="relative z-10 flex items-center gap-2">
                    立即开始
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" className="h-16 px-12 text-lg bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border border-slate-700 hover:border-slate-600 shadow-xl relative overflow-hidden group">
                  <span className="relative z-10 flex items-center gap-2">
                    了解更多
                    <Sparkles className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                  </span>
                </Button>
              </a>
            </div>

            {/* 统计数据 - 动画卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-20">
              {[
                { value: '24/7', label: '全天候监控', icon: Activity, color: 'from-blue-500 to-cyan-500' },
                { value: '<1s', label: '毫秒级响应', icon: Zap, color: 'from-purple-500 to-pink-500' },
                { value: '10+', label: '技术指标', icon: LineChart, color: 'from-green-500 to-emerald-500' },
                { value: '100%', label: '自动化执行', icon: Rocket, color: 'from-orange-500 to-red-500' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={i} 
                    className="relative group"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity blur-xl" 
                         style={{ background: `linear-gradient(to right, ${stat.color})` }} />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:scale-105 hover:border-white/20">
                      <Icon className={`h-8 w-8 mb-3 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
                      <div className={`text-4xl font-black mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                        {stat.value}
                      </div>
                      <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 滚动提示 */}
            <div className="flex flex-col items-center gap-2 text-slate-500 animate-bounce">
              <span className="text-sm">向下滚动探索更多</span>
              <div className="w-6 h-10 border-2 border-slate-700 rounded-full flex items-start justify-center p-2">
                <div className="w-1 h-3 bg-slate-500 rounded-full animate-scroll" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section id="features" className="relative py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium">
                核心功能
              </span>
            </div>
            <h3 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              强大的 AI 能力
            </h3>
            <p className="text-2xl text-slate-400">极致的交易体验</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[
              {
                icon: Brain,
                title: 'DeepSeek AI 驱动',
                description: '采用最先进的 DeepSeek AI 模型，实时分析市场数据，做出智能交易决策',
                gradient: 'from-blue-500 via-cyan-500 to-blue-600',
                delay: '0s'
              },
              {
                icon: Activity,
                title: '技术指标分析',
                description: '集成 RSI、MACD、EMA、布林带等多种技术指标，全方位分析市场趋势',
                gradient: 'from-green-500 via-emerald-500 to-teal-600',
                delay: '0.1s'
              },
              {
                icon: Zap,
                title: '自动化交易',
                description: '7×24 小时自动监控市场，在最佳时机自动执行买入和卖出操作',
                gradient: 'from-purple-500 via-pink-500 to-purple-600',
                delay: '0.2s'
              },
              {
                icon: Shield,
                title: '智能风控',
                description: '多层风控机制，包括单笔限额、日亏损限制、止盈止损等，保护您的资产安全',
                gradient: 'from-red-500 via-orange-500 to-yellow-600',
                delay: '0.3s'
              },
              {
                icon: BarChart3,
                title: '实时监控',
                description: '可视化展示 AI 决策过程、交易记录、盈亏统计，让您全面掌控交易状况',
                gradient: 'from-yellow-500 via-amber-500 to-orange-600',
                delay: '0.4s'
              },
              {
                icon: Lock,
                title: '安全可靠',
                description: 'API 密钥 AES-256 加密存储，支持 Binance 测试网和主网，安全无忧',
                gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
                delay: '0.5s'
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={i} 
                  className="group relative"
                  style={{ animationDelay: feature.delay }}
                >
                  {/* 发光效果 */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-75 blur-xl transition-all duration-500`} />
                  
                  {/* 卡片内容 */}
                  <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-black/70 transition-all hover:scale-105 hover:border-white/20 h-full">
                    <div className={`p-4 bg-gradient-to-br ${feature.gradient} rounded-xl w-fit mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all"
                        style={{ backgroundImage: `linear-gradient(to right, ${feature.gradient})` }}>
                      {feature.title}
                    </h4>
                    <p className="text-slate-400 text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 交易类型 */}
      <section className="relative py-32 overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-20">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium">
                交易类型
              </span>
            </div>
            <h3 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              选择您的交易方式
            </h3>
            <p className="text-2xl text-slate-400">现货交易 · 合约交易 · 合约功能已完成</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* 现货交易 */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 rounded-3xl opacity-75 group-hover:opacity-100 blur-2xl transition-all duration-500 animate-gradient bg-[length:200%_auto]" />
              <div className="relative bg-gradient-to-br from-blue-900/80 to-cyan-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl overflow-hidden hover:border-blue-400/50 transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="relative p-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-blue-500/20 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-12 w-12 text-blue-400" />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 text-sm font-bold rounded-full border border-green-500/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      已上线
                    </div>
                  </div>
                  <h4 className="text-4xl font-black text-white mb-4">AI 现货交易</h4>
                  <p className="text-slate-300 text-lg mb-8">
                    支持 BTC、ETH、BNB、SOL 等主流币种现货交易
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      { icon: CheckCircle2, text: '自动买入卖出', color: 'text-green-400' },
                      { icon: Target, text: '智能止盈止损', color: 'text-blue-400' },
                      { icon: DollarSign, text: '多币种策略', color: 'text-cyan-400' },
                      { icon: LineChart, text: '盈亏实时追踪', color: 'text-purple-400' }
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <li key={i} className="flex items-center gap-3 text-white">
                          <Icon className={`h-6 w-6 ${item.color}`} />
                          <span className="text-lg">{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/auth/register">
                    <Button className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-xl group-hover:shadow-2xl group-hover:shadow-blue-500/50 transition-all relative overflow-hidden group/btn">
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        开始现货交易
                        <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-2 transition-transform" />
                      </span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* 合约交易 */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-3xl opacity-50 group-hover:opacity-75 blur-2xl transition-all duration-500 animate-gradient bg-[length:200%_auto]" />
              <div className="relative bg-gradient-to-br from-purple-900/80 to-pink-900/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl overflow-hidden hover:border-purple-400/50 transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="relative p-10 opacity-90">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-purple-500/20 rounded-2xl backdrop-blur-sm">
                      <Zap className="h-12 w-12 text-purple-400" />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 text-sm font-bold rounded-full border border-green-500/30">
                      <CheckCircle2 className="h-4 w-4" />
                      已上线
                    </div>
                  </div>
                  <h4 className="text-4xl font-black text-white mb-4">AI 合约交易</h4>
                  <p className="text-slate-300 text-lg mb-8">
                    支持永续合约、杠杆交易、网格策略等高级功能
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      { icon: TrendingUp, text: '永续合约交易' },
                      { icon: TrendingDown, text: '杠杆倍数调节' },
                      { icon: BarChart3, text: '网格交易策略' },
                      { icon: Target, text: '套利策略' }
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <li key={i} className="flex items-center gap-3 text-slate-400">
                          <Icon className="h-6 w-6 text-purple-400" />
                          <span className="text-lg">{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/auth/register">
                    <Button className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl group-hover:shadow-2xl group-hover:shadow-purple-500/50 transition-all relative overflow-hidden group/btn">
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        开始合约交易
                        <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-2 transition-transform" />
                      </span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="relative py-32">
        <div className="container mx-auto px-4">
          <div className="relative max-w-6xl mx-auto">
            {/* 发光效果 */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl opacity-75 blur-3xl animate-pulse" />
            
            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="relative p-16 md:p-24 text-center">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white mb-8 animate-bounce-slow">
                  <Sparkles className="h-5 w-5 animate-spin-slow" />
                  <span className="font-bold">限时优惠 · 免费使用</span>
                  <Sparkles className="h-5 w-5 animate-spin-slow" />
                </div>
                <h3 className="text-5xl md:text-7xl font-black mb-8 text-white">
                  准备好开始了吗？
                </h3>
                <p className="text-2xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed">
                  立即注册，让 AI 成为您的专属交易员
                  <br />
                  <span className="font-bold text-3xl">开启智能交易新时代</span>
                </p>
                <Link href="/auth/register">
                  <Button size="lg" className="h-16 px-16 text-xl bg-white text-purple-600 hover:bg-slate-100 shadow-2xl hover:shadow-white/50 hover:scale-110 transition-all group">
                    <span className="flex items-center gap-3">
                      <Rocket className="h-6 w-6 group-hover:translate-y-[-4px] transition-transform" />
                      免费注册
                      <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="relative border-t border-white/5 backdrop-blur-xl bg-black/50">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Brain className="h-8 w-8 text-blue-400" />
                <div>
                  <span className="font-bold text-white text-lg">AI 交易平台</span>
                  <p className="text-xs text-slate-500">DeepSeek Powered</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                基于 DeepSeek AI 的智能加密货币交易平台，让交易更简单、更智能、更安全
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 text-lg">产品</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><Link href="/trading" className="hover:text-white transition-colors flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> 现货交易
                </Link></li>
                <li><Link href="/futures" className="hover:text-white transition-colors flex items-center gap-2">
                  <Zap className="h-4 w-4" /> 合约交易
                </Link></li>
                <li><Link href="/settings" className="hover:text-white transition-colors flex items-center gap-2">
                  <Shield className="h-4 w-4" /> 风控设置
                </Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 text-lg">支持</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">帮助中心</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API 文档</a></li>
                <li><a href="#" className="hover:text-white transition-colors">联系我们</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 text-lg">关于</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">关于我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">隐私政策</a></li>
                <li><a href="#" className="hover:text-white transition-colors">服务条款</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center">
            <p className="text-slate-400 text-sm mb-2">
              © 2024 AI 交易平台. 由 DeepSeek AI 驱动.
            </p>
            <p className="text-xs text-slate-600 flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              加密货币交易具有高风险，请谨慎投资，风险自负
            </p>
          </div>
        </div>
      </footer>

      {/* 自定义样式 */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scroll {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(12px); opacity: 0; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-scroll {
          animation: scroll 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
