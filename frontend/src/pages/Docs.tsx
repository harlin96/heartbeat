import { Book, Code, Terminal, CheckCircle } from 'lucide-react';

export default function Docs() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">开发文档</h1>

      <div className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">系统概述</h2>
          </div>
          <p className="text-gray-600">
            心跳验证系统用于软件授权验证，支持卡密激活、多设备管理和心跳检测。
            客户端需要定期发送心跳请求来验证授权状态。
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold">API接口</h2>
          </div>
          
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium mb-2">1. 激活卡密</h3>
              <code className="block bg-gray-100 p-3 rounded text-sm mb-2">
                POST /api/heartbeat/activate
              </code>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">请求参数：</p>
                <pre className="bg-gray-50 p-2 rounded">{`{
  "card_key": "XXXX-XXXX-XXXX-XXXX",
  "device_id": "设备唯一标识",
  "extra_info": "可选的额外信息"
}`}</pre>
                <p className="font-medium mt-3 mb-1">响应：</p>
                <pre className="bg-gray-50 p-2 rounded">{`{
  "success": true,
  "message": "激活成功",
  "token": "授权token",
  "expires_at": "2026-02-28T00:00:00",
  "remaining_days": 30
}`}</pre>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium mb-2">2. 心跳验证</h3>
              <code className="block bg-gray-100 p-3 rounded text-sm mb-2">
                POST /api/heartbeat/check
              </code>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">请求参数：</p>
                <pre className="bg-gray-50 p-2 rounded">{`{
  "app_key": "应用的app_key",
  "token": "激活时获得的token",
  "device_id": "设备唯一标识"
}`}</pre>
                <p className="font-medium mt-3 mb-1">响应：</p>
                <pre className="bg-gray-50 p-2 rounded">{`{
  "success": true,
  "message": "验证成功",
  "expires_at": "2026-02-28T00:00:00",
  "remaining_seconds": 2592000,
  "server_time": "2026-01-28T00:00:00"
}`}</pre>
              </div>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-medium mb-2">3. 查询授权状态</h3>
              <code className="block bg-gray-100 p-3 rounded text-sm mb-2">
                GET /api/heartbeat/status?app_key=xxx&device_id=xxx
              </code>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Python 代码示例</h2>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">{`import requests
import hashlib
import time

class HeartbeatClient:
    def __init__(self, server_url, app_key):
        self.server_url = server_url.rstrip('/')
        self.app_key = app_key
        self.token = None
        self.device_id = self._get_device_id()
    
    def _get_device_id(self):
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
while True:
    result = client.heartbeat()
    if not result.get("success"):
        print("授权验证失败:", result.get("message"))
        break
    time.sleep(60)  # 每60秒发送一次心跳`}</pre>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">JavaScript / Node.js 代码示例</h2>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">{`// Node.js 示例 (需要 npm install axios crypto)
const axios = require('axios');
const crypto = require('crypto');
const os = require('os');

class HeartbeatClient {
  constructor(serverUrl, appKey) {
    this.serverUrl = serverUrl.replace(/\\/$/, '');
    this.appKey = appKey;
    this.token = null;
    this.deviceId = this._getDeviceId();
  }

  _getDeviceId() {
    const info = \`\${os.hostname()}-\${os.platform()}-\${os.arch()}\`;
    return crypto.createHash('md5').update(info).digest('hex');
  }

  async activate(cardKey) {
    try {
      const resp = await axios.post(\`\${this.serverUrl}/api/heartbeat/activate\`, {
        card_key: cardKey,
        device_id: this.deviceId
      });
      if (resp.data.success) {
        this.token = resp.data.token;
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
      const resp = await axios.post(\`\${this.serverUrl}/api/heartbeat/check\`, {
        app_key: this.appKey,
        token: this.token,
        device_id: this.deviceId
      });
      return resp.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

// 使用示例
const client = new HeartbeatClient('https://harlin.de5.net', '你的app_key');

// 激活卡密
client.activate('XXXX-XXXX-XXXX-XXXX').then(result => {
  console.log('激活结果:', result);
  
  // 定时心跳
  setInterval(async () => {
    const heartbeatResult = await client.heartbeat();
    if (!heartbeatResult.success) {
      console.error('授权验证失败:', heartbeatResult.message);
    }
  }, 60000); // 每60秒
});`}</pre>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">浏览器端使用</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">{`// 浏览器示例 (使用 fetch API)
class HeartbeatClient {
  constructor(serverUrl, appKey) {
    this.serverUrl = serverUrl.replace(/\\/$/, '');
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
    const resp = await fetch(\`\${this.serverUrl}/api/heartbeat/activate\`, {
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
    const resp = await fetch(\`\${this.serverUrl}/api/heartbeat/check\`, {
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
}

// 使用
const client = new HeartbeatClient('https://harlin.de5.net', '你的app_key');
await client.activate('XXXX-XXXX-XXXX-XXXX');
setInterval(() => client.heartbeat(), 60000);`}</pre>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold">使用流程</h2>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>在「应用管理」创建应用，获取 app_key</li>
            <li>在「卡密管理」为应用生成卡密</li>
            <li>客户端使用卡密调用激活接口，获取 token</li>
            <li>客户端定期调用心跳接口验证授权</li>
            <li>心跳失败则表示授权已过期或被禁用</li>
          </ol>
        </section>

        <section className="bg-blue-50 rounded-xl p-6">
          <p className="text-blue-800">
            <strong>完整API文档：</strong>访问 <code className="bg-blue-100 px-2 py-1 rounded">/api/docs</code> 查看Swagger文档
          </p>
        </section>
      </div>
    </div>
  );
}
