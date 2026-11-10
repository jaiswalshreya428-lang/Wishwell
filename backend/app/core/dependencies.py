"""
FastAPI Authentication & RBAC Dependencies
Provides declarative access control across endpoints.

ARCHITECTURE NOTES:
- Centralizes authentication and Role-Based Access Control (RBAC).
- `require_role(*roles)` uses closure/currying to return a parameterized dependency.
- Enforces the Principle of Least Privilege: routes specify exactly which roles are authorized.
- Unauthenticated requests yield HTTP 401 Unauthorized; unauthorized roles yield HTTP 403 Forbidden.
"""

from typing import Callable, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.entities import User

# HTTPBearer extracts "Authorization: Bearer <token>"
security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Validates JWT bearer token and loads the authenticated User entity from the database.
    Raises HTTP 401 Unauthorized on invalid/expired/missing token.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token in the Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing subject identifier.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = int(user_id_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token. Please authenticate again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Parameterized query to fetch user and eagerly load institution relation if present
    stmt = (
        select(User)
        .options(selectinload(User.institution))
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

def require_role(*roles: str) -> Callable[[User], Any]:
    """
    Reusable RBAC Dependency Factory.
    Enforces that the current authenticated user possesses at least one of the permitted roles.

    Example usage:
        @router.post("/wishes", dependencies=[Depends(require_role("institution"))])
        @router.post("/verifications/{id}/approve", dependencies=[Depends(require_role("admin"))])
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires role in [{', '.join(roles)}]. Current role: '{current_user.role}'."
            )
        return current_user

    return role_checker

