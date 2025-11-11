/**
 * Dify API客户端
 * 用于与Dify平台进行交互
 */

import axios, { AxiosInstance } from 'axios'

interface DifyChatResponse {
  answer: string
  conversationId: string
  messageId: string
  metadata?: {
    usage?: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
  }
}

interface DifyWorkflowResponse {
  taskId: string
  workflowRunId: string
  data: {
    outputs?: any
  }
}

class DifyClient {
  private client: AxiosInstance
  private apiKey: string

  constructor() {
    const apiKey = process.env.DIFY_API_KEY
    const baseURL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1'

    if (!apiKey) {
      throw new Error('DIFY_API_KEY 环境变量未设置')
    }

    this.apiKey = apiKey
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60秒超时
    })
  }

  /**
   * 聊天补全（Chat Agent）
   */
  async chatCompletion(params: {
    query: string
    conversationId?: string
    user: string
    inputs?: Record<string, any>
  }): Promise<DifyChatResponse> {
    try {
      const response = await this.client.post('/chat-messages', {
        query: params.query,
        conversation_id: params.conversationId,
        user: params.user,
        inputs: params.inputs || {},
        response_mode: 'blocking', // 阻塞模式，等待完整响应
      })

      return {
        answer: response.data.answer,
        conversationId: response.data.conversation_id,
        messageId: response.data.message_id,
        metadata: response.data.metadata,
      }
    } catch (error: any) {
      console.error('Dify Chat API 调用失败:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'AI服务暂时不可用，请稍后重试')
    }
  }

  /**
   * 流式聊天（可选，用于实时响应）
   */
  async chatCompletionStream(params: {
    query: string
    conversationId?: string
    user: string
    inputs?: Record<string, any>
    onMessage?: (chunk: string) => void
  }): Promise<DifyChatResponse> {
    try {
      const response = await this.client.post(
        '/chat-messages',
        {
          query: params.query,
          conversation_id: params.conversationId,
          user: params.user,
          inputs: params.inputs || {},
          response_mode: 'streaming',
        },
        {
          responseType: 'stream',
        }
      )

      let answer = ''
      let conversationId = ''
      let messageId = ''

      // 处理流式响应
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.event === 'message') {
                answer += data.answer
                if (params.onMessage) {
                  params.onMessage(data.answer)
                }
              } else if (data.event === 'message_end') {
                conversationId = data.conversation_id
                messageId = data.message_id
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      })

      return new Promise((resolve, reject) => {
        response.data.on('end', () => {
          resolve({
            answer,
            conversationId,
            messageId,
          })
        })
        response.data.on('error', reject)
      })
    } catch (error: any) {
      console.error('Dify 流式聊天失败:', error)
      throw new Error('AI服务暂时不可用，请稍后重试')
    }
  }

  /**
   * 工作流执行
   */
  async runWorkflow(params: {
    inputs: Record<string, any>
    user: string
  }): Promise<DifyWorkflowResponse> {
    try {
      const response = await this.client.post('/workflows/run', {
        inputs: params.inputs,
        user: params.user,
        response_mode: 'blocking',
      })

      return {
        taskId: response.data.task_id,
        workflowRunId: response.data.workflow_run_id,
        data: response.data.data,
      }
    } catch (error: any) {
      console.error('Dify Workflow API 调用失败:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'AI服务暂时不可用，请稍后重试')
    }
  }

  /**
   * 获取会话历史
   */
  async getConversationHistory(params: {
    conversationId: string
    user: string
    limit?: number
  }) {
    try {
      const response = await this.client.get('/messages', {
        params: {
          conversation_id: params.conversationId,
          user: params.user,
          limit: params.limit || 20,
        },
      })

      return response.data
    } catch (error: any) {
      console.error('获取会话历史失败:', error)
      throw new Error('获取会话历史失败')
    }
  }
}

// 导出单例
let difyClient: DifyClient | null = null

export function getDifyClient(): DifyClient {
  if (!difyClient) {
    difyClient = new DifyClient()
  }
  return difyClient
}

export type { DifyChatResponse, DifyWorkflowResponse }
