/**
 * AI智能图表生成API
 * 基于AI推荐生成可视化配置
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { getDifyClient } from '@/lib/dify'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { datasetId, chartType, title, description, config } = body

    if (!datasetId) {
      return NextResponse.json(
        { error: '缺少数据集ID' },
        { status: 400 }
      )
    }

    // 获取数据集信息
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId },
    })

    if (!dataset || dataset.userId !== user.id) {
      return NextResponse.json(
        { error: '数据集不存在或无权限' },
        { status: 404 }
      )
    }

    // 如果没有提供配置，使用AI生成推荐配置
    let finalConfig = config
    if (!finalConfig && chartType) {
      const dify = getDifyClient()
      
      const columns = dataset.columns as any[] || []
      const prompt = `
请为以下数据集推荐${chartType}图表的最佳配置：

数据集: ${dataset.name}
列信息:
${columns.map(col => `- ${col.name} (${col.type}): ${col.sample?.slice(0, 3).join(', ')}`).join('\n')}

请返回JSON格式的图表配置，包括：
- xAxis: X轴字段名
- yAxis: Y轴字段名（可以是数组）
- seriesField: 系列字段（如果需要分组）
- title: 图表标题建议
- description: 图表描述

只返回JSON，不要其他文字。
`

      const response = await dify.chatCompletion({
        query: prompt,
        user: user.id,
      })

      try {
        // 尝试从AI回复中提取JSON
        const jsonMatch = response.answer.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          finalConfig = JSON.parse(jsonMatch[0])
        } else {
          finalConfig = { auto: true }
        }
      } catch (e) {
        console.error('解析AI推荐配置失败:', e)
        finalConfig = { auto: true }
      }
    }

    // 创建可视化记录
    const visualization = await db.visualization.create({
      data: {
      title: title || finalConfig?.title || `${chartType} - ${dataset.name}`,
      description: description || finalConfig?.description || '',
      chartType: chartType || 'bar',
      config: finalConfig || {},
      data: undefined, // 图表数据将在前端动态加载
      userId: user.id,
      datasetId,
      },
    })

    return NextResponse.json({
      success: true,
      visualization,
    })
  } catch (error: any) {
    console.error('生成图表失败:', error)
    return NextResponse.json(
      { error: error.message || '生成失败' },
      { status: 500 }
    )
  }
}

