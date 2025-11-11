/**
 * 获取数据集的数据
 * 在服务端下载、解析，直接返回数据数组
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { getSignedUrl } from '@/lib/aliyun-oss'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    // 获取查询参数
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '1000') // 默认最多返回1000行
    const preview = searchParams.get('preview') === 'true' // 是否只预览（50行）

    // 查询数据集
    const dataset = await db.dataset.findUnique({
      where: { id: params.id },
    })

    if (!dataset) {
      return NextResponse.json({ error: '数据集不存在' }, { status: 404 })
    }

    if (dataset.userId !== user.id) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 })
    }

    // 获取OSS文件签名URL
    const ossKey = dataset.fileUrl.split('.com/')[1]
    const signedUrl = await getSignedUrl(ossKey, 300) // 5分钟有效期

    // 在服务端下载和解析文件
    const fileResponse = await fetch(signedUrl)
    const fileBuffer = await fileResponse.arrayBuffer()
    
    let data: any[] = []
    const maxRows = preview ? 50 : limit

    // 根据文件类型解析
    if (dataset.fileType === 'csv') {
      const text = new TextDecoder().decode(fileBuffer)
      const result = Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: true,
      })
      const rows = result.data as any[]
      const { headers, dataRows } = detectHeaderAndRows(rows)
      const objects = rowsToObjects(headers, dataRows)
      data = objects.slice(0, maxRows)
    } else if (dataset.fileType === 'excel' || dataset.fileType === 'xlsx') {
      const workbook = XLSX.read(fileBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false }) as any[]
      const { headers, dataRows } = detectHeaderAndRows(aoa)
      const objects = rowsToObjects(headers, dataRows)
      data = objects.slice(0, maxRows)
    } else if (dataset.fileType === 'json') {
      const text = new TextDecoder().decode(fileBuffer)
      const jsonData = JSON.parse(text)
      data = Array.isArray(jsonData) ? jsonData.slice(0, maxRows) : [jsonData]
    }

    return NextResponse.json({
      success: true,
      data,
      columns: dataset.columns,
      total: dataset.rowCount,
      returned: data.length,
      fileType: dataset.fileType,
    })
  } catch (error: any) {
    console.error('获取数据失败:', error)
    return NextResponse.json(
      { error: error.message || '获取数据失败' },
      { status: 500 }
    )
  }
}

// 与前端解析保持一致的表头检测逻辑
function detectHeaderAndRows(aoa: any[]): { headers: string[]; dataRows: any[][] } {
  let headerIndex = 0
  for (let i = 0; i < aoa.length; i++) {
    const row = aoa[i] as any[]
    if (!row) continue
    const nonEmpty = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '')
    if (nonEmpty.length >= 2) {
      headerIndex = i
      break
    }
  }
  const rawHeaders = (aoa[headerIndex] || []) as any[]
  const headers: string[] = []
  const nameCount: Record<string, number> = {}
  rawHeaders.forEach((h, idx) => {
    let name = (h !== undefined && h !== null ? String(h) : '').trim()
    if (!name) name = `col_${idx + 1}`
    if (nameCount[name] !== undefined) {
      nameCount[name] += 1
      name = `${name}_${nameCount[name]}`
    } else {
      nameCount[name] = 0
    }
    headers.push(name)
  })
  const dataRows = aoa.slice(headerIndex + 1) as any[][]
  return { headers, dataRows }
}

function rowsToObjects(headers: string[], rows: any[][]): any[] {
  return rows
    .filter((r) => Array.isArray(r) && r.some((c) => c !== undefined && c !== null && String(c).trim() !== ''))
    .map((row) => {
      const obj: any = {}
      headers.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i] : null
      })
      return obj
    })
}

