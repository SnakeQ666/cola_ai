'use client'

/**
 * 图表渲染组件
 * 使用ECharts渲染各种类型的数据图表
 */

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface ChartRendererProps {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area'
  data: any
  config?: any
  className?: string
}

export function ChartRenderer({ type, data, config, className }: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // 生成图表配置
    const option = generateChartOption(type, data, config)
    chartInstance.current.setOption(option)

    // 响应式
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [type, data, config])

  // 清理
  useEffect(() => {
    return () => {
      chartInstance.current?.dispose()
    }
  }, [])

  return (
    <div 
      ref={chartRef} 
      className={className}
      style={{ width: '100%', height: '400px' }}
    />
  )
}

// 生成图表配置
function generateChartOption(type: string, data: any, customConfig?: any) {
  const baseOption = {
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    tooltip: {
      trigger: type === 'pie' ? 'item' : 'axis',
      confine: true,
    },
    ...customConfig,
  }

  switch (type) {
    case 'line':
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: data.xAxis || [],
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
        },
        series: [{
          data: data.series || [],
          type: 'line',
          smooth: true,
          areaStyle: {},
        }],
      }

    case 'bar':
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: data.xAxis || [],
        },
        yAxis: {
          type: 'value',
        },
        series: [{
          data: data.series || [],
          type: 'bar',
        }],
      }

    case 'pie':
      return {
        ...baseOption,
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        series: [{
          name: data.name || '数据',
          type: 'pie',
          radius: '50%',
          data: data.series || [],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }],
      }

    case 'scatter':
      return {
        ...baseOption,
        xAxis: {
          type: 'value',
        },
        yAxis: {
          type: 'value',
        },
        series: [{
          data: data.series || [],
          type: 'scatter',
          symbolSize: 10,
        }],
      }

    default:
      return baseOption
  }
}

