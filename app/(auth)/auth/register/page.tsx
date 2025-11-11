'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, AlertCircle, CheckCircle, Check, X } from 'lucide-react'

// 密码规则定义
interface PasswordRule {
  name: string
  test: (password: string) => boolean
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
]

// 计算密码强度
const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  const passedRules = passwordRules.filter((rule) => rule.test(password)).length
  
  if (passedRules < 3) return 'weak'
  if (passedRules < 4) return 'medium'
  return 'strong'
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPasswordRules, setShowPasswordRules] = useState(false)

  // 计算密码规则验证结果
  const passwordValidation = useMemo(() => {
    return passwordRules.map((rule) => ({
      ...rule,
      passed: rule.test(password),
    }))
  }, [password])

  // 计算密码强度
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  // 检查密码是否满足所有规则
  const isPasswordValid = useMemo(() => {
    return passwordValidation.every((rule) => rule.passed)
  }, [passwordValidation])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // 校验密码规则
    if (!isPasswordValid) {
      setError('密码不符合要求，请查看下方的密码规则')
      return
    }

    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    setLoading(true)

    try {
      // 调用注册API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        setLoading(false)
        return
      }

      // 注册成功，显示提示
      setSuccess(true)

      // 自动登录
      setTimeout(async () => {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.ok) {
          router.push('/dashboard')
          router.refresh()
        }
      }, 1500)
    } catch (error) {
      console.error('注册失败:', error)
      setError('注册失败，请稍后重试')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-purple-600/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">创建账号</CardTitle>
          <CardDescription>
            开始您的AI数据分析之旅
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>注册成功！正在跳转...</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                姓名
              </label>
              <Input
                id="name"
                type="text"
                placeholder="张三"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                pattern="^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
              />
              {email && !new RegExp('^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$').test(email) && (
                <p className="text-xs text-destructive">邮箱格式不正确</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  密码
                </label>
                {password && (
                  <span className={`text-xs font-medium ${
                    passwordStrength === 'strong' ? 'text-green-600' :
                    passwordStrength === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {passwordStrength === 'strong' ? '强' :
                     passwordStrength === 'medium' ? '中' : '弱'}
                  </span>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setShowPasswordRules(true)
                }}
                onFocus={() => setShowPasswordRules(true)}
                required
              />
              
              {/* 密码强度指示器 */}
              {password && (
                <div className="flex gap-1 h-1.5">
                  <div className={`flex-1 rounded-full ${
                    passwordStrength === 'weak' ? 'bg-red-500' :
                    passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' :
                    'bg-muted'
                  }`} />
                  <div className={`flex-1 rounded-full ${
                    passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' :
                    'bg-muted'
                  }`} />
                  <div className={`flex-1 rounded-full ${
                    passwordStrength === 'strong' ? 'bg-green-500' :
                    'bg-muted'
                  }`} />
                </div>
              )}

              {/* 密码规则提示 */}
              {showPasswordRules && (
                <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">密码规则：</p>
                  {passwordValidation.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs"
                    >
                      {rule.passed ? (
                        <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={rule.passed ? 'text-green-600' : 'text-muted-foreground'}>
                        {rule.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                确认密码
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={
                  confirmPassword && password !== confirmPassword
                    ? 'border-destructive focus-visible:ring-destructive'
                    : confirmPassword && password === confirmPassword
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : ''
                }
              />
              {confirmPassword && (
                <div className="flex items-center gap-1.5 text-xs">
                  {password === confirmPassword ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-green-600">密码匹配</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-destructive">密码不一致</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 text-sm">
              <input type="checkbox" required className="mt-1" />
              <span className="text-muted-foreground">
                我已阅读并同意{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  服务条款
                </Link>
                {' '}和{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  隐私政策
                </Link>
              </span>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isPasswordValid || (confirmPassword !== '' && password !== confirmPassword)}
            >
              {loading ? '注册中...' : '注册'}
            </Button>

            <div className="text-center text-sm">
              已有账号？{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                立即登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

