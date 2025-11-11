/**
 * Session相关工具函数
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * 获取当前登录用户（服务端）
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

/**
 * 要求用户必须登录
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('未登录')
  }
  
  return user
}

