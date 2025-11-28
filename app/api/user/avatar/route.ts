/**
 * 用户头像上传API
 * 接收 FormData(file) 并上传到 OSS，更新用户头像URL
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { uploadFileToOSS, generateUploadPath } from '@/lib/aliyun-oss'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file') as any

    if (!file || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: '请选择要上传的图片' }, { status: 400 })
    }

    // 校验类型
    const accept = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!accept.includes((file as any).type)) {
      return NextResponse.json({ error: '仅支持 PNG/JPEG/GIF/WebP 图片' }, { status: 400 })
    }

    // 限制大小：2MB
    const maxSize = 2 * 1024 * 1024
    if ((file as any).size > maxSize) {
      return NextResponse.json({ error: '图片大小不能超过 2MB' }, { status: 400 })
    }

    const path = generateUploadPath(user.id, (file as any).name || 'avatar.png', 'avatar')
    const { url, key } = await uploadFileToOSS(file, path)

    const updated = await db.user.update({
      where: { id: user.id },
      data: { avatar: url },
      select: { id: true, avatar: true, name: true, email: true },
    })

    return NextResponse.json({ success: true, url, key, user: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '上传头像失败' }, { status: 500 })
  }
}


