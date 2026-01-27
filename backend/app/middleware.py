"""
安全中间件模块
包含：速率限制、安全头部、IP黑名单、请求签名验证
"""

import time
import hashlib
import hmac
from datetime import datetime
from typing import Dict, Set
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings

# 速率限制器
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute", "10/second"],
    storage_uri="memory://"
)

# IP黑名单（内存存储，生产环境应使用Redis）
ip_blacklist: Set[str] = set()
# 失败尝试计数
failed_attempts: Dict[str, Dict] = {}

# 配置
MAX_FAILED_ATTEMPTS = 10
BLOCK_DURATION = 3600  # 1小时


def get_client_ip(request: Request) -> str:
    """获取真实客户端IP"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"


def check_ip_blacklist(ip: str) -> bool:
    """检查IP是否在黑名单中"""
    return ip in ip_blacklist


def record_failed_attempt(ip: str):
    """记录失败尝试"""
    now = time.time()
    if ip not in failed_attempts:
        failed_attempts[ip] = {"count": 0, "first_attempt": now}
    
    info = failed_attempts[ip]
    # 如果超过时间窗口，重置计数
    if now - info["first_attempt"] > BLOCK_DURATION:
        info["count"] = 0
        info["first_attempt"] = now
    
    info["count"] += 1
    
    # 超过阈值，加入黑名单
    if info["count"] >= MAX_FAILED_ATTEMPTS:
        ip_blacklist.add(ip)
        return True
    return False


def clear_failed_attempts(ip: str):
    """清除失败尝试记录"""
    if ip in failed_attempts:
        del failed_attempts[ip]


def generate_request_signature(data: str, timestamp: str) -> str:
    """生成请求签名"""
    message = f"{data}{timestamp}{settings.SECRET_KEY}"
    return hmac.new(
        settings.SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_request_signature(data: str, timestamp: str, signature: str) -> bool:
    """验证请求签名"""
    # 检查时间戳有效性（5分钟内）
    try:
        ts = int(timestamp)
        now = int(time.time())
        if abs(now - ts) > 300:
            return False
    except ValueError:
        return False
    
    expected = generate_request_signature(data, timestamp)
    return hmac.compare_digest(expected, signature)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """安全头部中间件"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 安全响应头
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # HSTS (仅生产环境)
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


class IPBlacklistMiddleware(BaseHTTPMiddleware):
    """IP黑名单中间件"""
    
    async def dispatch(self, request: Request, call_next):
        client_ip = get_client_ip(request)
        
        if check_ip_blacklist(client_ip):
            return Response(
                content='{"detail": "IP已被封禁"}',
                status_code=403,
                media_type="application/json"
            )
        
        response = await call_next(request)
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = get_client_ip(request)
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        # 记录慢请求
        if process_time > 1.0:
            print(f"[慢请求] {request.method} {request.url.path} - {client_ip} - {process_time:.3f}s")
        
        response.headers["X-Process-Time"] = str(process_time)
        return response


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """速率限制异常处理"""
    client_ip = get_client_ip(request)
    record_failed_attempt(client_ip)
    
    return Response(
        content='{"detail": "请求过于频繁，请稍后再试"}',
        status_code=429,
        media_type="application/json"
    )


# 防重放攻击：Nonce存储
used_nonces: Dict[str, float] = {}
NONCE_EXPIRY = 300  # 5分钟


def verify_nonce(nonce: str) -> bool:
    """验证Nonce（防重放）"""
    now = time.time()
    
    # 清理过期Nonce
    expired = [k for k, v in used_nonces.items() if now - v > NONCE_EXPIRY]
    for k in expired:
        del used_nonces[k]
    
    if nonce in used_nonces:
        return False
    
    used_nonces[nonce] = now
    return True


def hash_sensitive_data(data: str) -> str:
    """哈希敏感数据"""
    return hashlib.sha256(f"{data}{settings.SECRET_KEY}".encode()).hexdigest()
