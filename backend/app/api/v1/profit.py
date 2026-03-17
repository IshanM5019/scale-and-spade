from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.deps import get_current_user_id, get_db
from app.models.profit import (
    ProfitEntryCreate,
    ProfitEntryUpdate,
    ProfitEntryOut,
    ProfitSummary,
    ProfitForecast,
    ForecastPoint,
)
from app.services.profit_service import compute_summary, compute_forecast

router = APIRouter()

TABLE = "profit_entries"


@router.get("/entries", response_model=list[ProfitEntryOut])
async def list_entries(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    result = (
        db.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("entry_date", desc=True)
        .execute()
    )
    return result.data


@router.post("/entries", response_model=ProfitEntryOut, status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: ProfitEntryCreate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    data = {**payload.model_dump(), "user_id": user_id, "entry_date": str(payload.entry_date)}
    result = db.table(TABLE).insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create entry")
    return result.data[0]


@router.get("/entries/{entry_id}", response_model=ProfitEntryOut)
async def get_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    result = (
        db.table(TABLE)
        .select("*")
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result.data


@router.put("/entries/{entry_id}", response_model=ProfitEntryOut)
async def update_entry(
    entry_id: str,
    payload: ProfitEntryUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    data = {k: str(v) if hasattr(v, "isoformat") else v
            for k, v in payload.model_dump().items() if v is not None}
    result = (
        db.table(TABLE)
        .update(data)
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result.data[0]


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    db.table(TABLE).delete().eq("id", entry_id).eq("user_id", user_id).execute()


@router.get("/summary", response_model=list[ProfitSummary])
async def get_profit_summary(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    """Return monthly P&L summaries."""
    result = db.table(TABLE).select("*").eq("user_id", user_id).execute()
    return compute_summary(result.data or [])


@router.get("/forecast", response_model=ProfitForecast)
async def get_profit_forecast(
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    """Return a 3-month revenue/expense forecast using linear trend."""
    result = db.table(TABLE).select("*").eq("user_id", user_id).execute()
    return compute_forecast(result.data or [])
