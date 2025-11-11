/**
 * AI对话聊天界面
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Send,
  Loader2,
  User,
  Bot,
  Sparkles,
  Database,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

interface AIChatProps {
  analysisId: string
  datasetId?: string
  datasetName?: string
  initialMessages?: Message[]
}

export function AIChat({
  analysisId,
  datasetId,
  datasetName,
  initialMessages = [],
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>()
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 检测用户是否在底部附近
  const isNearBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return true

    const threshold = 100 // 距离底部100px以内算作底部
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    return scrollHeight - scrollTop - clientHeight < threshold
  }

  // 监听滚动事件，检测用户是否手动滚动
  const handleScroll = () => {
    const nearBottom = isNearBottom()
    setIsUserScrolling(!nearBottom)
  }

  // 智能滚动：只有在底部时才自动滚动
  useEffect(() => {
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isUserScrolling])

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    // 发送新消息时，重置滚动状态，确保自动滚动
    setIsUserScrolling(false)

    // 创建一个临时的 AI 消息用于流式更新
    const aiMessageId = `ai-${Date.now()}`
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, aiMessage])

    try {
      const response = await fetch('/api/analysis/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          datasetId,
          analysisId,
        }),
      })

      if (!response.ok) {
        throw new Error('AI回复失败')
      }

      // 读取流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应')
      }

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'content') {
                // 更新消息内容（打字机效果）
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                )
              } else if (data.type === 'done') {
                // 更新会话ID
                if (data.conversationId) {
                  setConversationId(data.conversationId)
                }
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              console.error('解析流数据失败:', e)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('发送消息失败:', error)
      // 更新为错误消息
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: `抱歉，发生了错误：${error.message}` }
            : msg
        )
      )
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部数据集信息 */}
      {datasetName && (
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">当前数据集:</span>
          <span className="text-sm text-muted-foreground">{datasetName}</span>
        </div>
      )}

      {/* 消息列表 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 p-4 overflow-y-auto"
        onScroll={handleScroll}
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">开始AI数据分析</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                您可以询问关于数据的任何问题，AI会帮助您分析数据、发现洞察，并推荐合适的可视化方式。
              </p>
              {datasetName && (
                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium">试试这些问题：</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInput('这个数据集包含哪些信息？')}
                    >
                      这个数据集包含哪些信息？
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInput('帮我分析一下数据的整体趋势')}
                    >
                      帮我分析一下数据的整体趋势
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInput('用什么图表来可视化这些数据比较合适？')}
                    >
                      推荐合适的可视化图表
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <Card
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <CardContent className="p-3">
                    {message.role === 'assistant' && !message.content ? (
                      // AI 消息为空时，显示思考动画
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </CardContent>
                </Card>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-secondary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入框 */}
      <div className="border-t p-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                datasetName
                  ? '输入您的问题，Shift+Enter换行，Enter发送...'
                  : '请先选择一个数据集进行分析...'
              }
              disabled={loading || !datasetName}
              className="resize-none"
              rows={3}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading || !datasetName}
              size="icon"
              className="h-full aspect-square"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 提示: 您可以询问数据统计、趋势分析、异常检测、可视化推荐等问题
          </p>
        </div>
      </div>
    </div>
  )
}
