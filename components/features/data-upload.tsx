'use client'

/**
 * 数据上传组件
 * 支持拖拽上传和点击上传
 */

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'

interface DataUploadProps {
  onUploadComplete?: (file: File) => void
  maxSize?: number // 字节
  acceptedFormats?: string[]
}

export function DataUpload({ 
  onUploadComplete,
  maxSize = 50 * 1024 * 1024, // 默认50MB
  acceptedFormats = ['.csv', '.xlsx', '.xls', '.json']
}: DataUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
    },
    maxSize,
    multiple: false,
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    try {
      // 1. 先在客户端解析文件
      console.log('解析文件:', selectedFile.name)
      const { parseDataFile } = await import('@/lib/data-parser')
      const parsedData = await parseDataFile(selectedFile)

      if (parsedData.rowCount === 0) {
        throw new Error('文件中没有数据')
      }

      // 2. 创建FormData，包含文件和元数据
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('metadata', JSON.stringify({
        rowCount: parsedData.rowCount,
        columnCount: parsedData.columnCount,
        columns: parsedData.columns,
      }))

      // 3. 上传到API
      console.log('上传到服务器...')
      const response = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '上传失败')
      }

      // 上传成功
      console.log('上传成功!')
      onUploadComplete?.(selectedFile)
      setSelectedFile(null)
      toast.success(`文件 ${selectedFile?.name} 已成功上传`)
    } catch (error: any) {
      console.error('上传失败:', error)
      toast.error(error.message || '上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <Card
          {...getRootProps()}
          className={`border-2 border-dashed cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <input {...getInputProps()} />
            <Upload className={`h-12 w-12 mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            
            {isDragActive ? (
              <p className="text-lg font-medium text-primary">释放文件以上传</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">拖拽文件到这里或点击上传</p>
                <p className="text-sm text-muted-foreground mb-4">
                  支持 {acceptedFormats.join(', ')} 格式
                </p>
                <p className="text-xs text-muted-foreground">
                  最大文件大小: {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <FileSpreadsheet className="h-10 w-10 text-primary flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        开始上传
                      </>
                    )}
                  </Button>
                  
                  {!uploading && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFile(null)}
                    >
                      取消
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

