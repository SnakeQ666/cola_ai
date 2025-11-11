/**
 * 可视化详情页面
 * 显示生成的图表
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Loader2, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册ECharts组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
])

interface Visualization {
  id: string
  title: string
  description: string | null
  chartType: string
  config: any
  createdAt: Date
  dataset: {
    id: string
    name: string
  }
}

export default function VisualizationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [visualization, setVisualization] = useState<Visualization | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVisualization()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const loadVisualization = async () => {
    try {
      setLoading(true)

      // 加载可视化配置
      const response = await fetch(`/api/visualizations/${params.id}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setVisualization(result.visualization)

      // 加载数据（如果有关联的数据集）
      if (result.visualization.dataset?.id) {
        await loadChartData(result.visualization.dataset.id)
      } else {
        console.warn('可视化没有关联的数据集')
        setChartData([])
        }
      } catch (error: any) {
        console.error('加载失败:', error)
        toast.error(error.message || '无法加载可视化图表')
        router.push('/visualizations')
      } finally {
        setLoading(false)
      }
    }

  const loadChartData = async (datasetId: string) => {
    try {
      // 直接从API获取解析好的数据（最多1000行用于可视化）
      const response = await fetch(`/api/datasets/${datasetId}/data?limit=1000`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      // API已经在服务端解析好了，直接使用
      setChartData(result.data)
      console.log('加载了', result.returned, '行数据，共', result.total, '行')
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这个可视化吗？')) return

    try {
      const response = await fetch(`/api/visualizations/${params.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      toast.success('可视化图表已删除')
      router.push('/visualizations')
    } catch (error: any) {
      console.error('删除失败:', error)
      toast.error(error.message || '无法删除可视化图表')
    }
  }

  const getChartOption = () => {
    if (!visualization || !chartData.length) return {}

    const { chartType, config } = visualization
    const chartConfig = config as any || {}

    // 使用保存的配置或使用默认值
    const xAxisField = chartConfig.xAxis || Object.keys(chartData[0])[0]
    const yAxisField = chartConfig.yAxis?.[0] || chartConfig.yAxis || Object.keys(chartData[0])[1]

    switch (chartType) {
      case 'bar':
        return {
          title: {
            text: chartConfig.title || visualization.title,
            subtext: chartConfig.description || visualization.description || '',
          },
          tooltip: {
            trigger: 'axis',
          },
          legend: {},
          xAxis: {
            type: 'category',
            data: chartData.slice(0, 20).map((item) => item[xAxisField]),
          },
          yAxis: {
            type: 'value',
          },
          series: [
            {
              name: yAxisField,
              type: 'bar',
              data: chartData.slice(0, 20).map((item) => item[yAxisField]),
            },
          ],
        }

      case 'line':
        return {
          title: {
            text: chartConfig.title || visualization.title,
            subtext: chartConfig.description || visualization.description || '',
          },
          tooltip: {
            trigger: 'axis',
          },
          xAxis: {
            type: 'category',
            data: chartData.slice(0, 20).map((item) => item[xAxisField]),
          },
          yAxis: {
            type: 'value',
          },
          series: [
            {
              name: yAxisField,
              type: 'line',
              data: chartData.slice(0, 20).map((item) => item[yAxisField]),
            },
          ],
        }

      case 'pie':
        // 饼图：按类别聚合数值
        const categoryField = chartConfig.seriesField || xAxisField
        const valueField = yAxisField
        
        const aggregated = chartData.reduce((acc, item) => {
          const key = String(item[categoryField])
          acc[key] = (acc[key] || 0) + (parseFloat(item[valueField]) || 0)
          return acc
        }, {} as Record<string, number>)

        return {
          title: {
            text: chartConfig.title || visualization.title,
            subtext: chartConfig.description || visualization.description || '',
          },
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
          },
          legend: {
            bottom: '5%',
          },
          series: [
            {
              name: valueField,
              type: 'pie',
              radius: '60%',
              data: Object.entries(aggregated)
                .slice(0, 10)
                .map(([name, value]) => ({ name, value })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
            },
          ],
        }

      case 'scatter':
        // 散点图：显示两个数值字段的关系
        const xField = xAxisField
        const yField = yAxisField
        
        return {
          title: {
            text: chartConfig.title || visualization.title,
            subtext: chartConfig.description || visualization.description || '',
          },
          tooltip: {
            formatter: (params: any) => {
              return `${xField}: ${params.value[0]}<br/>${yField}: ${params.value[1]}`
            }
          },
          xAxis: {
            name: xField,
            type: 'value',
          },
          yAxis: {
            name: yField,
            type: 'value',
          },
          series: [
            {
              name: `${xField} vs ${yField}`,
              type: 'scatter',
              symbolSize: 8,
              data: chartData.slice(0, 100).map((item) => [
                parseFloat(item[xField]) || 0,
                parseFloat(item[yField]) || 0,
              ]),
            },
          ],
        }

      default:
        return {}
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!visualization) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/visualizations')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{visualization.title}</h1>
            <p className="text-muted-foreground mt-1">
              {visualization.description || '数据可视化'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>
        </div>
      </div>

      {/* 数据集信息 */}
      <Card>
        <CardHeader>
          <CardTitle>数据集</CardTitle>
          <CardDescription>{visualization.dataset.name}</CardDescription>
        </CardHeader>
      </Card>

      {/* 图表 */}
      <Card>
        <CardContent className="p-6">
          {chartData.length > 0 ? (
            <ReactEChartsCore
              echarts={echarts}
              option={getChartOption()}
              style={{ height: '500px', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
            />
          ) : (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

