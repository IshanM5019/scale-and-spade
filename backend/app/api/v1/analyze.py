"""
api/v1/analyze.py
==================
POST /api/v1/analyze — The unified "analyze this business" endpoint.

Flow:
  1. Validate request body (Pydantic blocks null financial values).
  2. Fetch the user's P&L + business profile from Supabase.
  3. Compute suggested price using the break-even + profit formula.
  4. Register a background scrape job for competitor URLs (non-blocking).
  5. Send all context to Gemini Flash → structured verdict + narrative.
  6. Return the full AnalyzeResponse immediately; scrape results
     can be polled via GET /api/v1/analyze/jobs/{job_id}.

Additional routes:
  GET  /api/v1/analyze/jobs/{job_id}   — poll background scrape status
  GET  /api/v1/analyze/financial       — fetch raw Supabase P&L snapshot
"""

from __future__ import annotations

import logging
import textwrap
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from supabase import Client

from app.core.config import settings
from app.core.deps import get_current_user_id, get_db
from app.models.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    FinancialSnapshot,
    ScrapeJobResult,
)
from app.services.analyze_service import (
    build_analysis,
    fetch_financial_data,
    get_job,
    run_background_scrape,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/analyze
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Unified financial analysis + competitor scrape + Gemini insight",
    description=textwrap.dedent("""\
        **The core endpoint of Spade & Scale.**

        1. Validates all financial inputs (Pydantic rejects null values that
           would break profit math).
        2. Fetches the user's actual P&L from Supabase as context.
        3. Runs the break-even + target-profit pricing formula.
        4. Dispatches a **background scrape** for each `competitor_url` provided
           (non-blocking — response is immediate).
        5. Sends the enriched context to **Gemini Flash** for a brutally honest
           verdict: REALISTIC / BORDERLINE / DELUSIONAL.

        Poll `GET /api/v1/analyze/jobs/{scrape_job_id}` to retrieve
        competitor offer data once the background scrape completes.
    """),
)
async def run_analysis(
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
) -> AnalyzeResponse:
    """
    Main analyze handler.

    Pydantic validation has already run by the time this function is called:
    - All financial numbers are finite, non-null floats.
    - estimated_volume > 0 (division-by-zero impossible).
    - competitor_urls capped at 5.
    """
    logger.info(f"[analyze] Request from user={user_id} | competitors={len(body.competitor_urls)}")

    try:
        response, job_id = await build_analysis(
            req=body,
            user_id=user_id,
            db=db,
            gemini_api_key=settings.GEMINI_API_KEY,
            eager_scrape=False,   # fire & forget — background tasks handle scrape
        )
    except EnvironmentError as exc:
        # Gemini API key missing
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        # Should not reach here (Pydantic catches mal-formed input),
        # but belt-and-suspenders for formula errors
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception(f"[analyze] Unexpected error for user={user_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Analysis failed: {exc}",
        ) from exc

    # Dispatch the scrape as a background task AFTER the response is built
    if job_id and body.competitor_urls:
        background_tasks.add_task(run_background_scrape, job_id, body.competitor_urls)
        logger.info(f"[analyze] Scrape job {job_id} queued for {len(body.competitor_urls)} URLs")

    return response


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analyze/jobs/{job_id}  — poll scrape status
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}",
    response_model=ScrapeJobResult,
    summary="Poll background scrape job status",
    description=(
        "Returns the current status and results of a background competitor "
        "scrape that was triggered by POST /api/v1/analyze. "
        "Status transitions: pending → running → done | failed."
    ),
)
async def poll_scrape_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
) -> ScrapeJobResult:
    job = get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scrape job '{job_id}' not found. It may have expired or never existed.",
        )
    return job


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analyze/financial  — raw P&L snapshot from Supabase
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/financial",
    response_model=FinancialSnapshot,
    summary="Fetch current month P&L snapshot from Supabase",
    description=(
        "Returns the user's aggregated profit & loss data for the specified "
        "period (default: current month). Used by the Profit Manager dashboard "
        "to display real Supabase data. All returned numeric fields are "
        "guaranteed non-null."
    ),
)
async def get_financial_snapshot(
    period: Optional[str] = Query(
        default=None,
        description="ISO year-month string e.g. '2025-03'. Defaults to current month.",
        pattern=r"^\d{4}-\d{2}$",
    ),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
) -> FinancialSnapshot:
    snapshot, _ = fetch_financial_data(db, user_id, period=period)
    return snapshot
