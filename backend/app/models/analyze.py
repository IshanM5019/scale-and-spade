"""
models/analyze.py
=================
Pydantic v2 schemas for the unified /analyze endpoint.

Design goal: ZERO null values can reach financial calculations.
Every numeric field used in math is either:
  - Required (no default)
  - Has a strictly validated, safe default
  - Protected by a @field_validator that raises before storage

This makes the Profit Manager safe — division-by-zero and NaN
are caught at the HTTP layer, never inside business logic.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional
from uuid import UUID

from pydantic import (
    BaseModel,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)


# ─────────────────────────────────────────────────────────────────────────────
# Sub-models: Financial data (fetched from Supabase)
# ─────────────────────────────────────────────────────────────────────────────

class FinancialSnapshot(BaseModel):
    """
    The user's actual P&L data fetched from Supabase profit_entries.
    All numeric fields are validated to be non-null and non-negative so
    they can be safely used in arithmetic.
    """
    total_revenue: Annotated[float, Field(ge=0.0, description="Sum of all revenue entries")]
    total_expenses: Annotated[float, Field(ge=0.0, description="Sum of all expense entries")]
    net_profit: float = Field(description="Revenue minus expenses — may be negative")
    profit_margin_pct: Optional[float] = Field(
        default=None,
        ge=-100.0,
        le=100.0,
        description="(net_profit / total_revenue) * 100; null when no revenue",
    )
    period: str = Field(description="ISO year-month string e.g. '2025-03'")
    entry_count: Annotated[int, Field(ge=0)] = 0

    @model_validator(mode="after")
    def _net_profit_must_match(self) -> "FinancialSnapshot":
        """Guard: net_profit must equal revenue - expenses (within floating-point tolerance)."""
        expected = round(self.total_revenue - self.total_expenses, 6)
        if abs(self.net_profit - expected) > 0.02:
            # Auto-correct rather than reject — the DB value wins
            object.__setattr__(self, "net_profit", round(expected, 2))
        return self


class BusinessProfile(BaseModel):
    """
    The user's business profile row from Supabase (profiles / user_businesses table).
    target_profit is guarded to prevent zero-division in pricing formula.
    """
    id: UUID
    name: str = Field(min_length=1, max_length=255)
    niche: str = Field(default="General", min_length=1, max_length=255)
    target_profit: Annotated[float, Field(ge=0.0)] = Field(
        default=0.0,
        description="Monthly profit target. Defaults to 0 (neutral) — never null.",
    )
    website_url: Optional[str] = None

    @field_validator("name", "niche", mode="before")
    @classmethod
    def _strip_and_default(cls, v: object) -> str:
        """Coerce None → empty string, then the default kicks in if truly empty."""
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("niche", mode="after")
    @classmethod
    def _niche_fallback(cls, v: str) -> str:
        return v if v else "General"

    @field_validator("target_profit", mode="before")
    @classmethod
    def _target_profit_coerce(cls, v: object) -> float:
        """Convert None / empty string to 0.0 — never pass None to pricing formula."""
        if v is None or v == "":
            return 0.0
        try:
            val = float(v)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"target_profit must be a number, got {v!r}") from exc
        if val < 0:
            raise ValueError(f"target_profit cannot be negative, got {val}")
        return val


class ScrapedCompetitor(BaseModel):
    """
    One competitor's data as returned by the background scrape task.
    All fields optional — the scraper is best-effort.
    """
    name: str = Field(min_length=1, max_length=255)
    website: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    rating: Optional[float] = Field(default=None, ge=0.0, le=5.0)
    best_promo: str = Field(default="", description="Top promo/offer text found on page")
    promos: list[str] = Field(default_factory=list)
    scrape_success: bool = False
    scrape_error: Optional[str] = None

    @field_validator("best_promo", mode="before")
    @classmethod
    def _best_promo_not_none(cls, v: object) -> str:
        """Guarantee best_promo is always a string — never None."""
        return str(v).strip() if v else ""

    @field_validator("promos", mode="before")
    @classmethod
    def _promos_not_none(cls, v: object) -> list[str]:
        if v is None:
            return []
        return [str(p) for p in v if p]


# ─────────────────────────────────────────────────────────────────────────────
# Request schema: POST /api/v1/analyze
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """
    What the caller (frontend) sends.

    The frontend already has the financial inputs from the Profit Manager form.
    competitor_urls is the list of URLs to scrape in the background.
    """
    # ── Cost / volume inputs (required — no null tolerance) ──────────────────
    fixed_costs: Annotated[float, Field(
        gt=0.0,
        description="Total fixed costs for the period (rent, salaries…).",
        examples=[5000.0],
    )]
    variable_cost: Annotated[float, Field(
        ge=0.0,
        description="Per-unit variable cost (materials, shipping…).",
        examples=[12.50],
    )]
    estimated_volume: Annotated[float, Field(
        gt=0.0,
        description="Expected units sold in the same period as fixed_costs.",
        examples=[400.0],
    )]
    target_profit: Annotated[float, Field(
        ge=0.0,
        description="The profit goal for the period — 0 means break-even analysis only.",
        examples=[3000.0],
    )]
    current_price: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Current selling price per unit (optional benchmark).",
    )

    # ── Competitor scrape targets ─────────────────────────────────────────────
    competitor_urls: list[str] = Field(
        default_factory=list,
        max_length=5,
        description="Up to 5 competitor URLs. Scraped in background on submission.",
    )

    # ── Optional tweaks ───────────────────────────────────────────────────────
    model_name: str = Field(
        default="gemini-2.0-flash",
        description="Gemini model identifier.",
    )
    currency_symbol: str = Field(default="$", max_length=5)

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("fixed_costs", "variable_cost", "estimated_volume", "target_profit", mode="before")
    @classmethod
    def _no_null_financials(cls, v: object, info) -> float:
        """Block None and NaN from entering financial fields."""
        import math
        if v is None:
            raise ValueError(
                f"'{info.field_name}' cannot be null — "
                "the Profit Manager requires a concrete number."
            )
        val = float(v)
        if math.isnan(val) or math.isinf(val):
            raise ValueError(f"'{info.field_name}' must be a finite number, got {val}")
        return val

    @field_validator("competitor_urls", mode="before")
    @classmethod
    def _cap_competitor_urls(cls, v: object) -> list[str]:
        if v is None:
            return []
        urls = list(v)
        if len(urls) > 5:
            raise ValueError("Maximum 5 competitor URLs per analyze request.")
        return [str(u).strip() for u in urls if u]

    @model_validator(mode="after")
    def _estimated_volume_non_zero(self) -> "AnalyzeRequest":
        """estimated_volume MUST be > 0 to avoid division by zero in the formula."""
        if self.estimated_volume <= 0:
            raise ValueError(
                "estimated_volume must be greater than 0. "
                "You cannot price for zero sales."
            )
        return self


# ─────────────────────────────────────────────────────────────────────────────
# Response schemas: POST /api/v1/analyze
# ─────────────────────────────────────────────────────────────────────────────

class PricingFormula(BaseModel):
    """Step-by-step breakdown of the pricing calculation."""
    fixed_costs: float
    target_profit: float
    estimated_volume: float
    variable_cost: float
    contribution_needed_per_unit: float
    suggested_price: float


class AnalyzeResponse(BaseModel):
    """
    The full response returned by POST /api/v1/analyze.
    All numeric fields are guaranteed non-null by this point.
    """
    # ── Pricing result ────────────────────────────────────────────────────────
    suggested_price: float
    markup_over_variable_cost: float
    competitor_avg_price: Optional[float] = None
    verdict: str = Field(description="REALISTIC | BORDERLINE | DELUSIONAL")
    llm_analysis: str = Field(description="Full Gemini narrative — brutally honest.")
    formula_breakdown: PricingFormula

    # ── Background scrape summary ─────────────────────────────────────────────
    competitors_scraped: list[ScrapedCompetitor] = Field(default_factory=list)
    scrape_job_id: Optional[str] = Field(
        default=None,
        description="Task ID if scrape was dispatched asynchronously.",
    )

    # ── Financial context fetched from Supabase ───────────────────────────────
    financial_snapshot: Optional[FinancialSnapshot] = None

    # ── Meta ──────────────────────────────────────────────────────────────────
    model_used: str = "gemini-2.0-flash"
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# Background-task result (stored in memory / future: Redis)
# ─────────────────────────────────────────────────────────────────────────────

class ScrapeJobResult(BaseModel):
    """Stored in the in-process job store after background scrape completes."""
    job_id: str
    status: str = Field(default="pending", description="pending | running | done | failed")
    competitors: list[ScrapedCompetitor] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
