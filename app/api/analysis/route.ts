/**
 * 分析会话管理API
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

// 创建新的分析会话
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { title, datasetId } = body

    const analysis = await db.analysis.create({
      data: {
        title: title || '新的分析会话',
        userId: user.id,
        datasetId: datasetId || null,
        status: 'active',
      },
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
            rowCount: true,
            columnCount: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error: any) {
    console.error('创建分析会话失败:', error)
    return NextResponse.json(
      { error: '创建失败' },
      { status: 500 }
    )
  }
}

// 获取用户的分析会话列表
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'active'

    const analyses = await db.analysis.findMany({
      where: {
        userId: user.id,
        status,
      },
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      analyses,
    })
  } catch (error: any) {
    console.error('获取分析会话失败:', error)
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    )
  }
}

