"""
JWT validation against Supabase's secret.
Supabase issues HS256 JWTs signed with SUPABASE_JWT_SECRET.
Uses PyJWT (pre-built wheels, no Rust required).
"""
from typing import Optional
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import settings

ALGORITHM = "HS256"


def decode_supabase_token(token: str) -> dict:
    """
    Validates and decodes a Supabase-issued JWT.
    Returns the payload dict or raises ValueError on failure.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            audience="authenticated",
        )
        return payload
    except InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")
