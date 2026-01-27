from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models import CardType, UserRole

# ==================== 用户相关 ====================
class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.USER

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    balance: float
    discount: float
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ==================== 应用相关 ====================
class ApplicationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_devices: int = 1
    heartbeat_interval: int = 60

class ApplicationResponse(BaseModel):
    id: int
    name: str
    app_key: str
    app_secret: str
    description: Optional[str]
    max_devices: int
    heartbeat_interval: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ApplicationPublic(BaseModel):
    id: int
    name: str
    app_key: str
    max_devices: int
    heartbeat_interval: int
    
    class Config:
        from_attributes = True

# ==================== 卡密相关 ====================
class CardCreate(BaseModel):
    card_type: CardType
    application_id: int
    count: int = 1  # 生成数量
    price: float = 0.0

class CardResponse(BaseModel):
    id: int
    card_key: str
    card_type: CardType
    duration_days: int
    application_id: int
    price: float
    is_used: bool
    used_by: Optional[str]
    used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class CardActivate(BaseModel):
    card_key: str
    device_id: str
    extra_info: Optional[str] = None

class CardActivateResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    expires_at: Optional[datetime] = None
    remaining_days: Optional[int] = None

# ==================== 心跳相关 ====================
class HeartbeatRequest(BaseModel):
    app_key: str
    token: str
    device_id: str

class HeartbeatResponse(BaseModel):
    success: bool
    message: str
    expires_at: Optional[datetime] = None
    remaining_seconds: Optional[int] = None
    server_time: datetime

# ==================== 代理相关 ====================
class AgentCreate(BaseModel):
    username: str
    password: str
    discount: float = 1.0  # 折扣率

class AgentRecharge(BaseModel):
    user_id: int
    amount: float
    remark: Optional[str] = None

# ==================== 统计相关 ====================
class DashboardStats(BaseModel):
    total_users: int
    total_apps: int
    total_cards: int
    used_cards: int
    active_devices: int
    total_revenue: float

# ==================== 设备相关 ====================
class DeviceResponse(BaseModel):
    id: int
    device_id: str
    user_token: str
    application_id: int
    expires_at: datetime
    last_heartbeat: datetime
    ip_address: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
