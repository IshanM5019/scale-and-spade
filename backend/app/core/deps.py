"""
Dependency injection helpers for FastAPI routes.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_supabase_token
from app.db.supabase_client import get_supabase_client

http_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> dict:
    """
    Extracts and validates the Supabase JWT from the Authorization header.
    Returns the JWT payload (which contains the user's UUID as `sub`).
    """
    token = credentials.credentials
    try:
        payload = decode_supabase_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def get_current_user_id(
    current_user: dict = Depends(get_current_user),
) -> str:
    """Convenience dep that returns just the user UUID string."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    return user_id


def get_db():
    """Returns the Supabase client for database operations."""
    return get_supabase_client()
