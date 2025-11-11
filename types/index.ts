/**
 * 全局类型定义
 */

// 用户类型
export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  createdAt: Date
  updatedAt: Date
}

// 数据集类型
export interface Dataset {
  id: string
  name: string
  description: string | null
  fileUrl: string
  fileSize: number
  fileType: string
  rowCount: number | null
  columnCount: number | null
  columns: ColumnInfo[] | null
  status: 'processing' | 'ready' | 'error'
  userId: string
  createdAt: Date
  updatedAt: Date
}

// 列信息
export interface ColumnInfo {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  nullable: boolean
  sample?: any[]
}

// AI分析会话
export interface Analysis {
  id: string
  title: string
  conversationId: string | null
  status: 'active' | 'archived'
  datasetId: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  messages?: Message[]
}

// 消息类型
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: any
  analysisId: string
  createdAt: Date
}

// 可视化图表
export interface Visualization {
  id: string
  title: string
  description: string | null
  chartType: ChartType
  config: any
  data: any
  analysisId: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
}

// 图表类型
export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'radar' | 'heatmap'

// API响应
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}

// 分页参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 上传文件响应
export interface UploadResponse {
  url: string
  key: string
  size: number
}

// Dify聊天响应
export interface DifyChatResponse {
  answer: string
  conversationId: string
  messageId: string
  metadata?: any
}

// 数据分析请求
export interface AnalysisRequest {
  datasetId: string
  query: string
  conversationId?: string
}

// 图表配置
export interface ChartConfig {
  title?: string
  legend?: boolean
  grid?: {
    left?: string | number
    right?: string | number
    top?: string | number
    bottom?: string | number
  }
  colors?: string[]
}

