"""
FastAPI router — AI Advisor endpoint.

POST /api/v1/advisor/analyse
  Accepts the user's cost/volume inputs and a list of competitor snapshots,
  calls the Gemini-powered advisor service, and returns a structured verdict.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.deps import get_current_user_id

# Import the standalone service (top-level services/ package)
from services.advisor import (
    AdvisoryResult,
    CompetitorSnapshot,
    PricingInputs,
    run_advisor,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class CompetitorIn(BaseModel):
    """Mirrors CompetitorSnapshot — the caller may mix Supabase records + scrape data."""
    name: str
    website: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    rating: Optional[float] = None
    best_promo: Optional[str] = None
    promos: list[str] = Field(default_factory=list)


class AnalyseRequest(BaseModel):
    # ── Cost / volume inputs ───────────────────────────────────────────────
    fixed_costs: float = Field(
        ...,
        gt=0,
        description="Total fixed costs for the period (e.g. monthly rent + salaries).",
        examples=[5000.0],
    )
    variable_cost: float = Field(
        ...,
        ge=0,
        description="Per-unit variable cost (materials, packaging, shipping).",
        examples=[12.50],
    )
    estimated_volume: float = Field(
        ...,
        gt=0,
        description="Expected units to sell in the same period as fixed_costs.",
        examples=[400],
    )
    target_profit: float = Field(
        ...,
        description="The profit the user wants to achieve in the period.",
        examples=[3000.0],
    )
    current_price: Optional[float] = Field(
        None,
        ge=0,
        description="What the user is currently charging per unit (optional).",
    )

    # ── Competitor data ────────────────────────────────────────────────────
    competitors: list[CompetitorIn] = Field(
        default_factory=list,
        description="Scraped competitor snapshots to benchmark against.",
    )

    # ── Optional overrides ─────────────────────────────────────────────────
    model_name: str = Field(
        "gemini-2.5-flash",
        description="Gemini model identifier.",
    )


class FormulaBreakdownOut(BaseModel):
    fixed_costs: float
    target_profit: float
    estimated_volume: float
    variable_cost: float
    contribution_needed_per_unit: float
    suggested_price: float


class AnalyseResponse(BaseModel):
    suggested_price: float
    markup_over_variable_cost: float
    competitor_avg_price: Optional[float]
    verdict: str                        # REALISTIC | BORDERLINE | DELUSIONAL
    llm_analysis: str
    formula_breakdown: FormulaBreakdownOut


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/analyse",
    response_model=AnalyseResponse,
    status_code=status.HTTP_200_OK,
    summary="Get brutally honest AI pricing advice",
    description=(
        "Computes a suggested price using the break-even + profit formula, "
        "then runs it past a 'Brutally Honest Business Consultant' LLM to "
        "benchmark it against competitor data and deliver a final verdict."
    ),
)
async def analyse_pricing(
    body: AnalyseRequest,
    user_id: str = Depends(get_current_user_id),   # auth guard
) -> AnalyseResponse:
    """
    Endpoint flow:
      1. Map Pydantic request → service dataclasses.
      2. Call run_advisor() — does formula + Gemini call.
      3. Map AdvisoryResult → Pydantic response and return.
    """
    inputs = PricingInputs(
        fixed_costs=body.fixed_costs,
        variable_cost=body.variable_cost,
        estimated_volume=body.estimated_volume,
        target_profit=body.target_profit,
        current_price=body.current_price,
    )

    competitors = [
        CompetitorSnapshot(
            name=c.name,
            website=c.website,
            category=c.category,
            region=c.region,
            rating=c.rating,
            best_promo=c.best_promo,
            promos=c.promos,
        )
        for c in body.competitors
    ]

    try:
        result: AdvisoryResult = run_advisor(
            inputs=inputs,
            competitors=competitors,
            api_key=settings.GEMINI_API_KEY,
            model_name=body.model_name,
        )
    except EnvironmentError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini call failed: {exc}",
        ) from exc

    return AnalyseResponse(
        suggested_price=result.suggested_price,
        markup_over_variable_cost=result.markup_over_variable_cost,
        competitor_avg_price=result.competitor_avg_price,
        verdict=result.verdict,
        llm_analysis=result.llm_analysis,
        formula_breakdown=FormulaBreakdownOut(**result.formula_breakdown),
    )
