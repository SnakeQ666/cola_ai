'use client'

/**
 * 数据集详情和预览页面
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Download, Loader2, Table, Sparkles } from 'lucide-react'
import { formatFileSize, formatDate } from '@/lib/utils'
import { ChartRecommender } from '@/components/features/chart-recommender'
import { toast } from 'sonner'

interface Dataset {
  id: string
  name: string
  description: string | null
  fileSize: number
  fileType: string
  rowCount: number | null
  columnCount: number | null
  columns: any
  status: string
  createdAt: Date
  downloadUrl: string
}

export default function DatasetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    loadDataset()
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const loadDataset = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/datasets/${params.id}`)
      const result = await response.json()

      if (result.success) {
        setDataset(result.dataset)
      } else {
        toast.error(result.error || '无法加载数据集')
        router.push('/datasets')
      }
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setDataLoading(true)
      
      // 直接从API获取预览数据（50行）
      const response = await fetch(`/api/datasets/${params.id}/data?preview=true`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      // API已经在服务端解析好了，直接使用
      setData(result.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const handleDownload = () => {
    if (dataset?.downloadUrl) {
      window.open(dataset.downloadUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!dataset) {
    return null
  }

  const columns = dataset.columns as any[] || []

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/datasets')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{dataset.name}</h1>
            <p className="text-muted-foreground mt-1">
              {dataset.description || '数据集详情'}
            </p>
          </div>
        </div>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          下载
        </Button>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>文件大小</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatFileSize(dataset.fileSize)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>数据行数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dataset.rowCount?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>列数</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dataset.columnCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>创建时间</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDate(dataset.createdAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 列信息 */}
      <Card>
        <CardHeader>
          <CardTitle>列信息</CardTitle>
          <CardDescription>数据集包含的列及其类型</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {columns.map((col: any, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded border">
                <Table className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{col.name}</p>
                  <p className="text-xs text-muted-foreground">{col.type}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 数据预览和图表推荐 */}
      <Tabs defaultValue="preview" className="w-full">
        <TabsList>
          <TabsTrigger value="preview">
            <Table className="h-4 w-4 mr-2" />
            数据预览
          </TabsTrigger>
          <TabsTrigger value="charts">
            <Sparkles className="h-4 w-4 mr-2" />
            AI图表推荐
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>数据预览</CardTitle>
              <CardDescription>前50行数据</CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : data.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {columns.map((col: any, index: number) => (
                          <th key={index} className="text-left p-2 font-medium whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row: any, rowIndex: number) => (
                        <tr key={rowIndex} className="border-b hover:bg-muted/50">
                          {columns.map((col: any, colIndex: number) => (
                            <td key={colIndex} className="p-2 whitespace-nowrap">
                              {row[col.name] != null ? String(row[col.name]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">暂无数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-4">
          <ChartRecommender datasetId={dataset.id} columns={columns} />
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Button
          onClick={() => router.push(`/analysis?datasetId=${dataset.id}`)}
          className="flex-1 md:flex-initial"
        >
          使用AI分析
        </Button>
       
      </div>
    </div>
  )
}

