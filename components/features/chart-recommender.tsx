/**
 * AI图表推荐组件
 * 根据数据特征智能推荐合适的图表类型
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart,
  TrendingUp,
  Sparkles,
  Check,
} from 'lucide-react'

interface ChartRecommendation {
  type: string
  name: string
  icon: any
  description: string
  suitableFor: string[]
  confidence: number
}

interface ChartRecommenderProps {
  datasetId: string
  columns: Array<{
    name: string
    type: string
    sample?: any[]
  }>
  onSelect?: (chartType: string) => void
}

export function ChartRecommender({ datasetId, columns, onSelect }: ChartRecommenderProps) {
  const [selectedType, setSelectedType] = useState<string>('')
  const [generating, setGenerating] = useState(false)

  // 智能推荐图表类型
  const recommendations = analyzeDataAndRecommend(columns)

  const handleSelect = async (chartType: string) => {
    setSelectedType(chartType)
    if (onSelect) {
      onSelect(chartType)
    }
  }

  const handleGenerate = async () => {
    if (!selectedType) return

    setGenerating(true)
    try {
      const response = await fetch('/api/visualizations/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId,
          chartType: selectedType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      // 跳转到可视化详情页
      toast.success('图表生成成功，正在跳转...')
      window.location.href = `/visualizations/${data.visualization.id}`
    } catch (error: any) {
      console.error('生成图表失败:', error)
      toast.error(error.message || '无法生成图表，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI图表推荐
          </CardTitle>
          <CardDescription>
            基于您的数据特征，我们推荐以下图表类型
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => {
              const Icon = rec.icon
              const isSelected = selectedType === rec.type

              return (
                <Card
                  key={rec.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-primary ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelect(rec.type)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{rec.name}</h3>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            推荐度: {Math.round(rec.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          适用于: {rec.suitableFor.join(', ')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedType && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    生成中...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    生成图表
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 分析数据特征并推荐图表
 */
function analyzeDataAndRecommend(
  columns: Array<{ name: string; type: string; sample?: any[] }>
): ChartRecommendation[] {
  const numericColumns = columns.filter((col) => col.type === 'number')
  const dateColumns = columns.filter((col) => col.type === 'date')
  const textColumns = columns.filter((col) => col.type === 'text')

  const recommendations: ChartRecommendation[] = []

  // 柱状图 - 最通用
  recommendations.push({
    type: 'bar',
    name: '柱状图',
    icon: BarChart3,
    description: '直观展示不同类别的数据对比',
    suitableFor: ['类别对比', '排名展示', '多维度分析'],
    confidence: numericColumns.length > 0 && textColumns.length > 0 ? 0.9 : 0.7,
  })

  // 折线图 - 适合时间序列
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    recommendations.push({
      type: 'line',
      name: '折线图',
      icon: LineChart,
      description: '展示数据随时间的变化趋势',
      suitableFor: ['趋势分析', '时间序列', '连续变化'],
      confidence: 0.95,
    })
  } else {
    recommendations.push({
      type: 'line',
      name: '折线图',
      icon: LineChart,
      description: '展示数据的连续变化趋势',
      suitableFor: ['趋势分析', '连续数据'],
      confidence: 0.65,
    })
  }

  // 饼图 - 适合占比分析
  if (textColumns.length > 0 && numericColumns.length > 0) {
    recommendations.push({
      type: 'pie',
      name: '饼图',
      icon: PieChart,
      description: '展示各部分占整体的比例关系',
      suitableFor: ['占比分析', '结构展示', '分类统计'],
      confidence: 0.8,
    })
  }

  // 散点图 - 适合相关性分析
  if (numericColumns.length >= 2) {
    recommendations.push({
      type: 'scatter',
      name: '散点图',
      icon: ScatterChart,
      description: '展示两个变量之间的相关关系',
      suitableFor: ['相关性分析', '分布展示', '离群点检测'],
      confidence: 0.85,
    })
  }

  // 按推荐度排序
  return recommendations.sort((a, b) => b.confidence - a.confidence)
}

