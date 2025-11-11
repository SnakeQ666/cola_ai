/**
 * 数据集详情API
 * 获取单个数据集的详细信息
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { getSignedUrl } from '@/lib/aliyun-oss'
import axios from 'axios'
import { parseDataFile } from '@/lib/data-parser'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 查询数据集
    const dataset = await db.dataset.findUnique({
      where: {
        id: params.id,
      },
    })

    if (!dataset) {
      return NextResponse.json(
        { error: '数据集不存在' },
        { status: 404 }
      )
    }

    // 检查权限
    if (dataset.userId !== user.id) {
      return NextResponse.json(
        { error: '无权访问此数据集' },
        { status: 403 }
      )
    }

    // 获取OSS文件的临时访问链接
    const signedUrl = await getSignedUrl(dataset.fileUrl.split('.com/')[1], 3600)

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        fileSize: dataset.fileSize,
        fileType: dataset.fileType,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        columns: dataset.columns,
        status: dataset.status,
        createdAt: dataset.createdAt,
        updatedAt: dataset.updatedAt,
        downloadUrl: signedUrl,
      },
    })
  } catch (error: any) {
    console.error('获取数据集详情失败:', error)
    return NextResponse.json(
      { error: '获取数据集失败' },
      { status: 500 }
    )
  }
}

// 删除数据集
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const dataset = await db.dataset.findUnique({
      where: { id: params.id },
    })

    if (!dataset) {
      return NextResponse.json(
        { error: '数据集不存在' },
        { status: 404 }
      )
    }

    if (dataset.userId !== user.id) {
      return NextResponse.json(
        { error: '无权删除此数据集' },
        { status: 403 }
      )
    }

    // 从数据库删除
    await db.dataset.delete({
      where: { id: params.id },
    })

    // TODO: 从OSS删除文件
    // await deleteFileFromOSS(dataset.fileUrl)

    return NextResponse.json({
      success: true,
      message: '删除成功',
    })
  } catch (error: any) {
    console.error('删除数据集失败:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
}

