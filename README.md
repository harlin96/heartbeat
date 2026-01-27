# 心跳验证系统

一个完整的软件授权验证系统,支持卡密管理、代理分发、多应用管理和自动心跳验证。

## 功能特点

- ✅ **卡密系统** - 支持天卡/周卡/月卡/年卡/永久卡
- ✅ **代理分发** - 多级代理、折扣率、余额管理
- ✅ **多应用管理** - 一个系统管理多个应用
- ✅ **心跳验证** - 实时验证授权状态
- ✅ **设备限制** - 可配置最大设备数
- ✅ **管理后台** - 现代化Web管理界面
- ✅ **一键部署** - Linux服务器自动部署

## 快速部署

### Linux服务器一键部署

```bash
# 1. 上传项目到服务器
scp -r 心跳 root@your-server:/opt/

# 2. 运行部署脚本
cd /opt/心跳
chmod +x deploy.sh
./deploy.sh
```

部署完成后会显示:
- 管理后台地址
- 管理员用户名和密码
- API文档地址

### 手动部署

#### 后端
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 前端
```bash
cd frontend
npm install
npm run build
```

## API接口

### 心跳验证
```
POST /api/heartbeat
{
  "app_key": "应用Key",
  "token": "用户Token",
  "device_id": "设备ID"
}
```

### 激活卡密
```
POST /api/cards/activate
{
  "card_key": "XXXX-XXXX-XXXX-XXXX",
  "device_id": "设备ID",
  "extra_info": "可选额外信息"
}
```

### 查询授权状态
```
GET /api/heartbeat/status?app_key=xxx&token=xxx&device_id=xxx
```

## 客户端SDK

### Python
```python
from heartbeat_sdk import HeartbeatClient

client = HeartbeatClient("http://your-server.com", "your-app-key")

# 激活
result = client.activate("XXXX-XXXX-XXXX-XXXX")
if result.success:
    print(f"激活成功! 到期: {result.expires_at}")
    client.save_token()
    
    # 启动自动心跳
    client.start_heartbeat(interval=60)
```

### C#
```csharp
var client = new HeartbeatClient("http://your-server.com", "your-app-key");

var result = await client.ActivateAsync("XXXX-XXXX-XXXX-XXXX");
if (result.Success)
{
    client.SaveToken();
    client.StartHeartbeat(60);
}
```

### JavaScript
```javascript
const client = new HeartbeatClient('http://your-server.com', 'your-app-key');

const result = await client.activate('XXXX-XXXX-XXXX-XXXX');
if (result.success) {
    client.saveToken();
    client.startHeartbeat(60);
}
```

## 项目结构

```
心跳/
├── backend/           # 后端API服务
│   ├── app/
│   │   ├── main.py       # 主入口
│   │   ├── config.py     # 配置
│   │   ├── models.py     # 数据模型
│   │   ├── schemas.py    # API模式
│   │   ├── auth.py       # 认证
│   │   ├── database.py   # 数据库
│   │   └── routers/      # API路由
│   └── requirements.txt
├── frontend/          # 管理后台前端
│   ├── src/
│   └── package.json
├── sdk/               # 客户端SDK
│   ├── python/
│   ├── csharp/
│   └── javascript/
├── deploy.sh          # 一键部署脚本
└── README.md
```

## 卡密类型

| 类型 | 代码 | 有效期 |
|------|------|--------|
| 天卡 | day | 1天 |
| 周卡 | week | 7天 |
| 月卡 | month | 30天 |
| 年卡 | year | 365天 |
| 永久 | permanent | 100年 |

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| SECRET_KEY | JWT密钥 | 随机生成 |
| ADMIN_USERNAME | 管理员用户名 | admin |
| ADMIN_PASSWORD | 管理员密码 | admin123 |
| DATABASE_URL | 数据库连接 | sqlite |

## 技术栈

- **后端**: Python, FastAPI, SQLAlchemy, SQLite
- **前端**: React, TypeScript, TailwindCSS, Vite
- **部署**: Nginx, Systemd, Ubuntu/CentOS

## License

MIT License
