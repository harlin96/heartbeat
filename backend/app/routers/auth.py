from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserLogin, UserCreate, TokenResponse, UserResponse
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user, get_admin_user

router = APIRouter(prefix="/auth", tags=["认证"])

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账户已被禁用")
    
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))

@router.post("/register", response_model=UserResponse)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin_user)):
    """注册新用户（仅管理员）"""
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    user = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        role=data.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user

@router.put("/change-password")
async def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """修改密码"""
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="缺少密码参数")
    
    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码长度至少6位")
    
    current_user.password_hash = get_password_hash(new_password)
    await db.commit()
    return {"message": "密码修改成功"}
