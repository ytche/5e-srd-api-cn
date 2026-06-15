#!/bin/bash
set -e

# 5e-srd-api 服务器一键部署脚本
# 用法：
#   curl -fsSL https://raw.githubusercontent.com/ytche/5e-srd-api-cn/main/scripts/deploy.sh | bash
# 或带自定义目录：
#   curl -fsSL ... | bash -s -- /data/5e-srd

INSTALL_DIR=${1:-/opt/5e-srd}
API_REPO=https://github.com/ytche/5e-srd-api-cn.git
DB_REPO=https://github.com/ytche/5e-database.git

echo "========================================"
echo "  5e-srd-api 服务器一键部署脚本"
echo "========================================"
echo ""

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
  echo "请使用 root 权限运行：sudo bash deploy.sh"
  exit 1
fi

# 检测系统类型
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo "无法检测操作系统类型"
  exit 1
fi

echo "==> 检测并安装 Docker..."
if ! command -v docker &>/dev/null; then
  echo "正在安装 Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "Docker 已安装，跳过"
fi

echo ""
echo "==> 检测并安装 Docker Compose..."
if docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
  echo "Docker Compose plugin 已安装，跳过"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
  echo "docker-compose 已安装，跳过"
else
  echo "正在安装 Docker Compose plugin..."
  if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
    apt-get update
    apt-get install -y docker-compose-plugin
  elif [ "$OS" == "centos" ] || [ "$OS" == "rhel" ] || [ "$OS" == "fedora" ]; then
    yum install -y docker-compose-plugin || dnf install -y docker-compose-plugin
  fi
  COMPOSE_CMD="docker compose"
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
echo "==> 放行防火墙 3000 端口..."
if command -v ufw &>/dev/null; then
  ufw allow 3000/tcp || true
  echo "ufw 已放行 3000"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port=3000/tcp || true
  firewall-cmd --reload || true
  echo "firewalld 已放行 3000"
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "访问地址："
echo "  REST API: http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP'):3000/api/2014"
echo "  GraphQL:  http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP'):3000/graphql/2014"
echo ""
echo "常用命令："
echo "  查看日志：cd ${INSTALL_DIR}/5e-srd-api-cn && ${COMPOSE_CMD} logs -f api"
echo "  重启服务：cd ${INSTALL_DIR}/5e-srd-api-cn && ${COMPOSE_CMD} restart"
echo "  停止服务：cd ${INSTALL_DIR}/5e-srd-api-cn && ${COMPOSE_CMD} down"
echo ""
