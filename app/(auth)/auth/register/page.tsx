'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, AlertCircle, Check, X, Rocket, Sparkles, Lock, Mail, User, ArrowRight, Shield } from 'lucide-react';

// 密码规则定义
interface PasswordRule {
  name: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  {
    name: '至少8位字符',
    test: (pwd) => pwd.length >= 8,
  },
  {
    name: '包含大写字母',
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    name: '包含小写字母',
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    name: '包含数字',
    test: (pwd) => /[0-9]/.test(pwd),
  },
  {
    name: '包含特殊字符 (!@#$%^&*)',
    test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  },
];

// 计算密码强度
const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  const passedRules = passwordRules.filter((rule) => rule.test(password)).length;
  
  if (passedRules < 3) return 'weak';
  if (passedRules < 4) return 'medium';
  return 'strong';
};

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 密码验证状态
  const passwordValidation = useMemo(() => {
    return passwordRules.map((rule) => ({
      name: rule.name,
      passed: rule.test(password),
    }));
  }, [password]);

  // 密码强度
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return getPasswordStrength(password);
  }, [password]);

  // 检查所有密码规则是否通过
  const allPasswordRulesPassed = useMemo(() => {
    return passwordValidation.every((rule) => rule.passed);
  }, [passwordValidation]);

  // 检查密码是否匹配
  const passwordsMatch = useMemo(() => {
    return password && confirmPassword && password === confirmPassword;
  }, [password, confirmPassword]);

  // 表单是否可以提交
  const canSubmit = useMemo(() => {
    return (
      name.trim() &&
      email.trim() &&
      allPasswordRulesPassed &&
      passwordsMatch &&
      !loading
    );
  }, [name, email, allPasswordRulesPassed, passwordsMatch, loading]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败');
        setLoading(false);
        return;
      }

      // 注册成功，自动登录
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('注册成功，但登录失败，请手动登录');
        setLoading(false);
        return;
      }

      // 登录成功，跳转到首页（数据大盘）
      // 使用 window.location.href 确保完整的页面刷新和 session 验证
      window.location.href = '/dashboard';
    } catch (error) {
      setError('注册失败，请稍后重试');
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

      {/* 注册卡片 */}
      <div className="relative w-full max-w-md z-10">
        {/* 发光效果 */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl opacity-75 blur-2xl animate-pulse" />
        
        <Card className="relative bg-black/50 backdrop-blur-xl border-white/10">
          <CardHeader className="text-center space-y-6 pb-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl">
                  <Rocket className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full" />
              </div>
            </div>

            {/* 标题 */}
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                开启交易之旅
              </CardTitle>
              <CardDescription className="text-slate-400 text-base">
                注册 AI 加密货币交易平台
              </CardDescription>
            </div>

            {/* 特性标签 */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs">
                <Sparkles className="h-3 w-3" />
                <span>免费使用</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs">
                <Shield className="h-3 w-3" />
                <span>安全可靠</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs">
                <Rocket className="h-3 w-3" />
                <span>即刻启动</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleRegister} className="space-y-5">
              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {/* 用户名输入 */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <User className="h-4 w-4 text-cyan-400" />
                  用户名
                </label>
                <div className="relative group">
                  <Input
                    id="name"
                    type="text"
                    placeholder="请输入用户名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-white/10 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 transition-all"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-blue-500/10 group-focus-within:to-purple-500/10 pointer-events-none transition-all" />
                </div>
              </div>

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
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
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
                    onFocus={() => setShowPasswordRules(true)}
                    required
                    className="h-12 bg-white/5 border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-slate-500 transition-all"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-blue-500/0 group-focus-within:from-purple-500/10 group-focus-within:via-pink-500/10 group-focus-within:to-blue-500/10 pointer-events-none transition-all" />
                </div>

                {/* 密码强度指示器 */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength === 'medium' || passwordStrength === 'strong' ? (passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500') : 'bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-white/10'}`} />
                    </div>
                    <p className="text-xs text-slate-400">
                      密码强度: <span className={passwordStrength === 'weak' ? 'text-red-400' : passwordStrength === 'medium' ? 'text-yellow-400' : 'text-green-400'}>
                        {passwordStrength === 'weak' ? '弱' : passwordStrength === 'medium' ? '中' : '强'}
                      </span>
                    </p>
                  </div>
                )}

                {/* 密码规则 */}
                {showPasswordRules && password && (
                  <div className="space-y-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-xs text-slate-400 font-medium">密码要求:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {passwordValidation.map((rule, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            rule.passed ? 'text-green-400' : 'text-slate-500'
                          }`}
                        >
                          {rule.passed ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          <span>{rule.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-pink-400" />
                  确认密码
                </label>
                <div className="relative group">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-white/10 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 text-white placeholder:text-slate-500 transition-all"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-pink-500/0 via-purple-500/0 to-blue-500/0 group-focus-within:from-pink-500/10 group-focus-within:via-purple-500/10 group-focus-within:to-blue-500/10 pointer-events-none transition-all" />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    密码不匹配
                  </p>
                )}
                {confirmPassword && passwordsMatch && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    密码匹配
                  </p>
                )}
              </div>

              {/* 注册按钮 */}
              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white border-0 shadow-lg shadow-purple-500/50 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canSubmit}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      注册中...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 group-hover:translate-y-[-2px] transition-transform" />
                      立即注册
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                {!loading && canSubmit && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
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

              {/* 登录链接 */}
              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  已有账号？{' '}
                  <Link 
                    href="/auth/login" 
                    className="text-purple-400 hover:text-pink-400 font-semibold transition-colors inline-flex items-center gap-1 group"
                  >
                    立即登录
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-2">
          <p className="flex items-center justify-center gap-2">
            <Lock className="h-3 w-3" />
            注册即表示您同意我们的服务条款和隐私政策
          </p>
          <p className="flex items-center justify-center gap-2">
            <Shield className="h-3 w-3 text-green-500" />
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
