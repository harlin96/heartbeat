from datetime import datetime
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models import Application, Device, HeartbeatLog
from app.schemas import HeartbeatRequest, HeartbeatResponse
from app.middleware import limiter, get_client_ip, record_failed_attempt

router = APIRouter(prefix="/heartbeat", tags=["心跳验证"])

@router.post("", response_model=HeartbeatResponse)
@limiter.limit("60/minute")
async def heartbeat(
    data: HeartbeatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """心跳验证接口 - 带速率限制"""
    now = datetime.utcnow()
    client_ip = get_client_ip(request)
    
    # 验证应用
    result = await db.execute(select(Application).where(Application.app_key == data.app_key))
    app = result.scalar_one_or_none()
    
    if not app:
        return HeartbeatResponse(
            success=False,
            message="应用不存在",
            server_time=now
        )
    
    if not app.is_active:
        return HeartbeatResponse(
            success=False,
            message="应用已禁用",
            server_time=now
        )
    
    # 验证设备
    result = await db.execute(
        select(Device).where(
            and_(
                Device.application_id == app.id,
                Device.user_token == data.token,
                Device.device_id == data.device_id
            )
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        # 记录失败日志
        log = HeartbeatLog(
            device_id=data.device_id,
            application_id=app.id,
            ip_address=client_ip,
            status="invalid",
            message="设备未授权"
        )
        db.add(log)
        await db.commit()
        
        return HeartbeatResponse(
            success=False,
            message="设备未授权",
            server_time=now
        )
    
    if not device.is_active:
        return HeartbeatResponse(
            success=False,
            message="设备已被禁用",
            server_time=now
        )
    
    # 检查是否过期
    if device.expires_at < now:
        log = HeartbeatLog(
            device_id=data.device_id,
            application_id=app.id,
            ip_address=client_ip,
            status="expired",
            message="授权已过期"
        )
        db.add(log)
        await db.commit()
        
        return HeartbeatResponse(
            success=False,
            message="授权已过期",
            expires_at=device.expires_at,
            server_time=now
        )
    
    # 更新心跳时间
    device.last_heartbeat = now
    device.ip_address = client_ip
    
    # 记录成功日志
    log = HeartbeatLog(
        device_id=data.device_id,
        application_id=app.id,
        ip_address=client_ip,
        status="success",
        message="心跳成功"
    )
    db.add(log)
    await db.commit()
    
    remaining_seconds = int((device.expires_at - now).total_seconds())
    
    return HeartbeatResponse(
        success=True,
        message="验证成功",
        expires_at=device.expires_at,
        remaining_seconds=remaining_seconds,
        server_time=now
    )

@router.get("/status")
async def get_status(
    app_key: str,
    token: str,
    device_id: str,
    db: AsyncSession = Depends(get_db)
):
    """查询授权状态"""
    now = datetime.utcnow()
    
    result = await db.execute(select(Application).where(Application.app_key == app_key))
    app = result.scalar_one_or_none()
    
    if not app:
        return {"authorized": False, "message": "应用不存在"}
    
    result = await db.execute(
        select(Device).where(
            and_(
                Device.application_id == app.id,
                Device.user_token == token,
                Device.device_id == device_id
            )
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        return {"authorized": False, "message": "设备未授权"}
    
    if device.expires_at < now:
        return {
            "authorized": False,
            "message": "授权已过期",
            "expires_at": device.expires_at
        }
    
    remaining_days = (device.expires_at - now).days
    remaining_seconds = int((device.expires_at - now).total_seconds())
    
    return {
        "authorized": True,
        "message": "授权有效",
        "expires_at": device.expires_at,
        "remaining_days": remaining_days,
        "remaining_seconds": remaining_seconds,
        "last_heartbeat": device.last_heartbeat
    }
