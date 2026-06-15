#!/bin/bash
set -e

# 5e-srd-api 服务器一键部署脚本（普通用户版）
# 用法：
#   curl -fsSL https://raw.githubusercontent.com/ytche/5e-srd-api-cn/main/scripts/deploy.sh | bash
# 或带自定义目录：
#   curl -fsSL ... | bash -s -- /home/用户名/5e-srd
#
# 注意：普通用户需要已加入 docker 组，否则无法运行 docker 命令。
#       如果还没加，让管理员执行：sudo usermod -aG docker $USER

INSTALL_DIR=${1:-$HOME/5e-srd}
API_REPO=https://github.com/ytche/5e-srd-api-cn.git
DB_REPO=https://github.com/ytche/5e-database.git

echo "========================================"
echo "  5e-srd-api 普通用户部署脚本"
echo "========================================"
echo ""

# 检查 Docker 是否可用
echo "==> 检查 Docker 环境..."
if ! command -v docker &>/dev/null; then
  echo "错误：未检测到 Docker。"
  echo "请让管理员安装并配置 Docker："
  echo "  curl -fsSL https://get.docker.com | sudo sh"
  echo "  sudo usermod -aG docker \$USER"
  echo "然后重新登录或执行：newgrp docker"
  exit 1
fi

if ! docker ps &>/dev/null; then
  echo "错误：当前用户无法运行 docker 命令。"
  echo "请让管理员把你加入 docker 组："
  echo "  sudo usermod -aG docker $USER"
  echo "然后重新登录或执行：newgrp docker"
  exit 1
fi

# 检查 Docker Compose
echo "==> 检查 Docker Compose..."
if docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
  echo "Docker Compose plugin 已就绪"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
  echo "docker-compose 已就绪"
else
  echo "错误：未检测到 Docker Compose。"
  echo "请让管理员安装 Docker Compose plugin："
  echo "  sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
  exit 1
fi

# 检查 git
if ! command -v git &>/dev/null; then
  echo "错误：未检测到 git。请让管理员安装：sudo apt-get install -y git"
  exit 1
fi

echo ""
echo "==> 创建工作目录 ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
cd "${INSTALL_DIR}"

echo ""
echo "==> 拉取/更新 5e-srd-api-cn..."
if [ -d "5e-srd-api-cn" ]; then
  cd 5e-srd-api-cn
  git pull
  cd ..
else
  git clone "${API_REPO}"
fi

echo ""
echo "==> 拉取/更新 5e-database..."
if [ -d "5e-database" ]; then
  cd 5e-database
  git pull
  cd ..
else
  git clone "${DB_REPO}"
fi

echo ""
echo "==> 启动服务..."
cd "${INSTALL_DIR}/5e-srd-api-cn"
${COMPOSE_CMD} down || true
${COMPOSE_CMD} up -d --build

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')
echo "访问地址："
echo "  REST API: http://${PUBLIC_IP}:3000/api/2014"
echo "  GraphQL:  http://${PUBLIC_IP}:3000/graphql/2014"
echo ""
echo "项目目录：${INSTALL_DIR}/5e-srd-api-cn"
echo ""
echo "常用命令："
echo "  查看日志：cd ${INSTALL_DIR}/5e-srd-api-cn && ${COMPOSE_CMD} logs -f api"
echo "  重启服务：cd ${INSTALL_DIR}/5e-srd-api-cn && ${COMPOSE_CMD} restart"
echo "  停止服务：cd ${INSTALL_DIR}/5e-srd-api-cn && ${COMPOSE_CMD} down"
echo ""
echo "提醒："
echo "  1. 如果无法访问，请检查服务器安全组/防火墙是否放行了 3000 端口"
echo "  2. 服务已设置 restart: always，服务器重启后会自动启动"
echo ""
