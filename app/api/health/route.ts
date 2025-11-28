/**
 * 健康检查 API
 * 用于 SAE 健康检查和监控
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // 检查数据库连接
    await db.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'AI Data Analysis Platform',
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
    })
  } catch (error: any) {
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'AI Data Analysis Platform',
        version: process.env.npm_package_version || '1.0.0',
        database: 'disconnected',
        error: error.message,
      },
      { status: 503 }
    )
  }
}
