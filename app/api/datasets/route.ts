/**
 * 数据集列表API
 * 获取当前用户的所有数据集
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    // 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取查询参数
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const skip = (page - 1) * pageSize

    // 查询数据集
    const [datasets, total] = await Promise.all([
      db.dataset.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          fileSize: true,
          fileType: true,
          rowCount: true,
          columnCount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.dataset.count({
        where: {
          userId: user.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: datasets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error: any) {
    console.error('获取数据集列表失败:', error)
    return NextResponse.json(
      { error: '获取数据集失败' },
      { status: 500 }
    )
  }
}

