'use client'

/**
 * 响应式布局组件
 * 支持PC端和移动端自适应
 */

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Menu,
  X,
  Home,
  Settings,
  User,
  Brain,
  TrendingUp,
  Zap,
} from 'lucide-react'

interface ResponsiveLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: '首页', href: '/', icon: Home },
  { name: 'AI现货交易', href: '/trading', icon: TrendingUp },
  { name: 'AI合约交易', href: '/futures', icon: Zap },
  { name: '设置', href: '/settings', icon: Settings },
]

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 - 移动端 */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-semibold">AI交易</span>
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* 移动端侧边菜单 */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background">
          <nav className="flex flex-col gap-2 p-4 pt-20">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
            
            <div className="border-t my-4" />
            
            <Link
              href="/settings/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-base text-muted-foreground hover:bg-accent"
            >
              <User className="h-5 w-5" />
              个人中心
            </Link>
          </nav>
        </div>
      )}

      <div className="flex">
        {/* PC端侧边栏 */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-background">
          <div className="flex items-center gap-2 h-16 px-6 border-b">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AI交易平台</span>
          </div>
          
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          <div className="border-t p-4">
            <Link
              href="/settings/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <User className="h-5 w-5" />
              个人中心
            </Link>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 lg:pl-64">
          <div className="container mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      
      {/* 为移动端底部导航留出空间 */}
      <div className="lg:hidden h-20" />
    </div>
  )
}

