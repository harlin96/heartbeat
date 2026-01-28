# 心跳验证系统 - 使用指南

## 快速开始

**服务器地址**: `https://harlin.de5.net`

---

## 一、使用流程

1. 管理员创建应用 → 获取 `app_key`
2. 管理员生成卡密 → 发给用户
3. 用户激活卡密 → 获取 `token`
4. 用户定时心跳 → 验证授权

---

## 二、API接口

### 1. 激活卡密

```http
POST https://harlin.de5.net/api/heartbeat/activate
Content-Type: application/json

{
    "card_key": "XXXX-XXXX-XXXX-XXXX",
    "device_id": "设备唯一标识"
}
```

**成功响应**:
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2026-02-28T00:00:00",
    "remaining_days": 30
}
```

### 2. 心跳验证

```http
POST https://harlin.de5.net/api/heartbeat/check
Content-Type: application/json

{
    "app_key": "你的app_key",
    "token": "激活获得的token",
    "device_id": "设备唯一标识"
}
```

**成功响应**:
```json
{
    "success": true,
    "remaining_seconds": 2592000
}
```

---

## 三、Python 示例

```python
import requests
import hashlib
import platform
import time

class HeartbeatClient:
    def __init__(self, server_url, app_key):
        self.server_url = server_url.rstrip('/')
        self.app_key = app_key
        self.token = None
        self.device_id = self._get_device_id()
    
    def _get_device_id(self):
        info = f"{platform.node()}-{platform.machine()}-{platform.system()}"
        return hashlib.md5(info.encode()).hexdigest()
    
    def activate(self, card_key):
        resp = requests.post(f"{self.server_url}/api/heartbeat/activate", json={
            "card_key": card_key,
            "device_id": self.device_id
        }, timeout=10)
        data = resp.json()
        if data.get("success"):
            self.token = data["token"]
            print(f"✅ 激活成功！到期: {data['expires_at']}")
        else:
            print(f"❌ 激活失败: {data.get('message')}")
        return data
    
    def heartbeat(self):
        if not self.token:
            return {"success": False, "message": "未激活"}
        resp = requests.post(f"{self.server_url}/api/heartbeat/check", json={
            "app_key": self.app_key,
            "token": self.token,
            "device_id": self.device_id
        }, timeout=10)
        return resp.json()
    
    def run(self, interval=60):
        print(f"🔄 心跳循环启动，间隔 {interval} 秒")
        while True:
            result = self.heartbeat()
            if result.get("success"):
                days = result.get('remaining_seconds', 0) // 86400
                print(f"✅ 心跳成功 | 剩余 {days} 天")
            else:
                print(f"❌ 授权失败: {result.get('message')}")
                break
            time.sleep(interval)

# 使用方法
if __name__ == "__main__":
    client = HeartbeatClient("https://harlin.de5.net", "你的app_key")
    client.activate("XXXX-XXXX-XXXX-XXXX")
    client.run(60)
```

---

## 四、JavaScript / Node.js 示例

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
        console.log(`✅ 激活成功！到期: ${resp.data.expires_at}`);
      } else {
        console.log(`❌ 激活失败: ${resp.data.message}`);
      }
      return resp.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async heartbeat() {
    if (!this.token) return { success: false, message: '未激活' };
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

  run(intervalMs = 60000) {
    console.log(`🔄 心跳循环启动，间隔 ${intervalMs/1000} 秒`);
    const loop = async () => {
      const result = await this.heartbeat();
      if (result.success) {
        const days = Math.floor((result.remaining_seconds || 0) / 86400);
        console.log(`✅ 心跳成功 | 剩余 ${days} 天`);
        setTimeout(loop, intervalMs);
      } else {
        console.log(`❌ 授权失败: ${result.message}`);
      }
    };
    loop();
  }
}

// 使用方法
const client = new HeartbeatClient('https://harlin.de5.net', '你的app_key');
client.activate('XXXX-XXXX-XXXX-XXXX').then(() => client.run(60000));
```

---

## 五、浏览器 JavaScript 示例

```javascript
class HeartbeatClient {
  constructor(serverUrl, appKey) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.appKey = appKey;
    this.token = localStorage.getItem('heartbeat_token');
    this.deviceId = this._getDeviceId();
  }

  _getDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = 'web-' + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  async activate(cardKey) {
    const resp = await fetch(`${this.serverUrl}/api/heartbeat/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_key: cardKey, device_id: this.deviceId })
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

  run(intervalMs = 60000) {
    setInterval(async () => {
      const result = await this.heartbeat();
      if (!result.success) {
        console.error('授权失败:', result.message);
        // 这里可以禁用功能或退出
      }
    }, intervalMs);
  }
}

// 使用方法
const client = new HeartbeatClient('https://harlin.de5.net', '你的app_key');
await client.activate('XXXX-XXXX-XXXX-XXXX');
client.run(60000);
```

---

## 六、错误处理

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 卡密不存在 | 卡密输入错误 | 检查卡密格式 |
| 卡密已使用 | 已被其他设备激活 | 联系管理员重置 |
| 授权已过期 | 卡密有效期到期 | 使用新卡密激活 |
| 设备不匹配 | device_id变化 | 保持设备标识一致 |
| Token无效 | token过期或错误 | 重新激活获取token |

---

## 七、注意事项

1. **设备标识**：保持 `device_id` 唯一且稳定，不要每次随机生成
2. **心跳频率**：建议60秒一次，不要过于频繁
3. **Token保存**：激活后保存token，避免重复激活
4. **错误重试**：心跳失败时适当重试，连续失败再禁用功能
5. **网络超时**：设置合理的超时时间（建议10秒）

---

## 八、完整API文档

访问 Swagger 文档：`https://harlin.de5.net/api/docs`
