'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Database, 
  MessageSquare, 
  BarChart3, 
  TrendingUp,
  Upload,
  Sparkles,
  Loader2 
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  datasets: number
  analyses: number
  visualizations: number
  insights: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    datasets: 0,
    analyses: 0,
    visualizations: 0,
    insights: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()

      if (data.success && data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-8">
      {/* 欢迎区域 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">欢迎回来！</h1>
        <p className="text-muted-foreground">开始您的数据分析之旅</p>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/datasets">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="mt-4">上传数据</CardTitle>
              <CardDescription>
                上传CSV、Excel或JSON文件开始分析
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/analysis">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary" />
              <CardTitle className="mt-4">AI分析</CardTitle>
              <CardDescription>
                用自然语言与AI对话，获取数据洞察
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/visualizations">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary" />
              <CardTitle className="mt-4">创建图表</CardTitle>
              <CardDescription>
                生成精美的数据可视化图表
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据集</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.datasets}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.datasets === 0 ? '暂无数据集' : `${stats.datasets} 个数据集`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分析会话</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.analyses}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.analyses === 0 ? '暂无分析记录' : `${stats.analyses} 个活跃会话`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可视化</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.visualizations}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.visualizations === 0 ? '暂无图表' : `${stats.visualizations} 个图表`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据洞察</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.insights}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.insights === 0 ? '暂无洞察' : `${stats.insights} 条AI洞察`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快速入门指南 */}
      <Card>
        <CardHeader>
          <CardTitle>快速开始</CardTitle>
          <CardDescription>跟随这些步骤开始您的第一次数据分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">上传您的数据</h4>
              <p className="text-sm text-muted-foreground">
                支持CSV、Excel、JSON等格式，文件大小最大50MB
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">开始AI对话</h4>
              <p className="text-sm text-muted-foreground">
                用自然语言提问，例如分析销售趋势、找出异常数据
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">生成可视化</h4>
              <p className="text-sm text-muted-foreground">
                AI会自动推荐合适的图表类型，一键生成精美图表
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Link href="/datasets">
              <Button>立即开始</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

