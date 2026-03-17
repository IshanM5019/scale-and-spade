from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date, datetime
import uuid


EntryType = Literal["revenue", "expense"]


class ProfitEntryBase(BaseModel):
    entry_type: EntryType
    category: str
    amount: float
    description: Optional[str] = None
    entry_date: date


class ProfitEntryCreate(ProfitEntryBase):
    pass


class ProfitEntryUpdate(BaseModel):
    entry_type: Optional[EntryType] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    entry_date: Optional[date] = None


class ProfitEntryOut(ProfitEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ProfitSummary(BaseModel):
    period: str                 # e.g. "2024-Q1" or "2024-03"
    total_revenue: float
    total_expenses: float
    net_profit: float
    profit_margin_pct: Optional[float]


class ForecastPoint(BaseModel):
    month: str
    predicted_revenue: float
    predicted_expenses: float
    predicted_profit: float


class ProfitForecast(BaseModel):
    forecast: list[ForecastPoint]
    method: str = "linear_regression"
