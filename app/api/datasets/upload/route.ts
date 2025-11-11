/**
 * 数据集上传API
 * 处理文件上传到OSS并保存到数据库
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { uploadFileToOSS, generateUploadPath } from '@/lib/aliyun-oss'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取上传的文件和元数据
    const formData = await req.formData()
    // 这里取到的对象在 Node 中不是浏览器 File，但具备 arrayBuffer() 方法
    const file = formData.get('file') as any
    const metadataStr = formData.get('metadata') as string
    
    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      )
    }

    if (!metadataStr) {
      return NextResponse.json(
        { error: '缺少文件元数据' },
        { status: 400 }
      )
    }

    const metadata = JSON.parse(metadataStr)

    // 验证文件类型
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExt)) {
      return NextResponse.json(
        { error: `不支持的文件格式。支持的格式：${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 验证文件大小（最大50MB）
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过50MB' },
        { status: 400 }
      )
    }

    // 上传文件到OSS
    console.log('上传文件到OSS:', file.name)
    const ossPath = generateUploadPath(user.id, file.name, 'dataset')
    const uploadResult = await uploadFileToOSS(file, ossPath)

    // 保存数据集信息到数据库
    console.log('保存数据集信息到数据库...')
    const dataset = await db.dataset.create({
      data: {
        name: file.name,
        description: `上传于 ${new Date().toLocaleString('zh-CN')}`,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        fileType: fileExt.replace('.', ''),
        rowCount: metadata.rowCount,
        columnCount: metadata.columnCount,
        columns: metadata.columns as any,
        status: 'ready',
        userId: user.id,
      },
    })

    console.log('数据集创建成功:', dataset.id)

    return NextResponse.json({
      success: true,
      message: '上传成功',
      dataset: {
        id: dataset.id,
        name: dataset.name,
        fileSize: dataset.fileSize,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        fileType: dataset.fileType,
        createdAt: dataset.createdAt,
      },
    })
  } catch (error: any) {
    console.error('上传失败:', error)
    return NextResponse.json(
      { error: error.message || '上传失败，请稍后重试' },
      { status: 500 }
    )
  }
}

