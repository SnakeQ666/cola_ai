#!/bin/bash

# AI 数据分析平台 - 部署脚本
# 用于快速部署到阿里云 SAE

set -e

echo "🚀 开始部署 AI 数据分析平台..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量（已根据你的阿里云 ACR 配置修改）
APP_NAME="ai-analysis-app"
VERSION=${1:-"v1.0.0"}
REGISTRY="crpi-3uujm5b25yfjsdc4.cn-hangzhou.personal.cr.aliyuncs.com"
NAMESPACE="ai-analysis-cola"
ACR_USERNAME="aliyun3843835573"
IMAGE_NAME="${REGISTRY}/${NAMESPACE}/${APP_NAME}:${VERSION}"

echo -e "${YELLOW}部署版本: ${VERSION}${NC}"

# 检查必要的工具
echo "📋 检查依赖工具..."
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker 未安装${NC}" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}❌ pnpm 未安装${NC}" >&2; exit 1; }

# 检查环境变量文件
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production 文件不存在${NC}"
    echo "请先创建 .env.production 文件，参考 ENV_SETUP.md"
    exit 1
fi

echo -e "${GREEN}✅ 依赖检查通过${NC}"

# 清理旧的构建文件
echo "🧹 清理旧文件..."
rm -rf .next
rm -rf node_modules/.cache

# 安装依赖
echo "📦 安装依赖..."
pnpm install --frozen-lockfile

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 构建 Docker 镜像（多平台支持）
echo "🐳 构建 Docker 镜像（AMD64 架构）..."
echo -e "${YELLOW}提示: 正在为 Linux AMD64 架构构建，这在 M1/M2 Mac 上可能需要较长时间${NC}"

# 使用 buildx 构建 AMD64 镜像（SAE 需要）
docker buildx build \
    --platform linux/amd64 \
    -t ${APP_NAME}:${VERSION} \
    -t ${IMAGE_NAME} \
    --load \
    .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker 构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 镜像构建成功（AMD64）${NC}"

# 推送到镜像仓库
read -p "是否推送镜像到阿里云 ACR？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📤 推送镜像..."
    
    # 登录 ACR
    echo "请输入阿里云 Registry 密码:"
    docker login --username=${ACR_USERNAME} ${REGISTRY}
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ ACR 登录失败${NC}"
        exit 1
    fi
    
    docker push ${IMAGE_NAME}
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 镜像推送失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 镜像推送成功${NC}"
    echo -e "${GREEN}镜像地址: ${IMAGE_NAME}${NC}"
fi

echo ""
echo "🎉 部署准备完成！"
echo ""
echo "下一步："
echo "1. 登录阿里云 SAE 控制台"
echo "2. 选择应用 → 部署应用"
echo "3. 镜像地址填写: ${IMAGE_NAME}"
echo "4. 配置环境变量（复制 .env.production 内容）"
echo "5. 点击部署"
echo ""
echo "💡 提示: 部署后访问 https://your-domain.com/api/health 检查健康状态"

