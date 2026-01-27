from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import User, UserRole, RechargeLog
from app.schemas import AgentCreate, AgentRecharge, UserResponse
from app.auth import get_password_hash, get_admin_user, get_agent_or_admin, get_current_user

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
        discount=data.discount,
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

@router.post("/recharge")
async def recharge_agent(
    data: AgentRecharge,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """给代理充值（仅管理员）"""
    result = await db.execute(select(User).where(User.id == data.user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    before_balance = user.balance
    user.balance += data.amount
    after_balance = user.balance
    
    # 记录充值日志
    log = RechargeLog(
        user_id=user.id,
        amount=data.amount,
        before_balance=before_balance,
        after_balance=after_balance,
        remark=data.remark,
        operator_id=admin.id
    )
    db.add(log)
    await db.commit()
    
    return {
        "message": "充值成功",
        "before_balance": before_balance,
        "after_balance": after_balance
    }

@router.put("/{user_id}/discount")
async def set_discount(
    user_id: int,
    discount: float,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """设置代理折扣率（仅管理员）"""
    if discount < 0 or discount > 1:
        raise HTTPException(status_code=400, detail="折扣率必须在0-1之间")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.discount = discount
    await db.commit()
    return {"message": "折扣率设置成功", "discount": discount}

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

@router.get("/my-balance")
async def get_my_balance(current_user: User = Depends(get_current_user)):
    """获取当前用户余额"""
    return {
        "balance": current_user.balance,
        "discount": current_user.discount
    }

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
