from fastapi import APIRouter, Depends
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/me")
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the authenticated user's profile extracted from the Supabase JWT.
    The frontend uses Supabase client directly for login/register —
    this endpoint just validates the token and returns user info.
    """
    return {
        "id": current_user.get("sub"),
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "app_metadata": current_user.get("app_metadata", {}),
        "user_metadata": current_user.get("user_metadata", {}),
    }
