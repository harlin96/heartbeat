#!/bin/bash
# ============================================
# 心跳验证系统 - 服务器一键安装脚本
# 使用: curl -fsSL https://raw.githubusercontent.com/您的用户名/heartbeat/main/install.sh | bash
# ============================================

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

# ========== 请修改为您的Git仓库地址 ==========
GIT_REPO="https://github.com/您的用户名/heartbeat.git"
# =============================================

INSTALL_DIR="/opt/heartbeat"
ADMIN_PASS=$(openssl rand -base64 12)
SECRET_KEY=$(openssl rand -hex 32)

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   心跳验证系统 - 一键安装脚本${NC}"
echo -e "${GREEN}======================================${NC}"

# 检查root
[ "$EUID" -ne 0 ] && echo -e "${RED}请使用root运行${NC}" && exit 1

echo -e "${GREEN}[1/5] 安装基础依赖...${NC}"
apt update -y && apt install -y curl git

echo -e "${GREEN}[2/5] 安装Docker...${NC}"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker && systemctl start docker
fi

echo -e "${GREEN}[3/5] 安装docker-compose...${NC}"
if ! command -v docker-compose &>/dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}[4/5] 拉取代码...${NC}"
rm -rf $INSTALL_DIR
git clone $GIT_REPO $INSTALL_DIR
cd $INSTALL_DIR

# 创建环境配置
cat > .env << EOF
SECRET_KEY=$SECRET_KEY
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASS
ALLOWED_ORIGINS=*
ALLOWED_HOSTS=*
EOF

echo -e "${GREEN}[5/5] 启动服务...${NC}"
docker-compose up -d --build

# 等待启动
sleep 10

# 获取IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}        安装完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}访问地址:${NC} http://$SERVER_IP"
echo -e "${YELLOW}API文档:${NC} http://$SERVER_IP/api/docs"
echo ""
echo -e "${YELLOW}管理员账户:${NC}"
echo -e "  用户名: admin"
echo -e "  密码: ${GREEN}$ADMIN_PASS${NC}"
echo ""
echo -e "${RED}请立即保存以上信息！${NC}"

# 保存凭据
cat > $INSTALL_DIR/credentials.txt << EOF
心跳验证系统 - 安装信息
========================
安装时间: $(date)
访问地址: http://$SERVER_IP
管理员用户名: admin
管理员密码: $ADMIN_PASS

常用命令:
  查看日志: cd $INSTALL_DIR && docker-compose logs -f
  重启服务: cd $INSTALL_DIR && docker-compose restart
  更新代码: cd $INSTALL_DIR && git pull && docker-compose up -d --build
EOF

echo -e "${GREEN}凭据已保存到: $INSTALL_DIR/credentials.txt${NC}"
