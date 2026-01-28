import os
import secrets
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 基础配置
    APP_NAME: str = "心跳验证系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # 安全配置
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7天
    
    # 速率限制
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "200"))
    RATE_LIMIT_PER_SECOND: int = int(os.getenv("RATE_LIMIT_PER_SECOND", "10"))
    
    # 安全：允许的域名和主机
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    ALLOWED_HOSTS: str = os.getenv("ALLOWED_HOSTS", "*")
    
    # 数据库配置
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./heartbeat.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "")  # 可选Redis缓存
    
    # 心跳配置
    HEARTBEAT_INTERVAL: int = 60  # 心跳间隔（秒）
    HEARTBEAT_TIMEOUT: int = 180  # 心跳超时（秒）
    MAX_DEVICES: int = 1  # 默认最大设备数
    
    # 安全：失败尝试限制
    MAX_FAILED_ATTEMPTS: int = int(os.getenv("MAX_FAILED_ATTEMPTS", "10"))
    BLOCK_DURATION: int = int(os.getenv("BLOCK_DURATION", "3600"))  # 封禁时长（秒）
    
    # 管理员配置
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    _admin_password_env: str = os.getenv("ADMIN_PASSWORD", "")
    ADMIN_PASSWORD: str = _admin_password_env if _admin_password_env else secrets.token_urlsafe(12)
    ADMIN_PASSWORD_AUTO_GENERATED: bool = not _admin_password_env
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # 日志配置
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"

settings = Settings()
