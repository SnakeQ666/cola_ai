#!/bin/bash

# Docker本地构建和测试脚本

set -e

echo "🔨 构建Docker镜像..."

# 构建镜像
docker build -t ai-data-analysis:dev .

echo "✅ 构建完成！"
echo ""
echo "运行以下命令启动容器："
echo "docker run -p 3000:3000 --env-file .env ai-data-analysis:dev"

