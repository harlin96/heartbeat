# 心跳验证系统 - 使用指南

## 系统概述

心跳验证系统用于软件授权验证，支持卡密激活、多设备管理和心跳检测。

## 一、管理后台使用

### 1. 登录系统
- 访问地址：`http://服务器IP`
- 使用管理员账号密码登录

### 2. 创建应用
1. 点击左侧菜单「应用管理」
2. 点击「新建应用」
3. 填写应用名称、描述
4. 设置最大设备数（一个卡密允许绑定的设备数量）
5. 设置心跳间隔（建议60-120秒）
6. 保存后获得 `app_key` 和 `app_secret`

### 3. 生成卡密
1. 点击左侧菜单「卡密管理」
2. 点击「生成卡密」
3. 选择应用和卡密类型：
   - 天卡：1天
   - 周卡：7天
   - 月卡：30天
   - 年卡：365天
   - 永久卡：永不过期
4. 设置生成数量
5. 点击生成，可复制卡密分发给用户

### 4. 查看统计
仪表盘显示：
- 应用数量
- 卡密总数/已使用
- 活跃设备数
- 用户数量

---

## 二、客户端集成

### 接口说明

**基础URL**: `http://服务器IP/api`

### 1. 激活卡密

**请求**
```
POST /heartbeat/activate
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
    "token": "授权token",
    "expires_at": "2026-02-28T00:00:00",
    "remaining_days": 30
}
```

### 2. 心跳验证

**请求**
```
POST /heartbeat/check
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
```
GET /heartbeat/status?app_key=xxx&device_id=xxx
```

---

## 三、客户端代码示例

### Python
```python
import requests
import hashlib
import uuid

class HeartbeatClient:
    def __init__(self, server_url, app_key):
        self.server_url = server_url.rstrip('/')
        self.app_key = app_key
        self.token = None
        self.device_id = self._get_device_id()
    
    def _get_device_id(self):
        # 生成设备唯一标识
        import platform
        info = f"{platform.node()}-{platform.machine()}"
        return hashlib.md5(info.encode()).hexdigest()
    
    def activate(self, card_key):
        """激活卡密"""
        resp = requests.post(f"{self.server_url}/api/heartbeat/activate", json={
            "card_key": card_key,
            "device_id": self.device_id
        })
        data = resp.json()
        if data.get("success"):
            self.token = data["token"]
        return data
    
    def heartbeat(self):
        """发送心跳"""
        if not self.token:
            return {"success": False, "message": "未激活"}
        
        resp = requests.post(f"{self.server_url}/api/heartbeat/check", json={
            "app_key": self.app_key,
            "token": self.token,
            "device_id": self.device_id
        })
        return resp.json()

# 使用示例
client = HeartbeatClient("http://服务器IP", "你的app_key")

# 首次激活
result = client.activate("XXXX-XXXX-XXXX-XXXX")
print(result)

# 定时发送心跳
import time
while True:
    result = client.heartbeat()
    if not result.get("success"):
        print("授权验证失败:", result.get("message"))
        break
    time.sleep(60)  # 每60秒发送一次心跳
```

### C#
```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class HeartbeatClient
{
    private readonly HttpClient _client;
    private readonly string _serverUrl;
    private readonly string _appKey;
    private string _token;
    private readonly string _deviceId;

    public HeartbeatClient(string serverUrl, string appKey)
    {
        _client = new HttpClient();
        _serverUrl = serverUrl.TrimEnd('/');
        _appKey = appKey;
        _deviceId = GetDeviceId();
    }

    private string GetDeviceId()
    {
        var info = $"{Environment.MachineName}-{Environment.ProcessorCount}";
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(info));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }

    public async Task<bool> ActivateAsync(string cardKey)
    {
        var content = new StringContent(
            JsonSerializer.Serialize(new { card_key = cardKey, device_id = _deviceId }),
            Encoding.UTF8, "application/json");
        
        var resp = await _client.PostAsync($"{_serverUrl}/api/heartbeat/activate", content);
        var json = await resp.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(json);
        
        if (data.GetProperty("success").GetBoolean())
        {
            _token = data.GetProperty("token").GetString();
            return true;
        }
        return false;
    }

    public async Task<bool> HeartbeatAsync()
    {
        if (string.IsNullOrEmpty(_token)) return false;
        
        var content = new StringContent(
            JsonSerializer.Serialize(new { app_key = _appKey, token = _token, device_id = _deviceId }),
            Encoding.UTF8, "application/json");
        
        var resp = await _client.PostAsync($"{_serverUrl}/api/heartbeat/check", content);
        var json = await resp.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(json);
        
        return data.GetProperty("success").GetBoolean();
    }
}
```

---

## 四、常见问题

### Q: 卡密激活失败？
- 检查卡密是否正确
- 检查卡密是否已被使用
- 检查应用是否启用

### Q: 心跳验证失败？
- 检查token是否正确
- 检查设备ID是否一致
- 检查授权是否过期

### Q: 如何更换设备？
卡密绑定设备后，需要管理员在后台解绑或重新生成卡密。

---

## 五、API文档

完整API文档访问：`http://服务器IP/api/docs`
