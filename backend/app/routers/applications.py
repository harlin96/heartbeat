import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import Application, User
from app.schemas import ApplicationCreate, ApplicationResponse, ApplicationPublic
from app.auth import get_current_user, get_agent_or_admin

router = APIRouter(prefix="/applications", tags=["应用管理"])

@router.post("", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """创建新应用"""
    app = Application(
        name=data.name,
        app_key=secrets.token_urlsafe(24),
        app_secret=secrets.token_urlsafe(32),
        owner_id=current_user.id,
        description=data.description,
        max_devices=data.max_devices,
        heartbeat_interval=data.heartbeat_interval
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """获取应用列表"""
    from app.models import UserRole
    if current_user.role == UserRole.ADMIN:
        result = await db.execute(select(Application))
    else:
        result = await db.execute(select(Application).where(Application.owner_id == current_user.id))
    return result.scalars().all()

@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """获取应用详情"""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此应用")
    return app

@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: int,
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """更新应用"""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此应用")
    
    app.name = data.name
    app.description = data.description
    app.max_devices = data.max_devices
    app.heartbeat_interval = data.heartbeat_interval
    await db.commit()
    await db.refresh(app)
    return app

@router.delete("/{app_id}")
async def delete_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """删除应用"""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此应用")
    
    await db.delete(app)
    await db.commit()
    return {"message": "应用已删除"}

@router.post("/{app_id}/regenerate-secret", response_model=ApplicationResponse)
async def regenerate_secret(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """重新生成应用密钥"""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    from app.models import UserRole
    if current_user.role != UserRole.ADMIN and app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此应用")
    
    app.app_secret = secrets.token_urlsafe(32)
    await db.commit()
    await db.refresh(app)
    return app
