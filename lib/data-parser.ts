/**
 * 数据解析工具（仅客户端使用）
 * 支持CSV、Excel、JSON格式
 * 
 * ⚠️ 此文件只能在浏览器环境中使用，不能在服务端使用
 */

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// 检查是否在浏览器环境
if (typeof window === 'undefined') {
  throw new Error('data-parser.ts 只能在浏览器环境中使用')
}

export interface ParsedData {
  data: any[]
  columns: ColumnInfo[]
  rowCount: number
  columnCount: number
}

export interface ColumnInfo {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  nullable: boolean
  sample?: any[]
}

/**
 * 解析CSV文件
 */
export async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[]
          const { headers, dataRows } = detectHeaderAndRows(rows)
          const objects = rowsToObjects(headers, dataRows)
          const columns = detectColumns(objects)

          resolve({
            data: objects,
            columns,
            rowCount: objects.length,
            columnCount: columns.length,
          })
        } catch (e: any) {
          reject(new Error(`CSV解析失败: ${e.message}`))
        }
      },
      error: (error) => {
        reject(new Error(`CSV解析失败: ${error.message}`))
      },
    })
  })
}

/**
 * 解析Excel文件
 */
export async function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // 先读取为二维数组，灵活决定表头所在行
        const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as any[]
        const { headers, dataRows } = detectHeaderAndRows(aoa)
        const objects = rowsToObjects(headers, dataRows)
        const columns = detectColumns(objects)

        resolve({
          data: objects,
          columns,
          rowCount: objects.length,
          columnCount: columns.length,
        })
      } catch (error: any) {
        reject(new Error(`Excel解析失败: ${error.message}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsBinaryString(file)
  })
}

/**
 * 解析JSON文件
 */
export async function parseJSON(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const data = JSON.parse(text)
        
        // 如果是单个对象，转换为数组
        const arrayData = Array.isArray(data) ? data : [data]
        const columns = detectColumns(arrayData)
        
        resolve({
          data: arrayData,
          columns,
          rowCount: arrayData.length,
          columnCount: columns.length,
        })
      } catch (error: any) {
        reject(new Error(`JSON解析失败: ${error.message}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * 自动检测文件类型并解析
 */
export async function parseDataFile(file: File): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'csv':
      return parseCSV(file)
    case 'xlsx':
    case 'xls':
      return parseExcel(file)
    case 'json':
      return parseJSON(file)
    default:
      throw new Error(`不支持的文件格式: ${extension}`)
  }
}

/**
 * 检测数据列类型
 */
function detectColumns(data: any[]): ColumnInfo[] {
  if (data.length === 0) return []
  
  const firstRow = data[0]
  const columns: ColumnInfo[] = []
  
  for (const key in firstRow) {
    const values = data.map(row => row[key]).filter(v => v != null)
    const type = detectType(values)
    const nullable = data.some(row => row[key] == null)
    const sample = values.slice(0, 5)
    
    columns.push({
      name: key,
      type,
      nullable,
      sample,
    })
  }
  
  return columns
}

/**
 * 检测数据类型
 */
function detectType(values: any[]): ColumnInfo['type'] {
  if (values.length === 0) return 'string'
  
  const types = values.map(v => typeof v)
  const uniqueTypes = [...new Set(types)]
  
  // 如果全是数字
  if (uniqueTypes.length === 1 && uniqueTypes[0] === 'number') {
    return 'number'
  }
  
  // 如果全是布尔值
  if (uniqueTypes.length === 1 && uniqueTypes[0] === 'boolean') {
    return 'boolean'
  }
  
  // 检查是否为日期
  const datePattern = /^\d{4}-\d{2}-\d{2}/
  if (values.every(v => typeof v === 'string' && datePattern.test(v))) {
    return 'date'
  }
  
  return 'string'
}

/**
 * 将数据转换为CSV格式
 */
export function dataToCSV(data: any[]): string {
  return Papa.unparse(data)
}

/**
 * 数据统计
 */
export function getDataStats(data: any[], columns: ColumnInfo[]) {
  const stats: any = {}
  
  columns.forEach(col => {
    const values = data.map(row => row[col.name]).filter(v => v != null)
    
    stats[col.name] = {
      count: values.length,
      nullCount: data.length - values.length,
      unique: new Set(values).size,
    }
    
    if (col.type === 'number') {
      const numbers = values as number[]
      stats[col.name].min = Math.min(...numbers)
      stats[col.name].max = Math.max(...numbers)
      stats[col.name].avg = numbers.reduce((a, b) => a + b, 0) / numbers.length
    }
  })
  
  return stats
}

/**
 * 从二维数组中检测表头行：
 * 规则：选择第一个非空单元格数 ≥ 2 的行作为表头；
 * 如整行仅 1 个单元格（常见为表名），跳过。
 */
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
  // 规范化表头：空值 -> col_{index}；去除两端空白；重复名自动加序号
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

  // 数据从表头下一行开始
  const dataRows = aoa.slice(headerIndex + 1) as any[][]
  return { headers, dataRows }
}

/**
 * 将二维数组按 headers 转为对象数组
 */
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

