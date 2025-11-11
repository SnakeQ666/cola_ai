/**
 * 可视化详情API
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

// 获取可视化详情
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const visualization = await db.visualization.findUnique({
      where: {
        id: params.id,
      },
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!visualization) {
      return NextResponse.json(
        { error: '可视化不存在' },
        { status: 404 }
      )
    }

    if (visualization.userId !== user.id) {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      visualization,
    })
  } catch (error: any) {
    console.error('获取可视化详情失败:', error)
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    )
  }
}

// 删除可视化
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const visualization = await db.visualization.findUnique({
      where: { id: params.id },
    })

    if (!visualization) {
      return NextResponse.json(
        { error: '可视化不存在' },
        { status: 404 }
      )
    }

    if (visualization.userId !== user.id) {
      return NextResponse.json(
        { error: '无权限删除' },
        { status: 403 }
      )
    }

    await db.visualization.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: '删除成功',
    })
  } catch (error: any) {
    console.error('删除可视化失败:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
}

// 更新可视化
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const visualization = await db.visualization.findUnique({
      where: { id: params.id },
    })

    if (!visualization) {
      return NextResponse.json(
        { error: '可视化不存在' },
        { status: 404 }
      )
    }

    if (visualization.userId !== user.id) {
      return NextResponse.json(
        { error: '无权限更新' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { title, description, config } = body

    const updated = await db.visualization.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(config && { config }),
      },
    })

    return NextResponse.json({
      success: true,
      visualization: updated,
    })
  } catch (error: any) {
    console.error('更新可视化失败:', error)
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    )
  }
}

