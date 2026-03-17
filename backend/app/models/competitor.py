from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class CompetitorBase(BaseModel):
    name: str
    website: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None


class CompetitorCreate(CompetitorBase):
    pass


class CompetitorUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None


class CompetitorOut(CompetitorBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CompetitorAnalysisSummary(BaseModel):
    total_competitors: int
    average_rating: Optional[float]
    top_competitor: Optional[str]
    categories: list[str]
