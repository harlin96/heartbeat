#!/bin/bash
# 心跳验证系统 - 一键部署脚本
# 使用: curl -fsSL http://yourserver/quick_deploy.sh | bash
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
INSTALL_DIR="/opt/heartbeat"
ADMIN_PASS=$(openssl rand -base64 12 2>/dev/null || echo "Admin@123")
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || echo "change_me")

echo -e "${GREEN}[1/4] 安装Docker...${NC}"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi
if ! command -v docker-compose &>/dev/null; then
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}[2/4] 创建项目...${NC}"
mkdir -p $INSTALL_DIR && cd $INSTALL_DIR

# 环境变量
cat > .env << EOF
SECRET_KEY=$SECRET_KEY
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASS
EOF

echo -e "${GREEN}[3/4] 下载并启动...${NC}"
# 如果没有项目文件，提示用户上传
if [ ! -f "docker-compose.yml" ]; then
  echo -e "${RED}请先上传项目文件到 $INSTALL_DIR${NC}"
  echo "上传命令示例:"
  echo "scp -r backend frontend docker-compose.yml root@服务器IP:$INSTALL_DIR/"
  exit 1
fi

docker-compose up -d --build

echo -e "${GREEN}[4/4] 完成!${NC}"
echo ""
echo -e "管理后台: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo -e "用户名: admin"
echo -e "密码: $ADMIN_PASS"
echo ""
echo -e "${RED}请立即保存以上信息！${NC}"
