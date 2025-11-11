# AI数据分析平台

基于 **Next.js + React + Dify** 的智能数据分析平台，支持PC端和移动端，部署在阿里云Serverless架构上。

## ✨ 核心特性

- 🤖 **AI驱动分析** - 基于Dify的自然语言交互式数据分析
- 📊 **智能可视化** - 自动推荐图表类型，一键生成精美图表
- 📱 **全端适配** - 完美支持PC和移动端响应式设计
- ☁️ **云原生架构** - 部署在阿里云SAE，自动扩缩容
- 🔒 **安全可靠** - 数据存储在阿里云OSS，支持加密传输

## 🛠 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **UI库**: React 18 + Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **数据请求**: TanStack Query
- **图表**: ECharts
- **语言**: TypeScript

### 后端
- **API**: Next.js API Routes
- **数据库**: PostgreSQL (阿里云RDS)
- **ORM**: Prisma
- **存储**: 阿里云OSS
- **AI**: Dify API

### 部署
- **计算**: 阿里云SAE (Serverless应用引擎)
- **容器**: Docker
- **CDN**: 阿里云CDN
- **监控**: 阿里云SLS日志服务

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm/yarn/pnpm
- Docker (用于本地测试和部署)
- 阿里云账号 (生产环境)

### 本地开发

1. **克隆项目**

```bash
cd "innovation program"
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

复制 `.env.example` 并重命名为 `.env`，填写以下配置：

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/ai_analysis

# 认证
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Dify API
DIFY_API_KEY=app-xxxxxxxxxxxxx
DIFY_API_BASE_URL=https://api.dify.ai/v1

# 阿里云OSS
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
```

4. **初始化数据库**

```bash
npx prisma generate
npx prisma db push
```

5. **启动开发服务器**

```bash
npm run dev
```

访问 http://localhost:3000

## 📦 构建和部署

### Docker本地测试

```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run
```

### 部署到阿里云SAE

1. **配置阿里云CLI**

```bash
# 安装CLI
brew install aliyun-cli  # macOS
# 或参考: https://help.aliyun.com/document_detail/110244.html

# 配置凭证
aliyun configure
```

2. **创建必要的阿里云资源**

- RDS PostgreSQL实例
- OSS Bucket
- 容器镜像仓库
- SAE应用

3. **修改部署脚本**

编辑 `scripts/deploy-sae.sh`，填写您的配置：

```bash
REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="your-namespace"
APP_ID="your-sae-app-id"
```

4. **执行部署**

```bash
chmod +x scripts/deploy-sae.sh
./scripts/deploy-sae.sh
```

## 📁 项目结构

```
innovation program/
├── .aliyun/              # 阿里云配置
│   └── sae-config.yaml  # SAE部署配置
├── app/                  # Next.js应用
│   ├── (auth)/          # 认证页面
│   ├── (dashboard)/     # 主应用页面
│   ├── api/             # API路由
│   ├── globals.css      # 全局样式
│   ├── layout.tsx       # 根布局
│   └── page.tsx         # 首页
├── components/           # React组件
│   ├── ui/              # 基础UI组件
│   ├── layouts/         # 布局组件
│   └── features/        # 功能组件
├── lib/                  # 工具库
│   ├── aliyun-oss.ts    # OSS集成
│   ├── dify.ts          # Dify API
│   ├── db.ts            # 数据库
│   └── utils.ts         # 工具函数
├── prisma/               # 数据库Schema
│   └── schema.prisma
├── scripts/              # 部署脚本
│   ├── deploy-sae.sh
│   └── build-docker.sh
├── Dockerfile            # Docker配置
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 核心功能

### 1. 数据管理
- 上传CSV、Excel、JSON文件
- 数据预览和编辑
- 数据清洗和预处理

### 2. AI分析
- 自然语言提问
- 智能数据分析
- 趋势识别和异常检测
- 自动生成分析报告

### 3. 数据可视化
- 多种图表类型（折线图、柱状图、饼图等）
- AI推荐最佳图表
- 图表导出和分享
- 响应式图表设计

### 4. 用户系统
- 邮箱注册/登录
- 个人中心
- 数据安全隔离

## 🔧 配置说明

### Dify配置

1. 在 [Dify](https://dify.ai) 创建应用
2. 获取API Key
3. 配置到环境变量 `DIFY_API_KEY`

### 阿里云OSS配置

1. 创建OSS Bucket
2. 设置CORS规则允许跨域访问
3. 配置访问密钥到环境变量

### 数据库配置

推荐使用阿里云RDS PostgreSQL Serverless版：
- 按需付费，成本低
- 自动扩缩容
- 高可用性

## 📱 移动端优化

- 响应式布局自适应
- 触摸友好的交互设计
- 移动端底部导航
- 优化的图表展示
- PWA支持（可添加到主屏幕）

## 🔐 安全性

- 所有API请求需要认证
- 数据传输使用HTTPS加密
- OSS文件使用签名URL访问
- SQL注入防护
- XSS防护

## 📊 性能优化

- Next.js服务端渲染（SSR）
- 静态资源CDN加速
- 图片懒加载
- 代码分割
- 阿里云SAE自动扩缩容

## 🐛 调试

```bash
# 查看日志
npm run dev

# 数据库管理界面
npx prisma studio

# 类型检查
npx tsc --noEmit

# 代码检查
npm run lint
```

## 📝 待办事项

- [ ] 实现真实的用户认证（NextAuth.js）
- [ ] 完善数据上传和解析功能
- [ ] 集成实际的Dify API调用
- [ ] 添加数据导出功能
- [ ] 实现团队协作功能
- [ ] 添加单元测试
- [ ] 添加E2E测试
- [ ] 性能监控和埋点

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题，请提交Issue或联系开发团队。

---

**祝您使用愉快！🎉**

