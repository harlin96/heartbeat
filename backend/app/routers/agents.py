from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import User, UserRole
from app.schemas import AgentCreate, UserResponse
from app.auth import get_password_hash, get_admin_user, get_agent_or_admin

router = APIRouter(prefix="/agents", tags=["代理管理"])

@router.post("", response_model=UserResponse)
async def create_agent(
    data: AgentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """创建代理（仅管理员）"""
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    agent = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        role=UserRole.AGENT,
        parent_id=admin.id
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent

@router.get("", response_model=List[UserResponse])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """获取代理列表（仅管理员）"""
    result = await db.execute(select(User).where(User.role == UserRole.AGENT))
    return result.scalars().all()

@router.put("/{user_id}/status")
async def toggle_agent_status(
    user_id: int,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """启用/禁用代理（仅管理员）"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.is_active = is_active
    await db.commit()
    return {"message": "状态更新成功", "is_active": is_active}

@router.get("/sub-agents", response_model=List[UserResponse])
async def list_sub_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """获取下级代理列表"""
    result = await db.execute(
        select(User).where(User.parent_id == current_user.id)
    )
    return result.scalars().all()
