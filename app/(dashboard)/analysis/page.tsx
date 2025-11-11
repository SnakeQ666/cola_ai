/**
 * AI分析页面
 * 支持选择数据集进行AI对话分析
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AIChat } from '@/components/features/ai-chat'
import { toast } from 'sonner'
import {
  Sparkles,
  Database,
  Loader2,
  Plus,
  MessageSquare,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Dataset {
  id: string
  name: string
  rowCount: number
  columnCount: number
}

interface Analysis {
  id: string
  title: string
  datasetId: string | null
  createdAt: string
  updatedAt: string
  dataset?: {
    id: string
    name: string
  }
  _count: {
    messages: number
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

function AnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null)
  const [currentMessages, setCurrentMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  // 加载数据集和分析列表
  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监控 selectedDataset 状态变化（调试用）
  useEffect(() => {
    console.log('🎯 selectedDataset 变化:', selectedDataset)
  }, [selectedDataset])

  // 检查URL参数，自动创建分析会话
  useEffect(() => {
    const datasetId = searchParams.get('datasetId')
    
    console.log('🔍 URL参数检查:', {
      datasetId,
      loading,
      datasetsCount: datasets.length,
      analysesCount: analyses.length,
      creating
    })
    
    if (datasetId && !loading && datasets.length > 0 && !creating) {
      // 检查是否已经有该数据集的分析会话
      const existingAnalysis = analyses.find(a => a.datasetId === datasetId)
      
      if (existingAnalysis) {
        // 如果已存在，直接选中
        console.log('✅ 找到已有会话，自动选中:', {
          title: existingAnalysis.title,
          datasetId: datasetId
        })
        setCurrentAnalysis(existingAnalysis)
        setSelectedDataset(datasetId)
        console.log('📝 设置 selectedDataset 为:', datasetId)
        
        // 加载该会话的消息列表
        loadAnalysisMessages(existingAnalysis.id)
        
        // 延迟清除URL参数，确保状态已更新
        setTimeout(() => {
          console.log('🧹 清除URL参数')
          router.replace('/analysis', { scroll: false })
        }, 100)
      } else {
        // 如果不存在，自动创建
        console.log('🔄 未找到会话，开始创建...', datasetId)
        autoCreateAnalysis(datasetId)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, datasets.length, analyses.length, creating])

  const loadData = async () => {
    try {
      setLoading(true)
      const [datasetsRes, analysesRes] = await Promise.all([
        fetch('/api/datasets'),
        fetch('/api/analysis'),
      ])

      const datasetsData = await datasetsRes.json()
      const analysesData = await analysesRes.json()

      if (datasetsData.success && datasetsData.data) {
        setDatasets(datasetsData.data)
      } else {
        setDatasets([])
      }

      if (analysesData.success && analysesData.analyses) {
        setAnalyses(analysesData.analyses)
        
        // 只在没有URL参数时，才自动选择最新的分析
        const hasDatasetParam = searchParams.get('datasetId')
        console.log('📚 加载分析列表:', {
          count: analysesData.analyses.length,
          hasDatasetParam,
          willAutoSelect: !hasDatasetParam && analysesData.analyses.length > 0
        })
        
        if (!hasDatasetParam && analysesData.analyses.length > 0) {
          console.log('🎯 自动选中第一个分析:', {
            title: analysesData.analyses[0].title,
            datasetId: analysesData.analyses[0].datasetId
          })
          setCurrentAnalysis(analysesData.analyses[0])
          if (analysesData.analyses[0].datasetId) {
            setSelectedDataset(analysesData.analyses[0].datasetId)
          }
        }
      } else {
        setAnalyses([])
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      setDatasets([])
      setAnalyses([])
    } finally {
      setLoading(false)
    }
  }

  // 加载分析会话的消息列表
  const loadAnalysisMessages = async (analysisId: string) => {
    try {
      setLoadingMessages(true)
      console.log('📨 开始加载消息列表:', analysisId)
      
      const response = await fetch(`/api/analysis/${analysisId}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      const messages = result.analysis.messages || []
      setCurrentMessages(messages)
      console.log('✅ 消息加载成功，共', messages.length, '条')
    } catch (error: any) {
      console.error('❌ 加载消息失败:', error)
      setCurrentMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  // 自动创建分析会话（从URL参数触发）
  const autoCreateAnalysis = async (datasetId: string) => {
    try {
      setCreating(true)
      const dataset = datasets?.find((d) => d.id === datasetId)
      
      if (!dataset) {
        console.error('❌ 数据集不存在')
        setTimeout(() => {
          router.replace('/analysis', { scroll: false })
        }, 100)
        return
      }

      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `分析 - ${dataset.name}`,
          datasetId: datasetId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      // 设置当前分析和选中的数据集
      setCurrentAnalysis(data.analysis)
      setSelectedDataset(datasetId)
      setAnalyses((prev) => [data.analysis, ...prev])
      
      // 新会话，清空消息列表
      setCurrentMessages([])
      
      console.log('✅ 自动创建分析会话成功:', dataset.name)
      console.log('📊 数据集ID:', datasetId)
      
      // 延迟清除URL参数，确保状态已更新
      setTimeout(() => {
        router.replace('/analysis', { scroll: false })
      }, 100)
    } catch (error: any) {
      console.error('❌ 自动创建分析失败:', error)
      setTimeout(() => {
        router.replace('/analysis', { scroll: false })
      }, 100)
    } finally {
      setCreating(false)
    }
  }

  // 手动创建新的分析会话
  const handleCreateAnalysis = async () => {
    if (!selectedDataset) {
      toast.warning('请先选择一个数据集')
      return
    }

    try {
      setCreating(true)
      const dataset = datasets?.find((d) => d.id === selectedDataset)
      
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `分析 - ${dataset?.name || '未命名'}`,
          datasetId: selectedDataset,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setCurrentAnalysis(data.analysis)
      setAnalyses((prev) => [data.analysis, ...prev])
      
      // 新会话，清空消息列表
      setCurrentMessages([])
      
      console.log('✅ 手动创建分析成功:', dataset?.name)
      toast.success(`已创建分析会话：${dataset?.name}`)
    } catch (error: any) {
      console.error('创建分析失败:', error)
      toast.error(error.message || '创建失败，请稍后重试')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4">
      {/* 左侧边栏 */}
      <Card className="w-80 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            分析会话
          </CardTitle>
          <CardDescription>选择或创建新的分析会话</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* 数据集选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择数据集</label>
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger>
                <SelectValue placeholder="选择数据集..." />
              </SelectTrigger>
              <SelectContent>
                {!datasets || datasets.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    暂无数据集
                  </div>
                ) : (
                  datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>{dataset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({dataset.rowCount}行)
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 创建新会话按钮 */}
          <Button
            onClick={handleCreateAnalysis}
            disabled={!selectedDataset || creating}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                创建新分析
              </>
            )}
          </Button>

          {/* 分析历史列表 */}
          <div className="flex-1 overflow-y-auto space-y-2">
            <label className="text-sm font-medium">历史会话</label>
            {!analyses || analyses.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                暂无分析历史
              </div>
            ) : (
              analyses.map((analysis) => (
                <Card
                  key={analysis.id}
                  className={`cursor-pointer hover:bg-accent transition-colors ${
                    currentAnalysis?.id === analysis.id ? 'border-primary' : ''
                  }`}
                  onClick={() => {
                    console.log('🎯 选中分析会话:', analysis.title)
                    setCurrentAnalysis(analysis)
                    if (analysis.datasetId) {
                      setSelectedDataset(analysis.datasetId)
                    }
                    // 加载该会话的消息列表
                    loadAnalysisMessages(analysis.id)
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {analysis.title}
                        </p>
                        {analysis.dataset && (
                          <p className="text-xs text-muted-foreground truncate">
                            {analysis.dataset.name}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {analysis._count?.messages || 0}条
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(analysis.updatedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 右侧聊天区域 */}
      <Card className="flex-1 flex flex-col">
        {currentAnalysis ? (
          loadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AIChat
              key={currentAnalysis.id}
              analysisId={currentAnalysis.id}
              datasetId={currentAnalysis.datasetId || undefined}
              datasetName={currentAnalysis.dataset?.name}
              initialMessages={currentMessages.map(msg => ({
                ...msg,
                createdAt: new Date(msg.createdAt)
              }))}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">AI数据分析助手</h2>
              <p className="text-muted-foreground">
                选择一个数据集，创建新的分析会话，开始与AI对话来分析您的数据
              </p>
              {(!datasets || datasets.length === 0) && (
                <Button onClick={() => router.push('/datasets')}>
                  <Database className="h-4 w-4 mr-2" />
                  去上传数据集
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AnalysisPageContent />
    </Suspense>
  )
}
