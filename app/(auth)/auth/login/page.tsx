'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, AlertCircle, TrendingUp, Sparkles, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // 登录成功，跳转到首页（数据大盘）
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setError('登录失败，请稍后重试');
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative flex items-center justify-center p-4">
      {/* 动态背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-purple-950" />
        
        {/* 动态网格 */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* 浮动光球 */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500 rounded-full blur-[128px] opacity-30 animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500 rounded-full blur-[128px] opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* 粒子效果 */}
        {[...Array(15)].map((_, i) => (
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

      {/* 返回首页 */}
      <Link 
        href="/" 
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
      >
        <Brain className="h-6 w-6 text-blue-400 group-hover:text-cyan-400 transition-colors" />
        <span className="font-semibold">AI 交易平台</span>
      </Link>

      {/* 登录卡片 */}
      <div className="relative w-full max-w-md z-10">
        {/* 发光效果 */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 rounded-3xl opacity-75 blur-2xl animate-pulse" />
        
        <Card className="relative bg-black/50 backdrop-blur-xl border-white/10">
          <CardHeader className="text-center space-y-6 pb-8">
            {/* Logo 和状态指示器 */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative p-4 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl">
                  <TrendingUp className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full" />
              </div>
            </div>

            {/* 标题 */}
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                欢迎回来
              </CardTitle>
              <CardDescription className="text-slate-400 text-base">
                登录到 AI 加密货币交易平台
              </CardDescription>
            </div>

            {/* 特性标签 */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs">
                <Sparkles className="h-3 w-3" />
                <span>AI 驱动</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>7×24 在线</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs">
                <Lock className="h-3 w-3" />
                <span>安全加密</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {/* 邮箱输入 */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-400" />
                  邮箱地址
                </label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-white placeholder:text-slate-500 transition-all"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-cyan-500/0 to-purple-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-cyan-500/10 group-focus-within:to-purple-500/10 pointer-events-none transition-all" />
                </div>
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-400" />
                  密码
                </label>
                <div className="relative group">
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-slate-500 transition-all"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-blue-500/0 group-focus-within:from-purple-500/10 group-focus-within:via-pink-500/10 group-focus-within:to-blue-500/10 pointer-events-none transition-all" />
                </div>
              </div>

              {/* 记住我和忘记密码 */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="rounded bg-white/5 border-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                  />
                  记住我
                </label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-blue-400 hover:text-cyan-400 transition-colors"
                >
                  忘记密码？
                </Link>
              </div>

              {/* 登录按钮 */}
              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 hover:from-blue-700 hover:via-cyan-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-500/50 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      登录中...
                    </>
                  ) : (
                    <>
                      登录
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                {!loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Button>

              {/* 分割线 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-3 text-slate-500">
                    或
                  </span>
                </div>
              </div>

              {/* 注册链接 */}
              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  还没有账号？{' '}
                  <Link 
                    href="/auth/register" 
                    className="text-blue-400 hover:text-cyan-400 font-semibold transition-colors inline-flex items-center gap-1 group"
                  >
                    立即注册
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p className="flex items-center justify-center gap-2">
            <Lock className="h-3 w-3" />
            您的数据经过 AES-256 加密保护
          </p>
        </div>
      </div>

      {/* 装饰元素 */}
      <div className="fixed bottom-10 right-10 text-slate-600 text-xs hidden md:block">
        <p>Powered by DeepSeek AI</p>
      </div>
    </div>
  );
}
