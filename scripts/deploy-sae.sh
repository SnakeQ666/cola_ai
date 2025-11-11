#!/bin/bash

# 阿里云SAE部署脚本
# 使用前请确保：
# 1. 已安装并配置阿里云CLI (aliyun configure)
# 2. 已创建容器镜像仓库
# 3. 已在SAE创建应用并获取AppId

set -e

echo "🚀 开始部署AI数据分析平台到阿里云SAE..."

# 配置变量（请根据实际情况修改）
REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="your-namespace"
IMAGE_NAME="ai-analysis"
VERSION=$(date +%Y%m%d-%H%M%S)
APP_ID="your-sae-app-id"  # 在SAE控制台获取

# 1. 构建Docker镜像
echo "📦 构建Docker镜像..."
docker build -t ${IMAGE_NAME}:${VERSION} .
docker tag ${IMAGE_NAME}:${VERSION} ${IMAGE_NAME}:latest

# 2. 登录阿里云容器镜像服务
echo "🔐 登录阿里云容器镜像服务..."
docker login --username=${DOCKER_USERNAME} ${REGISTRY}

# 3. 推送镜像
echo "⬆️  推送镜像到镜像仓库..."
docker tag ${IMAGE_NAME}:${VERSION} ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${VERSION}
docker tag ${IMAGE_NAME}:${VERSION} ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:latest

docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${VERSION}
docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:latest

# 4. 部署到SAE
echo "🚢 部署到SAE..."
aliyun sae DeployApplication \
  --AppId ${APP_ID} \
  --ImageUrl ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${VERSION} \
  --PackageVersion ${VERSION}

echo "✅ 部署完成！"
echo "📝 镜像版本: ${VERSION}"
echo "🔗 请在SAE控制台查看应用状态"

