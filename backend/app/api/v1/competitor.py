from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.deps import get_current_user_id, get_db
from app.models.competitor import (
    CompetitorCreate,
    CompetitorUpdate,
    CompetitorOut,
    CompetitorAnalysisSummary,
)

router = APIRouter()

TABLE = "competitors"


@router.get("/", response_model=list[CompetitorOut])
async def list_competitors(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    """Return all competitors for the authenticated user."""
    result = (
        db.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/", response_model=CompetitorOut, status_code=status.HTTP_201_CREATED)
async def create_competitor(
    payload: CompetitorCreate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    """Add a new competitor for the authenticated user."""
    data = {**payload.model_dump(), "user_id": user_id}
    result = db.table(TABLE).insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create competitor")
    return result.data[0]


@router.get("/analysis/summary", response_model=CompetitorAnalysisSummary)
async def get_analysis_summary(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    """Return a high-level competitive analysis summary for the user."""
    result = db.table(TABLE).select("*").eq("user_id", user_id).execute()
    competitors = result.data or []

    ratings = [c["rating"] for c in competitors if c.get("rating") is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else None

    top = max(competitors, key=lambda c: c.get("rating") or 0, default=None)
    categories = list({c["category"] for c in competitors if c.get("category")})

    return CompetitorAnalysisSummary(
        total_competitors=len(competitors),
        average_rating=avg_rating,
        top_competitor=top["name"] if top else None,
        categories=categories,
    )


@router.get("/{competitor_id}", response_model=CompetitorOut)
async def get_competitor(
    competitor_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    result = (
        db.table(TABLE)
        .select("*")
        .eq("id", competitor_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return result.data


@router.put("/{competitor_id}", response_model=CompetitorOut)
async def update_competitor(
    competitor_id: str,
    payload: CompetitorUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    result = (
        db.table(TABLE)
        .update(data)
        .eq("id", competitor_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return result.data[0]


@router.delete("/{competitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competitor(
    competitor_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    db.table(TABLE).delete().eq("id", competitor_id).eq("user_id", user_id).execute()
