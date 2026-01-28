# 心跳验证系统

一个完整的软件授权验证系统，支持卡密管理、代理分发、多应用管理和自动心跳验证。

## 功能特点

- ✅ **卡密系统** - 支持天卡/周卡/月卡/年卡/永久卡
- ✅ **多应用管理** - 一个系统管理多个应用
- ✅ **心跳验证** - 实时验证授权状态
- ✅ **设备限制** - 可配置最大设备数
- ✅ **代理管理** - 支持多代理账户
- ✅ **管理后台** - 现代化Web管理界面（苹果风格）
- ✅ **Docker部署** - 一键Docker Compose部署

## 快速部署

### 一键安装（推荐）

```bash
# 在服务器上执行
bash <(curl -sL https://raw.githubusercontent.com/harlin96/heartbeat/main/install.sh)
```

### 手动Docker部署

```bash
# 克隆项目
git clone https://github.com/harlin96/heartbeat.git
cd heartbeat

# 配置环境变量
cp .env.example .env
# 编辑 .env 设置 ADMIN_PASSWORD 和 SECRET_KEY

# 启动服务
docker-compose up -d --build
```

部署完成后访问: `http://服务器IP`

---

## API接口文档

### 基础URL
```
https://你的域名/api
```

### 1. 激活卡密

**请求**
```http
POST /api/heartbeat/activate
Content-Type: application/json

{
  "card_key": "XXXX-XXXX-XXXX-XXXX",
  "device_id": "设备唯一标识",
  "extra_info": "可选的额外信息"
}
```

**响应**
```json
{
  "success": true,
  "message": "激活成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2026-02-28T00:00:00",
  "remaining_days": 30
}
```

### 2. 心跳验证

**请求**
```http
POST /api/heartbeat/check
Content-Type: application/json

{
  "app_key": "应用的app_key",
  "token": "激活时获得的token",
  "device_id": "设备唯一标识"
}
```

**响应**
```json
{
  "success": true,
  "message": "验证成功",
  "expires_at": "2026-02-28T00:00:00",
  "remaining_seconds": 2592000,
  "server_time": "2026-01-28T00:00:00"
}
```

### 3. 查询授权状态

**请求**
```http
GET /api/heartbeat/status?app_key=xxx&device_id=xxx
```

---

## 客户端集成

### Python 完整示例

```python
import requests
import hashlib
import time
import platform

class HeartbeatClient:
    def __init__(self, server_url, app_key):
        self.server_url = server_url.rstrip('/')
        self.app_key = app_key
        self.token = None
        self.device_id = self._get_device_id()
    
    def _get_device_id(self):
        """生成设备唯一标识"""
        info = f"{platform.node()}-{platform.machine()}-{platform.system()}"
        return hashlib.md5(info.encode()).hexdigest()
    
    def activate(self, card_key):
        """激活卡密"""
        try:
            resp = requests.post(
                f"{self.server_url}/api/heartbeat/activate",
                json={
                    "card_key": card_key,
                    "device_id": self.device_id
                },
                timeout=10
            )
            data = resp.json()
            if data.get("success"):
                self.token = data["token"]
                print(f"✅ 激活成功！到期时间: {data['expires_at']}")
            else:
                print(f"❌ 激活失败: {data.get('message')}")
            return data
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def heartbeat(self):
        """发送心跳验证"""
        if not self.token:
            return {"success": False, "message": "未激活"}
        
        try:
            resp = requests.post(
                f"{self.server_url}/api/heartbeat/check",
                json={
                    "app_key": self.app_key,
                    "token": self.token,
                    "device_id": self.device_id
                },
                timeout=10
            )
            return resp.json()
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def run_heartbeat_loop(self, interval=60):
        """运行心跳循环"""
        print(f"🔄 启动心跳循环，间隔 {interval} 秒")
        while True:
            result = self.heartbeat()
            if result.get("success"):
                print(f"✅ 心跳成功 | 剩余: {result.get('remaining_seconds', 0)//86400} 天")
            else:
                print(f"❌ 心跳失败: {result.get('message')}")
                break
            time.sleep(interval)


# 使用示例
if __name__ == "__main__":
    # 初始化客户端
    client = HeartbeatClient(
        server_url="https://harlin.de5.net",
        app_key="你的app_key"
    )
    
    # 激活卡密
    result = client.activate("XXXX-XXXX-XXXX-XXXX")
    
    if result.get("success"):
        # 启动心跳循环
        client.run_heartbeat_loop(interval=60)
```

### JavaScript / Node.js 完整示例

```javascript
const axios = require('axios');
const crypto = require('crypto');
const os = require('os');

class HeartbeatClient {
  constructor(serverUrl, appKey) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.appKey = appKey;
    this.token = null;
    this.deviceId = this._getDeviceId();
  }

  _getDeviceId() {
    const info = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash('md5').update(info).digest('hex');
  }

  async activate(cardKey) {
    try {
      const resp = await axios.post(`${this.serverUrl}/api/heartbeat/activate`, {
        card_key: cardKey,
        device_id: this.deviceId
      }, { timeout: 10000 });
      
      if (resp.data.success) {
        this.token = resp.data.token;
        console.log(`✅ 激活成功！到期时间: ${resp.data.expires_at}`);
      } else {
        console.log(`❌ 激活失败: ${resp.data.message}`);
      }
      return resp.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async heartbeat() {
    if (!this.token) {
      return { success: false, message: '未激活' };
    }
    
    try {
      const resp = await axios.post(`${this.serverUrl}/api/heartbeat/check`, {
        app_key: this.appKey,
        token: this.token,
        device_id: this.deviceId
      }, { timeout: 10000 });
      return resp.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  startHeartbeatLoop(intervalMs = 60000) {
    console.log(`🔄 启动心跳循环，间隔 ${intervalMs/1000} 秒`);
    
    const loop = async () => {
      const result = await this.heartbeat();
      if (result.success) {
        const days = Math.floor((result.remaining_seconds || 0) / 86400);
        console.log(`✅ 心跳成功 | 剩余: ${days} 天`);
      } else {
        console.log(`❌ 心跳失败: ${result.message}`);
        return; // 停止循环
      }
      setTimeout(loop, intervalMs);
    };
    
    loop();
  }
}

// 使用示例
(async () => {
  const client = new HeartbeatClient(
    'https://harlin.de5.net',
    '你的app_key'
  );
  
  // 激活卡密
  const result = await client.activate('XXXX-XXXX-XXXX-XXXX');
  
  if (result.success) {
    // 启动心跳循环
    client.startHeartbeatLoop(60000);
  }
})();
```

### 浏览器 JavaScript 示例

```html
<script>
class HeartbeatClient {
  constructor(serverUrl, appKey) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.appKey = appKey;
    this.token = localStorage.getItem('heartbeat_token');
    this.deviceId = this._getDeviceId();
  }

  _getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'web-' + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  async activate(cardKey) {
    const resp = await fetch(`${this.serverUrl}/api/heartbeat/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_key: cardKey,
        device_id: this.deviceId
      })
    });
    const data = await resp.json();
    if (data.success) {
      this.token = data.token;
      localStorage.setItem('heartbeat_token', data.token);
    }
    return data;
  }

  async heartbeat() {
    if (!this.token) return { success: false, message: '未激活' };
    
    const resp = await fetch(`${this.serverUrl}/api/heartbeat/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: this.appKey,
        token: this.token,
        device_id: this.deviceId
      })
    });
    return await resp.json();
  }

  startHeartbeatLoop(intervalMs = 60000) {
    setInterval(async () => {
      const result = await this.heartbeat();
      if (!result.success) {
        console.error('授权验证失败:', result.message);
        // 可以在这里触发退出或禁用功能
      }
    }, intervalMs);
  }
}

// 使用
const client = new HeartbeatClient('https://harlin.de5.net', '你的app_key');
</script>
```

---

## 使用流程

1. **管理员创建应用** - 在「应用管理」页面创建应用，获取 `app_key`
2. **生成卡密** - 在「卡密管理」页面为应用生成卡密
3. **客户端激活** - 用户使用卡密调用激活接口，获取 `token`
4. **定时心跳** - 客户端定期调用心跳接口验证授权
5. **验证失败处理** - 心跳失败则表示授权已过期或被禁用

---

## 卡密类型

| 类型 | 代码 | 有效期 |
|------|------|--------|
| 天卡 | day | 1天 |
| 周卡 | week | 7天 |
| 月卡 | month | 30天 |
| 年卡 | year | 365天 |
| 永久 | permanent | 100年 |

---

## 项目结构

```
heartbeat/
├── backend/              # 后端API服务
│   ├── app/
│   │   ├── main.py       # FastAPI入口
│   │   ├── config.py     # 配置
│   │   ├── models.py     # 数据模型
│   │   ├── schemas.py    # Pydantic模式
│   │   ├── auth.py       # JWT认证
│   │   ├── database.py   # 数据库连接
│   │   └── routers/      # API路由
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             # React管理后台
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 通用组件
│   │   └── api.ts        # API客户端
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml    # Docker编排
├── install.sh            # 一键安装脚本
└── README.md
```

---

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| SECRET_KEY | JWT密钥 | 随机生成 |
| ADMIN_USERNAME | 管理员用户名 | admin |
| ADMIN_PASSWORD | 管理员密码 | 随机生成 |
| DATABASE_URL | 数据库连接 | sqlite |

---

## 技术栈

- **后端**: Python 3.11, FastAPI, SQLAlchemy (async), SQLite/PostgreSQL
- **前端**: React 18, TypeScript, TailwindCSS, Vite
- **部署**: Docker, Docker Compose, Nginx

---

## Swagger API文档

部署后访问: `https://你的域名/api/docs`

---

## License

MIT License
