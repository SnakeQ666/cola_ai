'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Upload, Database, FileSpreadsheet, FileJson, Search, Loader2, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DataUpload } from '@/components/features/data-upload'
import { formatFileSize, formatDate } from '@/lib/utils'

interface Dataset {
  id: string
  name: string
  description: string | null
  fileSize: number
  fileType: string
  rowCount: number | null
  columnCount: number | null
  status: string
  createdAt: Date
}

export default function DatasetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 加载数据集列表
  useEffect(() => {
    if (status === 'authenticated') {
      loadDatasets()
    } else if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadDatasets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/datasets')
      const result = await response.json()
      
      if (result.success) {
        setDatasets(result.data)
      }
    } catch (error) {
      console.error('加载数据集失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = async (file: File) => {
    setUploadOpen(false)
    await loadDatasets()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个数据集吗？')) return

    try {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await loadDatasets()
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleView = (id: string) => {
    router.push(`/datasets/${id}`)
  }

  const filteredDatasets = datasets.filter(ds =>
    ds.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">数据集管理</h1>
          <p className="text-muted-foreground mt-1">
            管理您的数据文件，支持CSV、Excel、JSON格式
          </p>
        </div>
        
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="w-full lg:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              上传数据
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>上传数据集</DialogTitle>
            </DialogHeader>
            <DataUpload onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索数据集..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 数据集列表 */}
      {filteredDatasets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {datasets.length === 0 ? '暂无数据集' : '未找到匹配的数据集'}
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {datasets.length === 0 
                ? '上传您的第一个数据文件，开始使用AI进行数据分析'
                : '尝试其他搜索关键词'
              }
            </p>
            {datasets.length === 0 && (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                上传数据
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatasets.map((dataset) => (
            <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    dataset.status === 'ready' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {dataset.status === 'ready' ? '就绪' : '处理中'}
                  </span>
                </div>
                <CardTitle className="mt-4 truncate">{dataset.name}</CardTitle>
                <CardDescription>
                  {dataset.rowCount?.toLocaleString()} 行 · {dataset.columnCount} 列 · {formatFileSize(dataset.fileSize)}
                </CardDescription>
                <p className="text-xs text-muted-foreground">
                  {formatDate(dataset.createdAt)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleView(dataset.id)}
                  >
                    预览
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => router.push(`/analysis?datasetId=${dataset.id}`)}
                  >
                    分析
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(dataset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

