import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  Brain, 
  Database, 
  MessageSquare, 
  Sparkles,
  TrendingUp 
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* 头部导航 */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">AI数据分析平台</h1>
          </div>
          <div className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">登录</Button>
            </Link>
            <Link href="/auth/register">
              <Button>开始使用</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero区域 */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">基于Dify的智能分析引擎</span>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            让数据分析像聊天一样简单
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8">
            用自然语言提问，AI帮你分析数据、生成图表、发现洞察
            <br />
            支持PC端和移动端，随时随地进行数据分析
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="h-12 px-8">
                免费开始
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="h-12 px-8">
                了解更多
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">核心功能</h3>
          <p className="text-muted-foreground">强大的AI能力，极致的用户体验</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-primary mb-2" />
              <CardTitle>自然语言分析</CardTitle>
              <CardDescription>
                用日常对话的方式提问，AI理解你的意图并给出专业分析
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-10 w-10 text-primary mb-2" />
              <CardTitle>多格式支持</CardTitle>
              <CardDescription>
                支持CSV、Excel、JSON等多种数据格式，拖拽上传即可开始分析
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>智能可视化</CardTitle>
              <CardDescription>
                AI自动推荐最合适的图表类型，一键生成精美的数据可视化
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-primary mb-2" />
              <CardTitle>趋势洞察</CardTitle>
              <CardDescription>
                自动识别数据中的趋势、异常和关键洞察，帮你做出更好决策
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-primary mb-2" />
              <CardTitle>报告生成</CardTitle>
              <CardDescription>
                一键生成专业的数据分析报告，支持导出和分享
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-10 w-10 text-primary mb-2" />
              <CardTitle>持续学习</CardTitle>
              <CardDescription>
                基于Dify的AI能力，持续优化分析质量和准确度
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA区域 */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">准备好开始了吗？</h3>
            <p className="text-lg mb-8 opacity-90">
              立即注册，开启你的智能数据分析之旅
            </p>
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="h-12 px-8">
                免费注册
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* 页脚 */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2024 AI数据分析平台. 由 Dify 驱动.</p>
        </div>
      </footer>
    </div>
  )
}

