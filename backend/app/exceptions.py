from fastapi import HTTPException, status

class AppException(HTTPException):
    """应用基础异常"""
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)

class NotFoundError(AppException):
    """资源不存在"""
    def __init__(self, resource: str = "资源"):
        super().__init__(detail=f"{resource}不存在", status_code=status.HTTP_404_NOT_FOUND)

class UnauthorizedError(AppException):
    """未授权"""
    def __init__(self, detail: str = "未授权访问"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)

class ForbiddenError(AppException):
    """无权限"""
    def __init__(self, detail: str = "无操作权限"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)

class ConflictError(AppException):
    """资源冲突"""
    def __init__(self, detail: str = "资源已存在"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)

class ValidationError(AppException):
    """验证错误"""
    def __init__(self, detail: str = "数据验证失败"):
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

class RateLimitError(AppException):
    """频率限制"""
    def __init__(self, detail: str = "请求过于频繁，请稍后再试"):
        super().__init__(detail=detail, status_code=status.HTTP_429_TOO_MANY_REQUESTS)
