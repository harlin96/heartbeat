from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import select
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.database import init_db, async_session
from app.models import User, UserRole
from app.auth import get_password_hash
from app.routers import auth, applications, cards, heartbeat, agents, dashboard
from app.middleware import (
    limiter,
    SecurityHeadersMiddleware,
    IPBlacklistMiddleware,
    RequestLoggingMiddleware,
    rate_limit_exceeded_handler
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    await init_db()
    
    # 创建默认管理员
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == settings.ADMIN_USERNAME))
        if not result.scalar_one_or_none():
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=get_password_hash(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN
            )
            db.add(admin)
            await db.commit()
            print(f"[初始化] 创建管理员账户: {settings.ADMIN_USERNAME}")
    
    print(f"[启动] {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"[启动] 管理后台: http://{settings.HOST}:{settings.PORT}")
    print(f"[启动] API文档: http://{settings.HOST}:{settings.PORT}/docs")
    
    yield
    
    print("[关闭] 服务已停止")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="心跳验证系统 - 支持卡密管理、代理分发、多应用管理",
    lifespan=lifespan
)

# 速率限制
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# 安全中间件（顺序很重要：先执行的放后面）
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(IPBlacklistMiddleware)

# CORS配置（生产环境应限制具体域名）
allowed_origins = ["*"] if settings.DEBUG else settings.ALLOWED_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 可信主机（防止Host头攻击）
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS.split(",")
    )

# 注册路由
app.include_router(auth.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(cards.router, prefix="/api")
app.include_router(heartbeat.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "api": "/api"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
