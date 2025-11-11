# 阿里云部署指南

本文档详细说明如何将AI数据分析平台部署到阿里云Serverless架构。

## 📋 前置准备

### 1. 阿里云账号准备

- [ ] 已注册阿里云账号
- [ ] 已完成实名认证
- [ ] 域名已备案
- [ ] 已开通以下服务：
  - Serverless应用引擎 (SAE)
  - 容器镜像服务 (ACR)
  - 云数据库RDS PostgreSQL
  - 对象存储 OSS
  - 云解析 DNS
  - 日志服务 SLS (可选)

### 2. 本地工具准备

```bash
# 安装Docker
# macOS
brew install --cask docker

# 安装阿里云CLI
brew install aliyun-cli

# 配置阿里云CLI
aliyun configure
# 输入 Access Key ID
# 输入 Access Key Secret
# 输入 Region ID (如: cn-hangzhou)
```

## 🗄️ 步骤1: 创建数据库

### 1.1 创建RDS PostgreSQL实例

1. 登录 [RDS控制台](https://rdsnext.console.aliyun.com/)
2. 点击"创建实例"
3. 选择配置：
   - **数据库类型**: PostgreSQL
   - **版本**: 14或更高
   - **系列**: Serverless基础版（推荐，成本低）
   - **地域**: 选择与SAE相同的地域
   - **可用区**: 任意
   - **实例规格**: 按需选择，建议开发环境1核2GB

4. 创建数据库和账号：
   ```sql
   CREATE DATABASE ai_analysis;
   CREATE USER ai_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE ai_analysis TO ai_user;
   ```

5. 配置白名单：
   - 添加 `0.0.0.0/0`（开发环境）
   - 生产环境添加SAE的出口IP

6. 记录连接信息：
   ```
   数据库地址: rm-xxxxx.pg.rds.aliyuncs.com
   端口: 5432
   数据库名: ai_analysis
   用户名: ai_user
   密码: your_secure_password
   ```

### 1.2 配置DATABASE_URL

```env
DATABASE_URL=postgresql://ai_user:your_secure_password@rm-xxxxx.pg.rds.aliyuncs.com:5432/ai_analysis
```

## 📦 步骤2: 创建OSS存储

### 2.1 创建Bucket

1. 登录 [OSS控制台](https://oss.console.aliyun.com/)
2. 点击"创建Bucket"
3. 配置：
   - **Bucket名称**: ai-data-analysis-{随机字符串}
   - **地域**: 与SAE相同
   - **存储类型**: 标准存储
   - **读写权限**: 私有
   - **服务端加密**: 开启（推荐）

### 2.2 配置CORS

在Bucket设置中，添加CORS规则：

```xml
<CORSRule>
  <AllowedOrigin>https://your-domain.com</AllowedOrigin>
  <AllowedOrigin>http://localhost:3000</AllowedOrigin>
  <AllowedMethod>GET</AllowedMethod>
  <AllowedMethod>POST</AllowedMethod>
  <AllowedMethod>PUT</AllowedMethod>
  <AllowedMethod>DELETE</AllowedMethod>
  <AllowedHeader>*</AllowedHeader>
  <ExposeHeader>ETag</ExposeHeader>
  <MaxAgeSeconds>3600</MaxAgeSeconds>
</CORSRule>
```

### 2.3 创建访问密钥

1. 进入 [RAM访问控制](https://ram.console.aliyun.com/)
2. 创建RAM用户
3. 授予权限：`AliyunOSSFullAccess`
4. 创建AccessKey
5. 记录：
   ```
   OSS_ACCESS_KEY_ID=LTAI_xxxxx
   OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxx
   OSS_BUCKET=ai-data-analysis-xxx
   OSS_REGION=oss-cn-hangzhou
   ```

## 🐳 步骤3: 配置容器镜像服务

### 3.1 创建命名空间和镜像仓库

1. 登录 [容器镜像服务控制台](https://cr.console.aliyun.com/)
2. 创建个人版实例（免费）
3. 创建命名空间: `ai-analysis`
4. 创建镜像仓库: `ai-analysis-app`
   - 仓库类型: 私有
   - 代码源: 本地仓库

### 3.2 配置Docker登录

```bash
# 获取登录密码（在容器镜像服务控制台设置）
docker login --username=your-aliyun-username registry.cn-hangzhou.aliyuncs.com
```

## 🚀 步骤4: 部署到SAE

### 4.1 创建SAE应用

1. 登录 [SAE控制台](https://sae.console.aliyun.com/)
2. 点击"创建应用"
3. 配置：
   - **应用名称**: ai-data-analysis
   - **命名空间**: 默认或新建
   - **VPC配置**: 选择与RDS相同的VPC
   - **实例规格**: 1核2GB（开发）/ 2核4GB（生产）
   - **实例数量**: 1-10（自动扩缩容）

### 4.2 配置环境变量

在SAE应用配置中添加环境变量：

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
DIFY_API_KEY=app-xxxxx
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket
OSS_ACCESS_KEY_ID=LTAI_xxxxx
OSS_ACCESS_KEY_SECRET=xxxxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 4.3 执行部署

**方法1: 使用脚本部署**

```bash
# 修改 scripts/deploy-sae.sh 中的配置
vim scripts/deploy-sae.sh

# 执行部署
chmod +x scripts/deploy-sae.sh
./scripts/deploy-sae.sh
```

**方法2: 手动部署**

```bash
# 1. 构建镜像
docker build -t ai-analysis:latest .

# 2. 标记镜像
docker tag ai-analysis:latest \
  registry.cn-hangzhou.aliyuncs.com/ai-analysis/ai-analysis-app:v1.0.0

# 3. 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/ai-analysis/ai-analysis-app:v1.0.0

# 4. 在SAE控制台手动触发部署
# 或使用CLI
aliyun sae DeployApplication \
  --AppId <your-app-id> \
  --ImageUrl registry.cn-hangzhou.aliyuncs.com/ai-analysis/ai-analysis-app:v1.0.0
```

### 4.4 配置健康检查

在SAE应用配置中：

- **就绪检查**: HTTP GET `/api/health` 端口3000
- **存活检查**: HTTP GET `/api/health` 端口3000

## 🌐 步骤5: 配置域名和SSL

### 5.1 绑定域名

1. 在SAE应用详情中，找到"公网访问"
2. 点击"绑定域名"
3. 输入您的已备案域名
4. 上传SSL证书（或使用阿里云免费证书）

### 5.2 配置DNS解析

在 [云解析DNS控制台](https://dns.console.aliyun.com/):

```
类型: CNAME
主机记录: @ 或 www
记录值: your-app.cn-hangzhou.sae.aliyuncs.com
TTL: 10分钟
```

### 5.3 配置CDN（可选）

1. 开通 [CDN服务](https://cdn.console.aliyun.com/)
2. 添加加速域名
3. 源站配置为SAE应用域名
4. 开启HTTPS
5. 配置缓存规则：
   ```
   /_next/static/*  缓存7天
   /images/*        缓存30天
   ```

## 📊 步骤6: 配置监控和日志（可选）

### 6.1 配置SLS日志服务

1. 开通 [日志服务](https://sls.console.aliyun.com/)
2. 创建Project: `ai-data-analysis`
3. 创建Logstore: `app-logs`
4. 在SAE中启用日志采集

### 6.2 配置告警

在SLS中配置告警规则：
- 应用错误率 > 5%
- 响应时间 > 2s
- 4xx/5xx错误数量

## 🔍 步骤7: 验证部署

### 7.1 健康检查

```bash
curl https://your-domain.com/api/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "ai-data-analysis",
  "version": "1.0.0"
}
```

### 7.2 功能测试

1. 访问首页
2. 注册/登录
3. 上传测试数据
4. 创建AI分析会话
5. 生成图表

## 💰 成本估算

### 开发环境（月费用）
- SAE: 1核2GB, 1实例 ≈ ¥60
- RDS Serverless: 基础版 ≈ ¥40
- OSS: 10GB ≈ ¥5
- **总计: ≈ ¥105/月**

### 生产环境（100用户，月费用）
- SAE: 2核4GB, 2-5实例 ≈ ¥300
- RDS: 通用版 2核4GB ≈ ¥400
- OSS: 100GB ≈ ¥30
- CDN: 100GB流量 ≈ ¥30
- SLS: 基础版 ≈ ¥20
- **总计: ≈ ¥780/月**

> 不含Dify费用

## 🔧 常见问题

### Q1: 部署后无法访问？
- 检查安全组配置
- 确认域名解析是否生效
- 查看SAE应用日志

### Q2: 数据库连接失败？
- 检查数据库白名单配置
- 确认DATABASE_URL格式正确
- 测试网络连通性

### Q3: OSS上传失败？
- 检查CORS配置
- 确认AccessKey权限
- 查看浏览器控制台错误

### Q4: 如何回滚版本？
```bash
# 在SAE控制台选择"版本管理"
# 或使用CLI
aliyun sae RollbackApplication --AppId <app-id> --VersionId <version-id>
```

## 📚 相关文档

- [阿里云SAE文档](https://help.aliyun.com/product/133413.html)
- [阿里云RDS文档](https://help.aliyun.com/product/26090.html)
- [阿里云OSS文档](https://help.aliyun.com/product/31815.html)
- [Next.js部署文档](https://nextjs.org/docs/deployment)
- [Dify文档](https://docs.dify.ai/)

## 🆘 技术支持

如遇问题：
1. 查看SAE应用日志
2. 检查SLS日志服务
3. 提交Issue到项目仓库

---

部署完成！🎉

