"""
心跳验证系统 - Python SDK
支持Python 3.7+
"""

import time
import hashlib
import platform
import threading
import requests
from typing import Optional, Callable
from dataclasses import dataclass
from datetime import datetime


@dataclass
class HeartbeatResult:
    """心跳结果"""
    success: bool
    message: str
    expires_at: Optional[datetime] = None
    remaining_seconds: Optional[int] = None
    server_time: Optional[datetime] = None


@dataclass
class ActivateResult:
    """激活结果"""
    success: bool
    message: str
    token: Optional[str] = None
    expires_at: Optional[datetime] = None
    remaining_days: Optional[int] = None


class HeartbeatClient:
    """心跳验证客户端"""
    
    def __init__(self, server_url: str, app_key: str):
        """
        初始化客户端
        
        Args:
            server_url: 服务器地址,如 http://your-server.com
            app_key: 应用Key
        """
        self.server_url = server_url.rstrip('/')
        self.app_key = app_key
        self.token: Optional[str] = None
        self.device_id: Optional[str] = None
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._running = False
        self._interval = 60
        self._on_expired: Optional[Callable] = None
        self._on_error: Optional[Callable] = None
    
    def get_device_id(self) -> str:
        """获取设备唯一标识"""
        if self.device_id:
            return self.device_id
        
        # 基于硬件信息生成设备ID
        info = f"{platform.node()}-{platform.machine()}-{platform.processor()}"
        self.device_id = hashlib.md5(info.encode()).hexdigest()
        return self.device_id
    
    def set_device_id(self, device_id: str):
        """手动设置设备ID"""
        self.device_id = device_id
    
    def activate(self, card_key: str, extra_info: str = None) -> ActivateResult:
        """
        激活卡密
        
        Args:
            card_key: 卡密
            extra_info: 额外信息(可选)
            
        Returns:
            ActivateResult: 激活结果
        """
        try:
            response = requests.post(
                f"{self.server_url}/api/cards/activate",
                json={
                    "card_key": card_key,
                    "device_id": self.get_device_id(),
                    "extra_info": extra_info
                },
                timeout=10
            )
            data = response.json()
            
            if data.get("success"):
                self.token = data.get("token")
                return ActivateResult(
                    success=True,
                    message=data.get("message", "激活成功"),
                    token=self.token,
                    expires_at=datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00")) if data.get("expires_at") else None,
                    remaining_days=data.get("remaining_days")
                )
            else:
                return ActivateResult(
                    success=False,
                    message=data.get("message", "激活失败")
                )
        except Exception as e:
            return ActivateResult(success=False, message=f"网络错误: {str(e)}")
    
    def heartbeat(self) -> HeartbeatResult:
        """
        发送心跳
        
        Returns:
            HeartbeatResult: 心跳结果
        """
        if not self.token:
            return HeartbeatResult(success=False, message="未激活,请先调用activate()")
        
        try:
            response = requests.post(
                f"{self.server_url}/api/heartbeat",
                json={
                    "app_key": self.app_key,
                    "token": self.token,
                    "device_id": self.get_device_id()
                },
                timeout=10
            )
            data = response.json()
            
            return HeartbeatResult(
                success=data.get("success", False),
                message=data.get("message", ""),
                expires_at=datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00")) if data.get("expires_at") else None,
                remaining_seconds=data.get("remaining_seconds"),
                server_time=datetime.fromisoformat(data["server_time"].replace("Z", "+00:00")) if data.get("server_time") else None
            )
        except Exception as e:
            return HeartbeatResult(success=False, message=f"网络错误: {str(e)}")
    
    def check_status(self) -> dict:
        """
        检查授权状态
        
        Returns:
            dict: 状态信息
        """
        if not self.token:
            return {"authorized": False, "message": "未激活"}
        
        try:
            response = requests.get(
                f"{self.server_url}/api/heartbeat/status",
                params={
                    "app_key": self.app_key,
                    "token": self.token,
                    "device_id": self.get_device_id()
                },
                timeout=10
            )
            return response.json()
        except Exception as e:
            return {"authorized": False, "message": f"网络错误: {str(e)}"}
    
    def start_heartbeat(self, interval: int = 60, on_expired: Callable = None, on_error: Callable = None):
        """
        启动自动心跳
        
        Args:
            interval: 心跳间隔(秒)
            on_expired: 授权过期回调
            on_error: 错误回调
        """
        if self._running:
            return
        
        self._interval = interval
        self._on_expired = on_expired
        self._on_error = on_error
        self._running = True
        
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()
    
    def stop_heartbeat(self):
        """停止自动心跳"""
        self._running = False
        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=5)
    
    def _heartbeat_loop(self):
        """心跳循环"""
        while self._running:
            result = self.heartbeat()
            
            if not result.success:
                if "过期" in result.message and self._on_expired:
                    self._on_expired(result)
                elif self._on_error:
                    self._on_error(result)
            
            time.sleep(self._interval)
    
    def set_token(self, token: str):
        """设置已有的token"""
        self.token = token
    
    def save_token(self, filepath: str = "heartbeat_token.txt"):
        """保存token到文件"""
        if self.token:
            with open(filepath, "w") as f:
                f.write(f"{self.token}\n{self.device_id or ''}")
    
    def load_token(self, filepath: str = "heartbeat_token.txt") -> bool:
        """从文件加载token"""
        try:
            with open(filepath, "r") as f:
                lines = f.read().strip().split("\n")
                if lines:
                    self.token = lines[0]
                    if len(lines) > 1:
                        self.device_id = lines[1]
                    return True
        except FileNotFoundError:
            pass
        return False


# 使用示例
if __name__ == "__main__":
    # 初始化客户端
    client = HeartbeatClient(
        server_url="http://your-server.com",
        app_key="your-app-key"
    )
    
    # 方式1: 新用户激活卡密
    result = client.activate("XXXX-XXXX-XXXX-XXXX")
    if result.success:
        print(f"激活成功! 到期时间: {result.expires_at}")
        print(f"Token: {result.token}")
        client.save_token()  # 保存token以便下次使用
    else:
        print(f"激活失败: {result.message}")
    
    # 方式2: 老用户加载已有token
    # if client.load_token():
    #     status = client.check_status()
    #     if status.get("authorized"):
    #         print(f"授权有效,剩余{status.get('remaining_days')}天")
    
    # 启动自动心跳
    def on_expired(result):
        print(f"授权已过期: {result.message}")
        # 这里可以弹出重新激活窗口
    
    def on_error(result):
        print(f"心跳错误: {result.message}")
    
    client.start_heartbeat(interval=60, on_expired=on_expired, on_error=on_error)
    
    # 保持程序运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        client.stop_heartbeat()
