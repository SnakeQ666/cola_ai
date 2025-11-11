'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Plus, LineChart, PieChart, ScatterChart, Loader2 } from 'lucide-react'

interface Visualization {
  id: string
  title: string
  description: string | null
  chartType: string
  dataset?: {
    id: string
    name: string
  }
  createdAt: string
}

export default function VisualizationsPage() {
  const router = useRouter()
  const [visualizations, setVisualizations] = useState<Visualization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVisualizations()
  }, [])

  const loadVisualizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/visualizations')
      const result = await response.json()

      if (result.success && result.visualizations) {
        setVisualizations(result.visualizations)
      }
    } catch (error) {
      console.error('加载可视化列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">数据可视化</h1>
          <p className="text-muted-foreground mt-1">
            创建和管理您的数据图表
          </p>
        </div>
        <Button className="w-full lg:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          新建图表
        </Button>
      </div>

      {/* 图表列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : visualizations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无图表</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              从数据集页面开始，选择一个数据集，然后使用AI图表推荐功能创建您的第一个可视化图表
            </p>
            <Button onClick={() => router.push('/datasets')}>
              <Plus className="h-4 w-4 mr-2" />
              去上传数据集
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visualizations.map((viz) => {
            const getChartIcon = () => {
              switch (viz.chartType) {
                case 'line':
                  return <LineChart className="h-5 w-5" />
                case 'pie':
                  return <PieChart className="h-5 w-5" />
                case 'bar':
                  return <BarChart3 className="h-5 w-5" />
                case 'scatter':
                  return <ScatterChart className="h-5 w-5" />
                default:
                  return <BarChart3 className="h-5 w-5" />
              }
            }

            const getChartTypeText = () => {
              switch (viz.chartType) {
                case 'line':
                  return '折线图'
                case 'pie':
                  return '饼图'
                case 'bar':
                  return '柱状图'
                case 'scatter':
                  return '散点图'
                default:
                  return viz.chartType
              }
            }

            return (
              <Card
                key={viz.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/visualizations/${viz.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getChartIcon()}
                    {viz.title}
                  </CardTitle>
                  <CardDescription>
                    {getChartTypeText()}
                    {viz.dataset && ` • ${viz.dataset.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {viz.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {viz.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      创建于 {new Date(viz.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/visualizations/${viz.id}`)
                      }}
                    >
                      查看详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
