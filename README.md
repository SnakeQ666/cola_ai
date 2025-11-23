# AI 加密货币交易平台

基于 **DeepSeek AI + Binance API** 的智能加密货币交易平台，支持 7×24 小时自动化交易，部署在阿里云 Serverless 架构上。

## ✨ 核心特性

- 🤖 **DeepSeek AI 驱动** - 采用最先进的 DeepSeek AI 模型进行市场分析和交易决策
- 📊 **技术指标分析** - 集成 RSI、MACD、EMA、布林带等多种技术指标
- 🔄 **自动化交易** - 7×24 小时自动监控市场，在最佳时机执行买卖操作
- 🛡️ **智能风控** - 多层风控机制，包括单笔限额、日亏损限制、止盈止损
- 📈 **实时监控** - 可视化展示 AI 决策过程、交易记录、盈亏统计
- 📱 **全端适配** - 完美支持 PC 和移动端响应式设计
- ☁️ **云原生架构** - 部署在阿里云 SAE，自动扩缩容
- 🔒 **安全可靠** - API 密钥 AES-256 加密存储，支持测试网和主网

## 🛠 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **UI库**: React 18 + Tailwind CSS + shadcn/ui
- **图表**: Recharts
- **通知**: Sonner
- **语言**: TypeScript

### 后端
- **API**: Next.js API Routes
- **数据库**: PostgreSQL (阿里云 RDS)
- **ORM**: Prisma
- **AI**: DeepSeek API (OpenAI SDK 兼容)
- **交易**: Binance API (binance-api-node)
- **加密**: crypto (AES-256-CBC)

### 部署
- **计算**: 阿里云 SAE (Serverless 应用引擎)
- **容器**: Docker
- **CI/CD**: GitHub Actions
- **镜像仓库**: 阿里云 ACR
- **监控**: 阿里云 SLS 日志服务

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 10+
- Docker (用于本地测试和部署)
- 阿里云账号 (生产环境)
- Binance 账号 (获取 API Key)
- DeepSeek API Key

### 本地开发

1. **克隆项目**

```bash
cd "innovation program"
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量**

复制 `.env.example` 并重命名为 `.env`，填写以下配置：

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/ai_trading

# 认证
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# DeepSeek AI
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx

# API 密钥加密
ENCRYPTION_KEY=your-32-character-encryption-key

# Cron 任务密钥
CRON_SECRET=your-cron-secret-key

# 阿里云 OSS (用于头像上传)
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
```

4. **初始化数据库**

```bash
pnpm prisma generate
pnpm prisma db push
```

5. **启动开发服务器**

```bash
pnpm dev
```

访问 http://localhost:3000

## 📦 构建和部署

### Docker 本地测试

```bash
# 构建镜像
./deploy.sh

# 或手动构建
docker buildx build --platform linux/amd64 -t ai-trading:latest .
```

### 部署到阿里云 SAE

#### 方式一：GitHub Actions 自动部署（推荐）

1. **配置 GitHub Secrets**

在 GitHub 仓库设置中添加以下 Secrets：

- `ALIYUN_ACCESS_KEY_ID`: 阿里云 AccessKey ID
- `ALIYUN_ACCESS_KEY_SECRET`: 阿里云 AccessKey Secret
- `ACR_REGISTRY`: ACR 镜像仓库地址（如 `registry.cn-hangzhou.aliyuncs.com`）
- `ACR_NAMESPACE`: ACR 命名空间
- `ACR_PASSWORD`: ACR 访问令牌
- `SAE_APP_ID`: SAE 应用 ID
- `SAE_REGION`: SAE 区域（如 `cn-hangzhou`）
- `DATABASE_URL`: 生产环境数据库连接字符串

2. **推送代码触发部署**

```bash
git add .
git commit -m "feat: update trading logic"
git push origin main
```

GitHub Actions 会自动构建镜像并部署到 SAE。

#### 方式二：本地手动部署

```bash
# 修改 deploy.sh 中的配置
REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="your-namespace"
IMAGE_NAME="ai-trading"

# 执行部署脚本
./deploy.sh
```

## 📁 项目结构

```
innovation program/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions 部署配置
├── app/
│   ├── (auth)/              # 认证页面
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # 主应用页面
│   │   ├── page.tsx         # 首页（平台介绍）
│   │   ├── trading/         # AI 现货交易
│   │   │   ├── page.tsx     # 交易主页
│   │   │   ├── history/     # 交易历史
│   │   │   ├── manual/      # 手动交易
│   │   │   ├── monitor/     # 实时监控
│   │   │   └── settings/    # 风控设置
│   │   ├── futures/         # AI 合约交易（占位符）
│   │   └── settings/        # 用户设置
│   └── api/
│       ├── auth/            # 认证 API
│       ├── user/            # 用户 API
│       ├── trading/         # 交易 API
│       │   ├── account/     # 账户管理
│       │   ├── analyze/     # AI 分析
│       │   ├── balance/     # 余额查询
│       │   ├── cron/        # 定时任务
│       │   ├── decisions/   # 决策历史
│       │   ├── portfolio/   # 投资组合
│       │   ├── symbols/     # 交易对列表
│       │   ├── trade/       # 手动交易
│       │   └── trades/      # 交易记录
│       └── health/          # 健康检查
├── components/
│   ├── ui/                  # shadcn/ui 组件
│   ├── layouts/             # 布局组件
│   └── providers.tsx        # 全局 Provider
├── lib/
│   ├── aliyun-oss.ts        # OSS 集成
│   ├── auth.ts              # 认证工具
│   ├── binance.ts           # Binance API
│   ├── crypto.ts            # 加密/解密
│   ├── db.ts                # 数据库
│   ├── trading/             # 交易核心逻辑
│   │   ├── ai-engine.ts     # AI 决策引擎
│   │   ├── indicators.ts    # 技术指标
│   │   └── risk-control.ts  # 风控系统
│   └── utils.ts             # 工具函数
├── prisma/
│   └── schema.prisma        # 数据库 Schema
├── Dockerfile               # Docker 配置
├── deploy.sh                # 部署脚本
├── package.json
└── README.md
```

## 🎯 核心功能

### 1. AI 现货交易（已上线）

#### 账户管理
- 连接 Binance API（支持测试网和主网）
- API 密钥 AES-256 加密存储
- 实时余额查询和历史记录

#### AI 决策引擎
- DeepSeek AI 驱动的市场分析
- 技术指标计算（RSI、MACD、EMA、布林带）
- 自动生成 BUY/SELL/HOLD 决策
- 信心指数和风险等级评估
- 持仓盈亏分析和止盈止损建议

#### 自动化交易
- 7×24 小时自动监控市场
- 自动执行买入和卖出操作
- 支持多币种策略（BTC、ETH、BNB、SOL 等）
- AI 自动选择最优交易时机和币种
- 灰尘持仓过滤（低于 $5 不交易）

#### 风控系统
- 单笔最大交易金额限制
- 单日最大亏损限制
- 允许交易币种白名单
- 智能止盈止损
- Binance LOT_SIZE 自动适配

#### 实时监控
- 可视化展示 AI 决策过程
- 交易记录和盈亏统计
- 余额变化趋势图表
- AI 管理资产组合追踪
- 决策历史详情展开

#### 手动交易
- 支持手动下单
- 实时价格查询
- 风控检查

### 2. AI 合约交易（开发中）

- 永续合约交易
- 杠杆倍数调节（1x-125x）
- 网格交易策略
- 套利策略
- 智能止盈止损

## 🔧 配置说明

### DeepSeek API

1. 访问 [DeepSeek](https://platform.deepseek.com/)
2. 注册并获取 API Key
3. 配置到环境变量 `DEEPSEEK_API_KEY`

### Binance API

1. 登录 [Binance](https://www.binance.com/)
2. 前往 API 管理创建 API Key
3. 设置 IP 白名单（推荐）
4. 在平台中连接 Binance 账户

### 加密密钥

生成 32 字符的加密密钥用于 API Key 加密：

```bash
openssl rand -base64 32
```

### Cron 任务

如需使用外部 Cron 服务（如 Linux cron、阿里云函数计算）触发自动交易：

```bash
# 每分钟执行一次
* * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/trading/cron
```

## 📱 移动端优化

- 响应式布局自适应
- 触摸友好的交互设计
- 移动端底部导航
- 优化的图表展示

## 🔐 安全性

- 所有 API 请求需要认证（NextAuth.js）
- API 密钥 AES-256-CBC 加密存储
- 数据传输使用 HTTPS 加密
- OSS 文件使用签名 URL 访问
- SQL 注入防护（Prisma ORM）
- XSS 防护
- Cron 任务密钥验证

## 📊 性能优化

- Next.js 服务端渲染（SSR）
- 静态资源 CDN 加速
- 代码分割和懒加载
- 阿里云 SAE 自动扩缩容
- Docker 多阶段构建优化镜像大小
- GitHub Actions 缓存加速构建

## 🐛 调试

```bash
# 查看日志
pnpm dev

# 数据库管理界面
pnpm prisma studio

# 类型检查
pnpm tsc --noEmit

# 代码检查
pnpm lint
```

## 📝 数据库模型

### 核心表

- `User`: 用户表
- `BinanceAccount`: Binance 账户配置
- `Trade`: 交易记录
- `AIDecision`: AI 决策记录
- `BalanceHistory`: 余额历史

### 关系

```
User 1:1 BinanceAccount
BinanceAccount 1:N Trade
BinanceAccount 1:N AIDecision
AIDecision 1:N Trade
BinanceAccount 1:N BalanceHistory
```

## 🎨 UI 组件

基于 [shadcn/ui](https://ui.shadcn.com/) 构建，包括：

- Button, Card, Badge, Label, Switch
- Toast 通知（Sonner）
- 响应式布局组件

## 🔄 更新日志

### v1.0.0 (当前版本)

- ✅ AI 现货交易功能
- ✅ DeepSeek AI 决策引擎
- ✅ 多币种自动交易
- ✅ 智能风控系统
- ✅ 实时监控和图表
- ✅ 盈亏追踪和分析
- ✅ GitHub Actions 自动部署
- ✅ 移动端适配

### 即将推出

- 🔜 AI 合约交易
- 🔜 网格交易策略
- 🔜 套利策略
- 🔜 更多技术指标
- 🔜 回测系统

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## ⚠️ 免责声明

本平台仅供学习和研究使用。加密货币交易具有高风险，可能导致本金损失。请谨慎使用，风险自负。

## 📄 许可证

MIT License

---

**祝您交易顺利！🚀**
