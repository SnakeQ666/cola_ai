/**
 * AI分析聊天API（流式响应）
 * 调用Dify进行数据分析，使用Server-Sent Events返回流式数据
 */

import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response(JSON.stringify({ error: '请先登录' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { message, conversationId, datasetId, analysisId } = body

    if (!message) {
      return new Response(JSON.stringify({ error: '请输入问题' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 如果有数据集ID，获取数据集信息
    let dataContext = ''
    if (datasetId) {
      const dataset = await db.dataset.findUnique({
        where: { id: datasetId },
      })

      if (dataset && dataset.userId === user.id) {
        const columns = dataset.columns as any[] || []
        dataContext = `
【数据集信息】
数据集名称: ${dataset.name}
行数: ${dataset.rowCount}
列数: ${dataset.columnCount}

【数据结构】
${columns.map(col => `- ${col.name} (${col.type})`).join('\n')}

【列样本数据】
${columns.map(col => `${col.name}: ${col.sample?.slice(0, 3).join(', ')}`).join('\n')}

`
      }
    }

    const fullQuery = dataContext ? `${dataContext}【用户问题】\n${message}` : message

    // 创建流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 调用 Dify API（流式）
          const apiKey = process.env.DIFY_API_KEY
          const baseURL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1'

          const response = await fetch(`${baseURL}/chat-messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: fullQuery,
              conversation_id: conversationId || undefined,
              user: user.id,
              inputs: {},
              response_mode: 'streaming',
            }),
          })

          if (!response.ok) {
            throw new Error('Dify API 调用失败')
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('无法读取响应流')
          }

          let fullAnswer = ''
          let finalConversationId = conversationId || ''
          let finalMessageId = ''

          // 读取流式数据
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  
                  if (data.event === 'message' || data.event === 'agent_message') {
                    // 发送增量内容
                    const content = data.answer || ''
                    fullAnswer += content
                    
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ 
                        type: 'content', 
                        content 
                      })}\n\n`)
                    )
                  } else if (data.event === 'message_end') {
                    finalConversationId = data.conversation_id
                    finalMessageId = data.id
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }

          // 保存到数据库
          if (analysisId && fullAnswer) {
            await db.analysis.update({
              where: { id: analysisId },
              data: {
                conversationId: finalConversationId,
                updatedAt: new Date(),
              },
            })

            await db.message.create({
              data: {
                role: 'user',
                content: message,
                analysisId,
              },
            })

            await db.message.create({
              data: {
                role: 'assistant',
                content: fullAnswer,
                analysisId,
                metadata: {
                  messageId: finalMessageId,
                },
              },
            })
          }

          // 发送完成信号
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'done',
              conversationId: finalConversationId,
              messageId: finalMessageId
            })}\n\n`)
          )

          controller.close()
        } catch (error: any) {
          console.error('流式响应错误:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error',
              error: error.message || '处理失败'
            })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('AI分析失败:', error)
    return new Response(JSON.stringify({ error: error.message || 'AI分析失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

