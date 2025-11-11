# 环境变量配置指南

## 本地开发环境

创建 `.env.local` 文件：

```bash
# 数据库（本地 PostgreSQL 或 Docker）
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_data_analysis"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key-replace-in-production"

# Dify API
DIFY_API_KEY="app-your-dify-key"
DIFY_API_URL="https://api.dify.ai/v1"

# 阿里云 OSS
ALIYUN_OSS_REGION="ap-southeast-1"
ALIYUN_OSS_BUCKET="your-bucket-name"
ALIYUN_OSS_ACCESS_KEY_ID="your-access-key-id"
ALIYUN_OSS_ACCESS_KEY_SECRET="your-access-key-secret"
ALIYUN_OSS_ENDPOINT="https://oss-ap-southeast-1.aliyuncs.com"
```

---

## 生产环境

创建 `.env.production` 文件：

```bash
# 数据库（阿里云 RDS）
DATABASE_URL="postgresql://username:password@rm-xxxxxx.mysql.rds.aliyuncs.com:5432/ai_data_analysis"

# NextAuth（⚠️ 必须修改）
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="生成的安全密钥"

# Dify API
DIFY_API_KEY="app-your-production-key"
DIFY_API_URL="https://api.dify.ai/v1"

# 阿里云 OSS（生产环境）
ALIYUN_OSS_REGION="ap-southeast-1"
ALIYUN_OSS_BUCKET="your-production-bucket"
ALIYUN_OSS_ACCESS_KEY_ID="your-production-key-id"
ALIYUN_OSS_ACCESS_KEY_SECRET="your-production-key-secret"
ALIYUN_OSS_ENDPOINT="https://oss-ap-southeast-1.aliyuncs.com"
```

---

## 🔐 生成安全密钥

### NEXTAUTH_SECRET

```bash
# macOS/Linux
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 密码加盐

应用会自动使用 `bcryptjs` 处理密码加密，无需额外配置。

---

## ⚠️ 安全注意事项

1. **不要提交 .env 文件到 Git**
   - `.env.local`
   - `.env.production`
   - 已在 `.gitignore` 中配置

2. **定期轮换密钥**
   - Access Key 每 3-6 个月更换
   - NEXTAUTH_SECRET 每年更换

3. **使用最小权限原则**
   - OSS Access Key 只授予必要权限
   - RDS 用户只授予应用需要的权限

4. **生产环境额外配置**
   - RDS 开启 SSL 连接
   - OSS 开启防盗链
   - 配置 IP 白名单

---

## 📝 检查清单

部署前确认：

- [ ] DATABASE_URL 已更新为生产 RDS 地址
- [ ] NEXTAUTH_URL 已设置为实际域名
- [ ] NEXTAUTH_SECRET 已生成新的安全密钥
- [ ] DIFY_API_KEY 已配置正确
- [ ] 阿里云 OSS 配置已验证
- [ ] 所有敏感信息未提交到 Git

---

## 🧪 测试配置

### 测试数据库连接

```bash
npx prisma db push
npx prisma studio
```

### 测试 OSS 连接

```bash
# 运行本地开发服务器
pnpm dev

# 访问测试上传页面
open http://localhost:3000/test-oss
```

### 测试 Dify API

```bash
# 在控制台测试
curl -X POST https://api.dify.ai/v1/chat-messages \
  -H "Authorization: Bearer $DIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"测试","user":"test"}'
```

---

## 🔧 故障排查

### 数据库连接失败

```bash
# 检查连接字符串格式
postgresql://用户名:密码@主机:端口/数据库名

# 测试连接
psql "$DATABASE_URL"
```

### OSS 上传失败

```bash
# 检查 Access Key 权限
# 检查 Bucket CORS 配置
# 查看应用日志
```

### NextAuth 错误

```bash
# 确保 NEXTAUTH_SECRET 已设置
# 确保 NEXTAUTH_URL 与实际访问地址一致
# 检查回调 URL 配置
```

