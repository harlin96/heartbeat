# 心跳验证系统 - Windows部署脚本
# 使用方法: 右键以PowerShell运行，或在终端中执行 .\deploy_to_server.ps1

$SERVER = "103.73.161.145"
$USER = "root"
$PORT = "22"
$LOCAL_PATH = "c:\maomao\bianbian\表格"
$REMOTE_PATH = "/opt/heartbeat"

Write-Host "============================================" -ForegroundColor Green
Write-Host "   心跳验证系统 - 远程部署脚本" -ForegroundColor Green  
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# 步骤1: 创建远程目录
Write-Host "[1/4] 创建远程目录..." -ForegroundColor Yellow
ssh -p $PORT "$USER@$SERVER" "mkdir -p $REMOTE_PATH"

# 步骤2: 上传项目文件
Write-Host "[2/4] 上传项目文件..." -ForegroundColor Yellow
scp -P $PORT -r "$LOCAL_PATH\backend" "$USER@${SERVER}:$REMOTE_PATH/"
scp -P $PORT -r "$LOCAL_PATH\frontend" "$USER@${SERVER}:$REMOTE_PATH/"
scp -P $PORT "$LOCAL_PATH\docker-compose.yml" "$USER@${SERVER}:$REMOTE_PATH/"

# 步骤3: 远程执行部署
Write-Host "[3/4] 远程安装Docker并部署..." -ForegroundColor Yellow
$DEPLOY_CMD = @"
apt update -y
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi
if ! command -v docker-compose &>/dev/null; then
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-Linux-x86_64" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi
cd $REMOTE_PATH
ADMIN_PASS=`$(openssl rand -base64 12)
cat > .env << EOF
SECRET_KEY=`$(openssl rand -hex 32)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=`$ADMIN_PASS
EOF
docker-compose up -d --build
echo "========================================"
echo "部署完成!"
echo "管理员密码: `$ADMIN_PASS"
echo "========================================"
"@

ssh -p $PORT "$USER@$SERVER" $DEPLOY_CMD

Write-Host ""
Write-Host "[4/4] 部署完成!" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址: http://$SERVER" -ForegroundColor Cyan
Write-Host "API文档: http://$SERVER/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "请记录上面显示的管理员密码!" -ForegroundColor Red

Read-Host "按回车键退出"
