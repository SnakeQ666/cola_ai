/**
 * 分析会话详情API
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

// 获取分析会话详情
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const analysis = await db.analysis.findUnique({
      where: {
        id: params.id,
      },
      include: {
        dataset: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!analysis) {
      return NextResponse.json(
        { error: '分析会话不存在' },
        { status: 404 }
      )
    }

    if (analysis.userId !== user.id) {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error: any) {
    console.error('获取分析详情失败:', error)
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    )
  }
}

// 删除分析会话
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const analysis = await db.analysis.findUnique({
      where: { id: params.id },
    })

    if (!analysis) {
      return NextResponse.json(
        { error: '分析会话不存在' },
        { status: 404 }
      )
    }

    if (analysis.userId !== user.id) {
      return NextResponse.json(
        { error: '无权限删除' },
        { status: 403 }
      )
    }

    // 删除关联的消息
    await db.message.deleteMany({
      where: { analysisId: params.id },
    })

    // 删除分析会话
    await db.analysis.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: '删除成功',
    })
  } catch (error: any) {
    console.error('删除分析会话失败:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
}

// 更新分析会话
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const analysis = await db.analysis.findUnique({
      where: { id: params.id },
    })

    if (!analysis) {
      return NextResponse.json(
        { error: '分析会话不存在' },
        { status: 404 }
      )
    }

    if (analysis.userId !== user.id) {
      return NextResponse.json(
        { error: '无权限更新' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { title, status } = body

    const updated = await db.analysis.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(status && { status }),
      },
    })

    return NextResponse.json({
      success: true,
      analysis: updated,
    })
  } catch (error: any) {
    console.error('更新分析会话失败:', error)
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    )
  }
}

