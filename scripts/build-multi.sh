#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "错误：必须提供 TAG 参数"
  echo "用法：./build-multi.sh <TAG>"
  exit 1
fi

TAG=$1

REPO="cosincox/easyvoice"

docker buildx create --name multiarch-builder --use || true
docker buildx inspect --bootstrap

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "${REPO}:${TAG}" \
  -t "${REPO}:latest" \
  --push \
  .

# docker buildx rm multiarch-builder

echo "完成！多架构镜像已构建并推送为 ${REPO}:${TAG} 和 ${REPO}:latest"