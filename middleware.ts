/**
 * Next.js中间件
 * 用于处理认证、重定向等
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 公开路由（不需要认证）
const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/api/health',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查是否为公开路径
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // TODO: 实现实际的认证检查
  // const token = request.cookies.get('auth-token')
  // if (!token && !isPublicPath) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url))
  // }

  return NextResponse.next()
}

// 配置需要中间件处理的路径
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

