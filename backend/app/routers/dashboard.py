from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models import User, Application, Card, Device, HeartbeatLog, UserRole
from app.schemas import DashboardStats
from app.auth import get_admin_user, get_agent_or_admin, get_current_user

router = APIRouter(prefix="/dashboard", tags=["仪表盘"])

@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """获取统计数据"""
    now = datetime.utcnow()
    
    if current_user.role == UserRole.ADMIN:
        # 管理员看全部数据
        total_users = await db.scalar(select(func.count(User.id)))
        total_apps = await db.scalar(select(func.count(Application.id)))
        total_cards = await db.scalar(select(func.count(Card.id)))
        used_cards = await db.scalar(select(func.count(Card.id)).where(Card.is_used == True))
        active_devices = await db.scalar(
            select(func.count(Device.id)).where(
                and_(Device.is_active == True, Device.expires_at > now)
            )
        )
        total_revenue = await db.scalar(
            select(func.sum(Card.price)).where(Card.is_used == True)
        ) or 0
    else:
        # 代理只看自己的数据
        total_users = await db.scalar(
            select(func.count(User.id)).where(User.parent_id == current_user.id)
        )
        total_apps = await db.scalar(
            select(func.count(Application.id)).where(Application.owner_id == current_user.id)
        )
        total_cards = await db.scalar(
            select(func.count(Card.id)).where(Card.creator_id == current_user.id)
        )
        used_cards = await db.scalar(
            select(func.count(Card.id)).where(
                and_(Card.creator_id == current_user.id, Card.is_used == True)
            )
        )
        # 获取代理的应用ID列表
        app_ids = await db.scalars(
            select(Application.id).where(Application.owner_id == current_user.id)
        )
        app_id_list = list(app_ids)
        
        if app_id_list:
            active_devices = await db.scalar(
                select(func.count(Device.id)).where(
                    and_(
                        Device.application_id.in_(app_id_list),
                        Device.is_active == True,
                        Device.expires_at > now
                    )
                )
            )
        else:
            active_devices = 0
        
        total_revenue = await db.scalar(
            select(func.sum(Card.price)).where(
                and_(Card.creator_id == current_user.id, Card.is_used == True)
            )
        ) or 0
    
    return DashboardStats(
        total_users=total_users or 0,
        total_apps=total_apps or 0,
        total_cards=total_cards or 0,
        used_cards=used_cards or 0,
        active_devices=active_devices or 0,
        total_revenue=total_revenue
    )

@router.get("/recent-heartbeats")
async def get_recent_heartbeats(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """获取最近心跳记录"""
    query = select(HeartbeatLog).order_by(HeartbeatLog.created_at.desc()).limit(limit)
    
    if current_user.role != UserRole.ADMIN:
        # 获取代理的应用ID列表
        app_ids = await db.scalars(
            select(Application.id).where(Application.owner_id == current_user.id)
        )
        app_id_list = list(app_ids)
        if app_id_list:
            query = query.where(HeartbeatLog.application_id.in_(app_id_list))
        else:
            return []
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        {
            "id": log.id,
            "device_id": log.device_id,
            "application_id": log.application_id,
            "ip_address": log.ip_address,
            "status": log.status,
            "message": log.message,
            "created_at": log.created_at
        }
        for log in logs
    ]

@router.get("/active-devices")
async def get_active_devices(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """获取活跃设备列表"""
    now = datetime.utcnow()
    timeout = now - timedelta(seconds=180)
    
    query = select(Device).where(
        and_(
            Device.is_active == True,
            Device.expires_at > now,
            Device.last_heartbeat > timeout
        )
    ).order_by(Device.last_heartbeat.desc()).limit(limit)
    
    if current_user.role != UserRole.ADMIN:
        app_ids = await db.scalars(
            select(Application.id).where(Application.owner_id == current_user.id)
        )
        app_id_list = list(app_ids)
        if app_id_list:
            query = query.where(Device.application_id.in_(app_id_list))
        else:
            return []
    
    result = await db.execute(query)
    devices = result.scalars().all()
    
    return [
        {
            "id": d.id,
            "device_id": d.device_id,
            "application_id": d.application_id,
            "expires_at": d.expires_at,
            "last_heartbeat": d.last_heartbeat,
            "ip_address": d.ip_address,
            "remaining_days": (d.expires_at - now).days
        }
        for d in devices
    ]
