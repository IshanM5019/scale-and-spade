"""
api/v1/discount.py
==================
POST /api/v1/discount/viability

Accepts pricing + cost inputs, runs calculate_discount_viability(),
then — if any tier is HIGH RISK — calls Gemini to produce a one-paragraph
"High Risk Strategy" warning that the frontend renders inside AIInsightBox.

Routes:
  POST /api/v1/discount/viability  — full calculation + optional Gemini flag
"""

from __future__ import annotations

import asyncio
import logging
import math
import textwrap
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.config import settings
from app.core.deps import get_current_user_id
from app.utils.finance import (
    DiscountRiskLevel,
    DiscountTierResult,
    ViabilityReport,
    calculate_discount_viability,
    viability_report_to_text,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Request schema
# ─────────────────────────────────────────────────────────────────────────────

class DiscountViabilityRequest(BaseModel):
    """
    All inputs required to run the discount viability analysis.
    Strict validation mirrors the /analyze endpoint — no null finance values.
    """
    current_price: Annotated[float, Field(
        gt=0,
        description="Current selling price per unit.",
        examples=[150.0],
    )]
    fixed_costs: Annotated[float, Field(
        ge=0,
        description="Total fixed costs for the period.",
        examples=[5000.0],
    )]
    variable_costs: Annotated[float, Field(
        ge=0,
        description="Per-unit variable cost (materials, shipping, etc.).",
        examples=[40.0],
    )]
    target_profit: Annotated[float, Field(
        ge=0,
        description="Desired profit for the period. 0 = break-even only.",
        examples=[3000.0],
    )]
    currency_symbol: str = Field(default="$", max_length=5)
    include_gemini_analysis: bool = Field(
        default=True,
        description=(
            "When True, a Gemini narrative is generated for HIGH RISK tiers. "
            "Set to False to get pure math results without an LLM call."
        ),
    )

    # ── Null / NaN guard (same pattern as AnalyzeRequest) ────────────────────
    @field_validator(
        "current_price", "fixed_costs", "variable_costs", "target_profit",
        mode="before",
    )
    @classmethod
    def _no_null_or_nan(cls, v: object, info) -> float:
        import math as _math
        if v is None:
            raise ValueError(
                f"'{info.field_name}' is required and cannot be null. "
                "The discount calculator needs a concrete number."
            )
        val = float(v)
        if _math.isnan(val) or _math.isinf(val):
            raise ValueError(f"'{info.field_name}' must be a finite number, got {val}")
        return val

    @model_validator(mode="after")
    def _price_above_variable_cost(self) -> "DiscountViabilityRequest":
        """
        Catch the most common user mistake early — they've already set a price
        below their cost of goods. The math library would raise too, but we give
        a friendlier HTTP 422 message here.
        """
        if self.current_price <= self.variable_costs:
            raise ValueError(
                f"current_price ({self.current_price}) must be greater than "
                f"variable_costs ({self.variable_costs}). You are already selling "
                "at or below the cost of making the product — discounting will only "
                "deepen the loss. Fix your base price first."
            )
        return self


# ─────────────────────────────────────────────────────────────────────────────
# Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class DiscountTierOut(BaseModel):
    """Serialisable version of DiscountTierResult."""
    discount_pct:        float    # 0.10 / 0.20 / 0.30
    discount_label:      str      # "10%" / "20%" / "30%"
    discounted_price:    float
    contribution_margin: float
    breakeven_volume:    float | None   # None when not viable (infinite)
    required_volume:     float | None   # None when not viable
    volume_multiple:     float | None
    risk_level:          DiscountRiskLevel
    risk_label:          str            # human-readable e.g. "High Risk"
    is_viable:           bool
    shortfall_per_unit:  float

    @classmethod
    def from_tier(cls, t: DiscountTierResult) -> "DiscountTierOut":
        label_map = {
            DiscountRiskLevel.LOW:    "Low Risk",
            DiscountRiskLevel.MEDIUM: "Medium Risk",
            DiscountRiskLevel.HIGH:   "High Risk",
        }
        return cls(
            discount_pct=t.discount_pct,
            discount_label=f"{int(t.discount_pct * 100)}%",
            discounted_price=t.discounted_price,
            contribution_margin=t.contribution_margin,
            # Use None for ∞ so JSON doesn't contain Infinity (not valid JSON)
            breakeven_volume=None if math.isinf(t.breakeven_volume) else t.breakeven_volume,
            required_volume=None if math.isinf(t.required_volume) else t.required_volume,
            volume_multiple=None if math.isinf(t.volume_multiple) else t.volume_multiple,
            risk_level=t.risk_level,
            risk_label=label_map[t.risk_level],
            is_viable=t.is_viable,
            shortfall_per_unit=t.shortfall_per_unit,
        )


class DiscountViabilityResponse(BaseModel):
    """Full response for POST /api/v1/discount/viability."""

    # ── Mirrored inputs ───────────────────────────────────────────────────────
    current_price:    float
    fixed_costs:      float
    variable_costs:   float
    target_profit:    float

    # ── Baseline ──────────────────────────────────────────────────────────────
    base_contribution_margin: float
    base_breakeven_volume:    float
    base_required_volume:     float

    # ── Discount tiers ────────────────────────────────────────────────────────
    tiers: list[DiscountTierOut]

    # ── Risk summary ──────────────────────────────────────────────────────────
    any_high_risk:  bool
    highest_risk:   DiscountRiskLevel
    highest_risk_label: str

    # ── Gemini output (populated when include_gemini_analysis=True) ───────────
    gemini_flag:      str = ""   # "⚠ High Risk Strategy" or "" or "✓ Looks Viable"
    gemini_narrative: str = ""   # full Gemini paragraph
    gemini_verdict:   Literal["HIGH_RISK", "MEDIUM_RISK", "LOW_RISK", "SKIPPED"] = "SKIPPED"


# ─────────────────────────────────────────────────────────────────────────────
# Gemini: build prompt + call
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a brutal, numbers-first pricing strategist.
    You have been given a discount viability analysis for a small business.

    Your job:
    1. State clearly whether the discounting strategy is HIGH RISK, MEDIUM RISK, or LOW RISK.
    2. Explain WHY using the numbers provided — volume multiples, margin compression.
    3. Give 2–3 hard-hitting recommendations.

    Rules:
    - If any discount tier requires more than 2× the baseline volume, open with:
      "⚠ High Risk Strategy — [one sharp sentence]"
    - Keep the total response under 250 words.
    - No fluff. Short paragraphs. Numbers first.
    - End with a bullet list of actions (max 3, each starts with an emoji).
""")


async def _call_gemini_for_discount(
    report: ViabilityReport,
    currency: str,
    api_key: str,
    model_name: str = "gemini-2.0-flash",
) -> tuple[str, str]:
    """
    Returns (gemini_flag, gemini_narrative).
    gemini_flag is the short badge text; gemini_narrative is the full analysis.
    """
    if not api_key:
        return "", "(Gemini API key not configured)"

    prompt = viability_report_to_text(report, currency=currency)

    def _sync_call() -> str:
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                temperature=0.6,
                max_output_tokens=400,
            ),
        )
        return resp.text.strip()

    try:
        raw = await asyncio.to_thread(_sync_call)
    except Exception as exc:
        logger.error(f"[discount] Gemini call failed: {exc}")
        return "⚠ Analysis unavailable", str(exc)

    # Derive the short badge from the narrative content
    upper = raw.upper()
    if "HIGH RISK" in upper:
        flag = "⚠ High Risk Strategy"
    elif "MEDIUM RISK" in upper:
        flag = "⚡ Medium Risk"
    else:
        flag = "✓ Looks Viable"

    return flag, raw


# ─────────────────────────────────────────────────────────────────────────────
# Route
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/viability",
    response_model=DiscountViabilityResponse,
    status_code=status.HTTP_200_OK,
    summary="Discount viability analysis + Gemini risk flag",
    description=textwrap.dedent("""\
        Computes the **break-even point** and **required sales volume** for three
        discount scenarios (10%, 20%, 30%) applied to `current_price`.

        Risk classification (per tier):
        - **LOW**    — required volume ≤ 1× current BEP
        - **MEDIUM** — required volume between 1× and 2× BEP
        - **HIGH**   — required volume > 2× BEP

        When any tier is **HIGH RISK**, the Gemini agent is asked to explain the
        danger and what to do instead. The response includes a short `gemini_flag`
        ("⚠ High Risk Strategy") that the frontend renders as a prominent badge.
    """),
)
async def check_discount_viability(
    body: DiscountViabilityRequest,
    user_id: str = Depends(get_current_user_id),
) -> DiscountViabilityResponse:
    logger.info(
        f"[discount] user={user_id} | price={body.current_price} "
        f"| fc={body.fixed_costs} | vc={body.variable_costs} | tp={body.target_profit}"
    )

    # ── Step 1: Pure-math calculation ─────────────────────────────────────────
    try:
        report: ViabilityReport = calculate_discount_viability(
            current_price=body.current_price,
            fixed_costs=body.fixed_costs,
            variable_costs=body.variable_costs,
            target_profit=body.target_profit,
        )
    except ValueError as exc:
        # calculate_discount_viability only raises ValueError for invalid inputs
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    # ── Step 2: Gemini flag (only if HIGH RISK or caller requested it) ────────
    gemini_flag = ""
    gemini_narrative = ""
    gemini_verdict: Literal["HIGH_RISK", "MEDIUM_RISK", "LOW_RISK", "SKIPPED"] = "SKIPPED"

    if body.include_gemini_analysis and (
        report.any_high_risk or report.highest_risk == DiscountRiskLevel.MEDIUM
    ):
        gemini_flag, gemini_narrative = await _call_gemini_for_discount(
            report=report,
            currency=body.currency_symbol,
            api_key=settings.GEMINI_API_KEY,
        )

        upper = gemini_narrative.upper()
        if "HIGH RISK" in upper:
            gemini_verdict = "HIGH_RISK"
        elif "MEDIUM RISK" in upper:
            gemini_verdict = "MEDIUM_RISK"
        else:
            gemini_verdict = "LOW_RISK"

    elif not body.include_gemini_analysis:
        gemini_verdict = "SKIPPED"
    else:
        # All tiers LOW RISK — no Gemini call needed
        gemini_flag = "✓ Looks Viable"
        gemini_verdict = "LOW_RISK"

    # ── Step 3: Assemble response ─────────────────────────────────────────────
    risk_label_map = {
        DiscountRiskLevel.LOW:    "Low Risk",
        DiscountRiskLevel.MEDIUM: "Medium Risk",
        DiscountRiskLevel.HIGH:   "High Risk",
    }

    return DiscountViabilityResponse(
        current_price=report.current_price,
        fixed_costs=report.fixed_costs,
        variable_costs=report.variable_costs,
        target_profit=report.target_profit,
        base_contribution_margin=report.base_contribution_margin,
        base_breakeven_volume=report.base_breakeven_volume,
        base_required_volume=report.base_required_volume,
        tiers=[DiscountTierOut.from_tier(t) for t in report.tiers],
        any_high_risk=report.any_high_risk,
        highest_risk=report.highest_risk,
        highest_risk_label=risk_label_map[report.highest_risk],
        gemini_flag=gemini_flag,
        gemini_narrative=gemini_narrative,
        gemini_verdict=gemini_verdict,
    )
