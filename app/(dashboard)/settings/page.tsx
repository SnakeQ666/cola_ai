'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar: string | null
  emailVerified: Date | null
  createdAt: string
  updatedAt: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 加载用户信息
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/profile')
      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setName(data.user.name || '')
        setAvatar(data.user.avatar || '')
      } else {
        toast.error(data.error || '加载用户信息失败')
      }
    } catch (error) {
      toast.error('加载用户信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 更新用户信息
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error('请输入姓名')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          avatar: avatar.trim() || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        toast.success('个人信息更新成功')
      } else {
        toast.error(data.error || '更新失败')
      }
    } catch (error) {
      toast.error('更新失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  // 上传头像
  const handleUploadAvatar = async (fileParam?: File) => {
    const selected = fileParam || avatarFile
    if (!selected) {
      toast.error('请先选择图片文件')
      return
    }

    try {
      setUploadingAvatar(true)
      const form = new FormData()
      form.append('file', selected)

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: form,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '上传失败')
      }

      setAvatar(data.url)
      setUser((prev) => (prev ? { ...prev, avatar: data.url } as UserProfile : prev))
      toast.success('头像上传成功')
    } catch (e: any) {
      toast.error(e.message || '头像上传失败')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // 退出登录
  const handleLogout = async () => {
    try {
      await signOut({ redirect: false })
      toast.success('已退出登录')
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      toast.error('退出登录失败')
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground mt-1">
          管理您的账户和应用设置
        </p>
      </div>

      {/* 个人信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>个人信息</CardTitle>
          </div>
          <CardDescription>更新您的个人资料</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 头像预览与上传 */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">无头像</span>
              )}
            </div>
            <div className="space-y-2">
              {/* 使用组件化上传：隐藏 input + Button 触发 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setAvatarFile(f)
                  if (f) {
                    // 选择后自动上传
                    void handleUploadAvatar(f)
                  }
                }}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    '修改头像'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">支持 PNG/JPEG/GIF/WebP，最大 2MB。选择后将自动上传并更新头像</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">姓名</label>
            <Input
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">邮箱</label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              邮箱地址不可修改
            </p>
          </div>
          {/* 移除头像URL手动输入 */}
          <Button
            onClick={handleUpdateProfile}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存更改'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 账户操作 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            <CardTitle>账户操作</CardTitle>
          </div>
          <CardDescription>管理您的账户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">退出登录</p>
              <p className="text-sm text-muted-foreground">退出当前账户，返回登录页面</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

