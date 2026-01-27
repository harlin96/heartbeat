import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from app.database import get_db
from app.models import Card, CardType, Application, User, Device, UserRole
from app.schemas import CardCreate, CardResponse, CardActivate, CardActivateResponse
from app.auth import get_current_user, get_agent_or_admin
from app.middleware import limiter, verify_nonce, record_failed_attempt, get_client_ip

router = APIRouter(prefix="/cards", tags=["卡密管理"])

CARD_DURATION = {
    CardType.DAY: 1,
    CardType.WEEK: 7,
    CardType.MONTH: 30,
    CardType.YEAR: 365,
    CardType.PERMANENT: 36500,  # 100年
}

def generate_card_key() -> str:
    """生成卡密格式: XXXX-XXXX-XXXX-XXXX"""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    parts = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(4)]
    return '-'.join(parts)

@router.post("", response_model=List[CardResponse])
async def create_cards(
    data: CardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """批量生成卡密"""
    # 验证应用存在
    result = await db.execute(select(Application).where(Application.id == data.application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 检查权限
    if current_user.role != UserRole.ADMIN and app.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权为此应用生成卡密")
    
    duration_days = CARD_DURATION.get(data.card_type, 30)
    cards = []
    
    for _ in range(data.count):
        card = Card(
            card_key=generate_card_key(),
            card_type=data.card_type,
            duration_days=duration_days,
            application_id=data.application_id,
            creator_id=current_user.id
        )
        db.add(card)
        cards.append(card)
    
    await db.commit()
    for card in cards:
        await db.refresh(card)
    return cards

@router.get("", response_model=List[CardResponse])
async def list_cards(
    application_id: Optional[int] = Query(None),
    is_used: Optional[bool] = Query(None),
    card_type: Optional[CardType] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """获取卡密列表"""
    query = select(Card)
    
    # 非管理员只能看自己创建的
    if current_user.role != UserRole.ADMIN:
        query = query.where(Card.creator_id == current_user.id)
    
    if application_id:
        query = query.where(Card.application_id == application_id)
    if is_used is not None:
        query = query.where(Card.is_used == is_used)
    if card_type:
        query = query.where(Card.card_type == card_type)
    
    query = query.order_by(Card.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{card_key}", response_model=CardResponse)
async def get_card(
    card_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """查询卡密信息"""
    result = await db.execute(select(Card).where(Card.card_key == card_key))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="卡密不存在")
    
    if current_user.role != UserRole.ADMIN and card.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此卡密")
    return card

@router.delete("/{card_key}")
async def delete_card(
    card_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_agent_or_admin)
):
    """删除卡密（仅未使用的）"""
    result = await db.execute(select(Card).where(Card.card_key == card_key))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="卡密不存在")
    
    if card.is_used:
        raise HTTPException(status_code=400, detail="已使用的卡密无法删除")
    
    if current_user.role != UserRole.ADMIN and card.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此卡密")
    
    await db.delete(card)
    await db.commit()
    return {"message": "卡密已删除"}

@router.post("/activate", response_model=CardActivateResponse)
@limiter.limit("10/minute")
async def activate_card(
    request: Request,
    data: CardActivate,
    db: AsyncSession = Depends(get_db)
):
    """激活卡密（客户端调用）- 带速率限制和防重放"""
    client_ip = get_client_ip(request)
    
    # 防重放检查（如果提供了nonce）
    nonce = request.headers.get("X-Nonce")
    if nonce and not verify_nonce(nonce):
        record_failed_attempt(client_ip)
        return CardActivateResponse(success=False, message="请求已过期或重复")
    
    # 标准化卡密格式
    card_key = data.card_key.upper().replace(" ", "").replace("-", "")
    card_key = '-'.join([card_key[i:i+4] for i in range(0, len(card_key), 4)])
    
    # 查找卡密
    result = await db.execute(select(Card).where(Card.card_key == card_key))
    card = result.scalar_one_or_none()
    
    if not card:
        record_failed_attempt(client_ip)
        return CardActivateResponse(success=False, message="卡密不存在")
    
    if card.is_used:
        return CardActivateResponse(success=False, message="卡密已被使用")
    
    # 获取应用信息
    result = await db.execute(select(Application).where(Application.id == card.application_id))
    app = result.scalar_one_or_none()
    if not app or not app.is_active:
        return CardActivateResponse(success=False, message="应用不可用")
    
    # 检查设备数量限制
    result = await db.execute(
        select(Device).where(
            and_(
                Device.application_id == app.id,
                Device.user_token == data.device_id,
                Device.is_active == True
            )
        )
    )
    existing_devices = result.scalars().all()
    
    # 计算到期时间
    now = datetime.utcnow()
    expires_at = now + timedelta(days=card.duration_days)
    
    # 生成用户token
    user_token = secrets.token_urlsafe(32)
    
    # 更新卡密状态
    card.is_used = True
    card.used_by = data.device_id
    card.used_at = now
    card.expires_at = expires_at
    
    # 创建设备记录
    device = Device(
        device_id=data.device_id,
        user_token=user_token,
        application_id=app.id,
        card_key=card.card_key,
        expires_at=expires_at,
        extra_info=data.extra_info
    )
    db.add(device)
    await db.commit()
    
    remaining_days = (expires_at - now).days
    
    return CardActivateResponse(
        success=True,
        message="激活成功",
        token=user_token,
        expires_at=expires_at,
        remaining_days=remaining_days
    )

@router.post("/check")
async def check_card(
    card_key: str,
    db: AsyncSession = Depends(get_db)
):
    """查询卡密状态（公开接口）"""
    result = await db.execute(select(Card).where(Card.card_key == card_key.upper().replace(" ", "")))
    card = result.scalar_one_or_none()
    
    if not card:
        return {"valid": False, "message": "卡密不存在"}
    
    if card.is_used:
        remaining = 0
        if card.expires_at:
            remaining = max(0, (card.expires_at - datetime.utcnow()).days)
        return {
            "valid": True,
            "is_used": True,
            "expires_at": card.expires_at,
            "remaining_days": remaining,
            "message": "卡密已激活"
        }
    
    return {
        "valid": True,
        "is_used": False,
        "card_type": card.card_type.value,
        "duration_days": card.duration_days,
        "message": "卡密未使用"
    }
