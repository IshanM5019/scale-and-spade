"""
FastAPI route — Scraper endpoint
Allows the frontend to trigger a competitive promo scrape on-demand.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl

from app.core.deps import get_current_user_id
from app.utils.scraper import scrape_promotions, scrape_multiple, PromoResult

router = APIRouter()


class ScrapeRequest(BaseModel):
    url: HttpUrl


class BatchScrapeRequest(BaseModel):
    urls: list[HttpUrl]
    concurrency: int = 3


class ScrapeResponse(BaseModel):
    url: str
    success: bool
    page_title: str
    promos: list[str]
    meta_description: str
    best_promo: str
    error: str | None = None


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_competitor_promos(
    body: ScrapeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Scrapes a competitor URL and returns detected promo / offer texts.
    Requires authentication.
    """
    result: PromoResult = await scrape_promotions(str(body.url))
    return ScrapeResponse(
        url=result.url,
        success=result.success,
        page_title=result.page_title,
        promos=result.promos,
        meta_description=result.meta_description,
        best_promo=result.best_promo,
        error=result.error,
    )


@router.post("/scrape/batch", response_model=list[ScrapeResponse])
async def batch_scrape_competitors(
    body: BatchScrapeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Scrapes up to 10 competitor URLs concurrently.
    Concurrency capped at 3 to avoid overwhelming free-tier resources.
    """
    if len(body.urls) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 URLs per batch request")

    concurrency = min(body.concurrency, 3)   # hard cap for free-tier safety
    results = await scrape_multiple([str(u) for u in body.urls], concurrency=concurrency)

    return [
        ScrapeResponse(
            url=r.url,
            success=r.success,
            page_title=r.page_title,
            promos=r.promos,
            meta_description=r.meta_description,
            best_promo=r.best_promo,
            error=r.error,
        )
        for r in results
    ]
