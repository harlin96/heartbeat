/**
 * 心跳验证系统 - JavaScript SDK
 * 适用于 Node.js 和浏览器环境
 */

class HeartbeatClient {
  constructor(serverUrl, appKey) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.appKey = appKey;
    this.token = null;
    this.deviceId = null;
    this.heartbeatTimer = null;
    this.onExpired = null;
    this.onError = null;
  }

  /**
   * 获取设备ID
   */
  getDeviceId() {
    if (this.deviceId) return this.deviceId;

    // 浏览器环境
    if (typeof window !== 'undefined') {
      let stored = localStorage.getItem('heartbeat_device_id');
      if (stored) {
        this.deviceId = stored;
        return this.deviceId;
      }
      // 生成新的设备ID
      this.deviceId = 'web_' + this._generateUUID();
      localStorage.setItem('heartbeat_device_id', this.deviceId);
    } else {
      // Node.js环境
      const os = require('os');
      const crypto = require('crypto');
      const info = `${os.hostname()}-${os.cpus().length}-${os.platform()}`;
      this.deviceId = crypto.createHash('md5').update(info).digest('hex');
    }
    return this.deviceId;
  }

  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  setDeviceId(deviceId) {
    this.deviceId = deviceId;
  }

  setToken(token) {
    this.token = token;
  }

  /**
   * 激活卡密
   */
  async activate(cardKey, extraInfo = null) {
    try {
      const response = await this._post('/api/cards/activate', {
        card_key: cardKey,
        device_id: this.getDeviceId(),
        extra_info: extraInfo
      });

      if (response.success) {
        this.token = response.token;
        return {
          success: true,
          message: response.message,
          token: response.token,
          expiresAt: new Date(response.expires_at),
          remainingDays: response.remaining_days
        };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: `网络错误: ${error.message}` };
    }
  }

  /**
   * 发送心跳
   */
  async heartbeat() {
    if (!this.token) {
      return { success: false, message: '未激活' };
    }

    try {
      const response = await this._post('/api/heartbeat', {
        app_key: this.appKey,
        token: this.token,
        device_id: this.getDeviceId()
      });

      return {
        success: response.success,
        message: response.message,
        expiresAt: response.expires_at ? new Date(response.expires_at) : null,
        remainingSeconds: response.remaining_seconds,
        serverTime: new Date(response.server_time)
      };
    } catch (error) {
      return { success: false, message: `网络错误: ${error.message}` };
    }
  }

  /**
   * 检查授权状态
   */
  async checkStatus() {
    if (!this.token) {
      return { authorized: false, message: '未激活' };
    }

    try {
      const params = new URLSearchParams({
        app_key: this.appKey,
        token: this.token,
        device_id: this.getDeviceId()
      });
      const response = await this._get(`/api/heartbeat/status?${params}`);
      return response;
    } catch (error) {
      return { authorized: false, message: `网络错误: ${error.message}` };
    }
  }

  /**
   * 启动自动心跳
   */
  startHeartbeat(intervalSeconds = 60, onExpired = null, onError = null) {
    if (this.heartbeatTimer) return;

    this.onExpired = onExpired;
    this.onError = onError;

    const doHeartbeat = async () => {
      const result = await this.heartbeat();
      if (!result.success) {
        if (result.message.includes('过期') && this.onExpired) {
          this.onExpired(result);
        } else if (this.onError) {
          this.onError(result);
        }
      }
    };

    doHeartbeat();
    this.heartbeatTimer = setInterval(doHeartbeat, intervalSeconds * 1000);
  }

  /**
   * 停止自动心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 保存token (浏览器环境)
   */
  saveToken() {
    if (typeof window !== 'undefined' && this.token) {
      localStorage.setItem('heartbeat_token', this.token);
    }
  }

  /**
   * 加载token (浏览器环境)
   */
  loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('heartbeat_token');
      return !!this.token;
    }
    return false;
  }

  async _post(path, data) {
    const response = await fetch(this.serverUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async _get(path) {
    const response = await fetch(this.serverUrl + path);
    return response.json();
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HeartbeatClient };
}

/* 使用示例:

// 浏览器
const client = new HeartbeatClient('http://your-server.com', 'your-app-key');

// 激活
const result = await client.activate('XXXX-XXXX-XXXX-XXXX');
if (result.success) {
  console.log('激活成功!', result.expiresAt);
  client.saveToken();
  
  // 启动自动心跳
  client.startHeartbeat(60, 
    (r) => alert('授权已过期!'),
    (r) => console.error('心跳错误:', r.message)
  );
}

// Node.js
const { HeartbeatClient } = require('./heartbeat-sdk');
// ... 同上
*/
