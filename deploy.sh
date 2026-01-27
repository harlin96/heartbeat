#!/bin/bash

# ============================================
# 心跳验证系统 - Linux一键部署脚本 v2.1
# 支持：Git拉取 + Docker部署
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ========== 配置区域（请修改） ==========
GIT_REPO=""  # 您的Git仓库地址，例如: https://github.com/yourname/heartbeat.git
# ========================================

# 配置变量
INSTALL_DIR="/opt/heartbeat"
DOMAIN=""
ADMIN_USER="admin"
ADMIN_PASS=$(openssl rand -base64 12)
SECRET_KEY=$(openssl rand -hex 32)
PORT=8000
DEPLOY_MODE="docker"

echo -e "${BLUE}"
echo "============================================"
echo "     心跳验证系统 - 一键部署脚本 v2.0"
echo "============================================"
echo -e "${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用root用户运行此脚本${NC}"
    exit 1
fi

# 系统信息检测
echo -e "${GREEN}[系统检测]${NC}"
echo "  操作系统: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo 'Unknown')"
echo "  内核版本: $(uname -r)"
echo "  CPU核心: $(nproc 2>/dev/null || echo '?')"
echo "  内存: $(free -h 2>/dev/null | awk '/Mem:/{print $2}' || echo '?')"
echo "  磁盘: $(df -h / 2>/dev/null | awk 'NR==2{print $4}' || echo '?') 可用"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 检测Docker是否可用
if command -v docker &> /dev/null; then
    echo -e "${GREEN}检测到Docker已安装${NC}"
    read -p "是否使用Docker部署? (推荐，更简单) [Y/n]: " use_docker
    if [[ "$use_docker" != "n" && "$use_docker" != "N" ]]; then
        DEPLOY_MODE="docker"
    fi
fi

# 询问域名
read -p "请输入您的域名(可选,直接回车使用IP访问): " DOMAIN

# ============================================
# Docker部署模式
# ============================================
deploy_docker() {
    echo -e "${GREEN}[Docker模式] 开始部署...${NC}"
    
    # 安装docker-compose如果不存在
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}安装 docker-compose...${NC}"
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # 创建安装目录
    mkdir -p $INSTALL_DIR
    cd $INSTALL_DIR
    
    # 复制项目文件
    cp -r "$SCRIPT_DIR/backend" $INSTALL_DIR/
    cp -r "$SCRIPT_DIR/frontend" $INSTALL_DIR/
    cp "$SCRIPT_DIR/docker-compose.yml" $INSTALL_DIR/
    
    # 创建数据目录
    mkdir -p $INSTALL_DIR/data
    
    # 创建环境配置文件
    cat > $INSTALL_DIR/.env << EOF
SECRET_KEY=$SECRET_KEY
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
ALLOWED_ORIGINS=*
ALLOWED_HOSTS=*
EOF

    # 如果有域名，更新nginx配置
    if [ -n "$DOMAIN" ]; then
        sed -i "s/server_name _;/server_name $DOMAIN;/g" $INSTALL_DIR/frontend/nginx.conf
    fi
    
    # 构建并启动容器
    echo -e "${GREEN}[Docker] 构建镜像...${NC}"
    cd $INSTALL_DIR
    docker-compose build
    
    echo -e "${GREEN}[Docker] 启动服务...${NC}"
    docker-compose up -d
    
    # 等待服务启动
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}服务启动成功!${NC}"
    else
        echo -e "${RED}服务启动可能有问题，请检查日志: docker-compose logs${NC}"
    fi
}

# ============================================
# 传统部署模式
# ============================================
deploy_traditional() {
    echo -e "${GREEN}[传统模式] 开始部署...${NC}"
    
    # 检测系统
    if [ -f /etc/debian_version ]; then
        OS="debian"
        PKG_MANAGER="apt-get"
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
        PKG_MANAGER="yum"
    else
        echo -e "${RED}不支持的操作系统，请使用Docker部署${NC}"
        exit 1
    fi

    echo -e "${GREEN}[1/7] 更新系统包...${NC}"
    $PKG_MANAGER update -y

    echo -e "${GREEN}[2/7] 安装依赖...${NC}"
    if [ "$OS" = "debian" ]; then
        $PKG_MANAGER install -y python3 python3-pip python3-venv nginx curl git openssl
    else
        $PKG_MANAGER install -y python3 python3-pip nginx curl git openssl
    fi

    # 安装Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${GREEN}安装Node.js...${NC}"
        if [ "$OS" = "debian" ]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        else
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
        fi
    fi

    echo -e "${GREEN}[3/7] 创建安装目录...${NC}"
    mkdir -p $INSTALL_DIR
    cd $INSTALL_DIR

    # 复制项目文件
    cp -r "$SCRIPT_DIR/backend" $INSTALL_DIR/
    cp -r "$SCRIPT_DIR/frontend" $INSTALL_DIR/

    echo -e "${GREEN}[4/7] 配置后端...${NC}"
    cd $INSTALL_DIR/backend

    # 创建虚拟环境
    python3 -m venv venv
    source venv/bin/activate

    # 安装依赖
    pip install --upgrade pip
    pip install -r requirements.txt

    # 创建环境配置文件
    cat > .env << EOF
SECRET_KEY=$SECRET_KEY
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
DATABASE_URL=sqlite+aiosqlite:///./heartbeat.db
DEBUG=false
ALLOWED_ORIGINS=*
ALLOWED_HOSTS=*
EOF

    deactivate

    echo -e "${GREEN}[5/7] 构建前端...${NC}"
    cd $INSTALL_DIR/frontend
    npm install
    npm run build

    # 复制构建文件到nginx目录
    mkdir -p /var/www/heartbeat
    cp -r dist/* /var/www/heartbeat/

    echo -e "${GREEN}[6/7] 配置Nginx和Systemd...${NC}"

    # 创建systemd服务
    cat > /etc/systemd/system/heartbeat.service << EOF
[Unit]
Description=Heartbeat Verification System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port $PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # 配置Nginx
    if [ -n "$DOMAIN" ]; then
        SERVER_NAME=$DOMAIN
    else
        SERVER_NAME="_"
    fi

    cat > /etc/nginx/sites-available/heartbeat << EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # 安全头部
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端静态文件
    location / {
        root /var/www/heartbeat;
        try_files \$uri \$uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:$PORT/health;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /var/www/heartbeat;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # 启用站点配置
    mkdir -p /etc/nginx/sites-enabled
    ln -sf /etc/nginx/sites-available/heartbeat /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

    # 测试nginx配置
    nginx -t

    echo -e "${GREEN}[7/7] 启动服务...${NC}"
    systemctl daemon-reload
    systemctl enable heartbeat
    systemctl start heartbeat
    systemctl restart nginx
}

# ============================================
# 执行部署
# ============================================
if [ "$DEPLOY_MODE" = "docker" ]; then
    deploy_docker
else
    deploy_traditional
fi

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}     部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}部署模式: ${BLUE}$DEPLOY_MODE${NC}"
echo ""
echo -e "${YELLOW}管理后台地址:${NC}"
if [ -n "$DOMAIN" ]; then
    echo -e "  http://$DOMAIN"
else
    echo -e "  http://$SERVER_IP"
fi
echo ""
echo -e "${YELLOW}管理员账户:${NC}"
echo -e "  用户名: ${BLUE}$ADMIN_USER${NC}"
echo -e "  密码: ${BLUE}$ADMIN_PASS${NC}"
echo ""
echo -e "${YELLOW}API文档:${NC}"
if [ -n "$DOMAIN" ]; then
    echo -e "  http://$DOMAIN/api/docs"
else
    echo -e "  http://$SERVER_IP/api/docs"
fi
echo ""
echo -e "${RED}重要: 请立即保存以上信息！${NC}"
echo ""

# 保存配置信息
cat > $INSTALL_DIR/credentials.txt << EOF
心跳验证系统 - 部署信息
========================
部署时间: $(date)
部署模式: $DEPLOY_MODE
安装目录: $INSTALL_DIR
管理后台: http://${DOMAIN:-$SERVER_IP}
管理员用户名: $ADMIN_USER
管理员密码: $ADMIN_PASS
API文档: http://${DOMAIN:-$SERVER_IP}/api/docs

常用命令:
EOF

if [ "$DEPLOY_MODE" = "docker" ]; then
    cat >> $INSTALL_DIR/credentials.txt << EOF
  查看日志: cd $INSTALL_DIR && docker-compose logs -f
  重启服务: cd $INSTALL_DIR && docker-compose restart
  停止服务: cd $INSTALL_DIR && docker-compose down
  更新部署: cd $INSTALL_DIR && docker-compose pull && docker-compose up -d
EOF
else
    cat >> $INSTALL_DIR/credentials.txt << EOF
  查看日志: journalctl -u heartbeat -f
  重启服务: systemctl restart heartbeat
  停止服务: systemctl stop heartbeat
  查看状态: systemctl status heartbeat
EOF
fi

echo -e "${GREEN}配置信息已保存到: $INSTALL_DIR/credentials.txt${NC}"

# Docker模式下显示容器状态
if [ "$DEPLOY_MODE" = "docker" ]; then
    echo ""
    echo -e "${YELLOW}容器状态:${NC}"
    cd $INSTALL_DIR && docker-compose ps
fi
