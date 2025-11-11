/**
 * Dashboard 统计数据API
 * 获取用户的统计数据概览
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 并行查询所有统计数据
    const [datasetsCount, analysesCount, visualizationsCount, messagesCount] = await Promise.all([
      // 数据集数量
      db.dataset.count({
        where: {
          userId: user.id,
          status: 'ready', // 只统计已就绪的数据集
        },
      }),
      // 分析会话数量
      db.analysis.count({
        where: {
          userId: user.id,
          status: 'active', // 只统计活跃的会话
        },
      }),
      // 可视化图表数量
      db.visualization.count({
        where: {
          userId: user.id,
        },
      }),
      // 消息总数（AI洞察数量）
      db.message.count({
        where: {
          analysis: {
            userId: user.id,
          },
          role: 'assistant', // 只统计AI回复
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        datasets: datasetsCount,
        analyses: analysesCount,
        visualizations: visualizationsCount,
        insights: messagesCount, // AI生成的洞察数量
      },
    })
  } catch (error: any) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

