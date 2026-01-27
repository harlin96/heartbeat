from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class CardType(enum.Enum):
    DAY = "day"      # 天卡
    WEEK = "week"    # 周卡
    MONTH = "month"  # 月卡
    YEAR = "year"    # 年卡
    PERMANENT = "permanent"  # 永久卡

class UserRole(enum.Enum):
    ADMIN = "admin"      # 管理员
    AGENT = "agent"      # 代理
    USER = "user"        # 普通用户

# 管理员/代理用户表
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 上级代理
    balance = Column(Float, default=0.0)  # 余额
    discount = Column(Float, default=1.0)  # 折扣率 (0.0-1.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    children = relationship("User", backref="parent", remote_side=[id])
    applications = relationship("Application", back_populates="owner")
    cards_created = relationship("Card", back_populates="creator")

# 应用表
class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    app_key = Column(String(64), unique=True, index=True, nullable=False)
    app_secret = Column(String(64), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)
    max_devices = Column(Integer, default=1)  # 最大设备数
    heartbeat_interval = Column(Integer, default=60)  # 心跳间隔(秒)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    owner = relationship("User", back_populates="applications")
    cards = relationship("Card", back_populates="application")
    devices = relationship("Device", back_populates="application")

# 卡密表
class Card(Base):
    __tablename__ = "cards"
    
    id = Column(Integer, primary_key=True, index=True)
    card_key = Column(String(32), unique=True, index=True, nullable=False)
    card_type = Column(SQLEnum(CardType), nullable=False)
    duration_days = Column(Integer, nullable=False)  # 有效天数
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    price = Column(Float, default=0.0)  # 价格
    is_used = Column(Boolean, default=False)
    used_by = Column(String(100), nullable=True)  # 使用者标识
    used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # 到期时间
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    application = relationship("Application", back_populates="cards")
    creator = relationship("User", back_populates="cards_created")

# 授权设备表
class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), index=True, nullable=False)  # 设备标识
    user_token = Column(String(100), index=True, nullable=False)  # 用户token
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    card_key = Column(String(32), nullable=True)  # 使用的卡密
    expires_at = Column(DateTime, nullable=False)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(50), nullable=True)
    extra_info = Column(Text, nullable=True)  # 额外信息(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    application = relationship("Application", back_populates="devices")

# 心跳日志表
class HeartbeatLog(Base):
    __tablename__ = "heartbeat_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), index=True, nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    ip_address = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False)  # success, expired, invalid
    message = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# 充值记录表
class RechargeLog(Base):
    __tablename__ = "recharge_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    before_balance = Column(Float, nullable=False)
    after_balance = Column(Float, nullable=False)
    remark = Column(String(255), nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
