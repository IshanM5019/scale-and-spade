"""
utils/finance.py
=================
Pure-Python financial utility functions for Spade & Scale.

All functions are stateless and side-effect-free — safe to import
anywhere and unit-test without a database or API key.

Key function:
  calculate_discount_viability(current_price, fixed_costs, variable_costs, target_profit)

Calculations performed:
  1. Break-Even Point (BEP) at current price
  2. For each discount tier (10%, 20%, 30%):
       a. Discounted price
       b. Contribution margin per unit
       c. Break-Even Volume at discounted price
       d. Required Volume to still achieve target_profit
       e. Volume multiple vs. current BEP → risk classification
  3. Risk level:
       LOW      — required volume ≤ 1× BEP
       MEDIUM   — 1× < required volume ≤ 2× BEP
       HIGH     — required volume > 2× BEP  (flag via Gemini in the router)

Design constraints:
  - Zero division is impossible: variable_costs < current_price is validated
    before any ratio is computed.
  - All returned values are finite floats — no None in numeric fields.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


# ─────────────────────────────────────────────────────────────────────────────
# Enums & constants
# ─────────────────────────────────────────────────────────────────────────────

DISCOUNT_TIERS: tuple[float, ...] = (0.10, 0.20, 0.30)   # 10 %, 20 %, 30 %

HIGH_RISK_MULTIPLE = 2.0   # required_volume > 2× BEP → HIGH RISK
MED_RISK_MULTIPLE  = 1.0   # required_volume > 1× BEP → MEDIUM RISK


class DiscountRiskLevel(str, Enum):
    LOW    = "LOW"
    MEDIUM = "MEDIUM"
    HIGH   = "HIGH"


# ─────────────────────────────────────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class DiscountTierResult:
    """
    Financial result for a single discount percentage applied to current_price.

    Fields
    ------
    discount_pct          : 0.10 / 0.20 / 0.30
    discounted_price      : current_price × (1 − discount_pct)
    contribution_margin   : discounted_price − variable_costs  ($ per unit)
    breakeven_volume      : fixed_costs / contribution_margin
    required_volume       : (fixed_costs + target_profit) / contribution_margin
    volume_multiple       : required_volume / base_breakeven_volume
    risk_level            : LOW | MEDIUM | HIGH
    is_viable             : True if contribution_margin > 0 (can cover any fixed cost at all)
    shortfall_per_unit    : 0 if viable, else abs(contribution_margin)  [diagnostic]
    """
    discount_pct:        float     # e.g. 0.10
    discounted_price:    float
    contribution_margin: float     # may be negative if discount too deep
    breakeven_volume:    float     # units needed to cover fixed_costs
    required_volume:     float     # units needed to hit target_profit
    volume_multiple:     float     # required_volume / base BEP
    risk_level:          DiscountRiskLevel
    is_viable:           bool      # False if margin ≤ 0 (selling below variable cost)
    shortfall_per_unit:  float     # $ lost per unit when not viable


@dataclass
class ViabilityReport:
    """
    Full viability report returned by calculate_discount_viability().
    All numeric fields are finite floats — never None.
    """
    # ── Inputs (echoed back for convenience) ─────────────────────────────────
    current_price:    float
    fixed_costs:      float
    variable_costs:   float
    target_profit:    float

    # ── Baseline (no discount) ────────────────────────────────────────────────
    base_contribution_margin: float   # current_price − variable_costs
    base_breakeven_volume:    float   # fixed_costs / base_contribution_margin
    base_required_volume:     float   # (fixed_costs + target_profit) / base_CM

    # ── Per-discount tiers ────────────────────────────────────────────────────
    tiers: list[DiscountTierResult] = field(default_factory=list)

    # ── Summary ───────────────────────────────────────────────────────────────
    any_high_risk: bool = False        # True if ANY tier is HIGH RISK
    highest_risk:  DiscountRiskLevel = DiscountRiskLevel.LOW

    # ── Gemini flag (set by the API layer, not the math layer) ────────────────
    gemini_flag: str = ""              # "High Risk Strategy" etc.
    gemini_narrative: str = ""         # Full LLM analysis


# ─────────────────────────────────────────────────────────────────────────────
# Core calculation function
# ─────────────────────────────────────────────────────────────────────────────

def calculate_discount_viability(
    current_price:  float,
    fixed_costs:    float,
    variable_costs: float,
    target_profit:  float,
) -> ViabilityReport:
    """
    Calculate the financial viability of applying 10%, 20%, and 30% discounts
    to current_price given the cost structure and profit target.

    Parameters
    ----------
    current_price  : Current selling price per unit  (must be > variable_costs)
    fixed_costs    : Total fixed costs for the period (rent, salaries…)  (≥ 0)
    variable_costs : Per-unit variable cost (materials, shipping…)  (≥ 0)
    target_profit  : Desired profit for the same period  (≥ 0)

    Returns
    -------
    ViabilityReport with per-tier analysis and an overall risk summary.

    Raises
    ------
    ValueError  if inputs violate basic financial constraints:
                  - current_price ≤ 0
                  - variable_costs < 0
                  - fixed_costs < 0
                  - target_profit < 0
                  - current_price ≤ variable_costs  (selling below cost at NO discount)
    """
    # ── Input validation ──────────────────────────────────────────────────────
    if current_price <= 0:
        raise ValueError(f"current_price must be positive, got {current_price}")
    if variable_costs < 0:
        raise ValueError(f"variable_costs cannot be negative, got {variable_costs}")
    if fixed_costs < 0:
        raise ValueError(f"fixed_costs cannot be negative, got {fixed_costs}")
    if target_profit < 0:
        raise ValueError(f"target_profit cannot be negative, got {target_profit}")
    if current_price <= variable_costs:
        raise ValueError(
            f"current_price ({current_price}) must be greater than variable_costs "
            f"({variable_costs}). You are already selling below cost."
        )

    # ── Baseline calculations ─────────────────────────────────────────────────
    base_cm = current_price - variable_costs           # contribution margin, no discount
    # base_cm > 0 guaranteed by validation above

    base_bev = fixed_costs / base_cm                  # break-even volume @ no discount
    base_req = (fixed_costs + target_profit) / base_cm  # volume to hit target

    # ── Per-tier calculations ─────────────────────────────────────────────────
    tiers: list[DiscountTierResult] = []
    risk_levels_seen: list[DiscountRiskLevel] = []

    for pct in DISCOUNT_TIERS:
        disc_price = round(current_price * (1.0 - pct), 6)
        cm = round(disc_price - variable_costs, 6)

        if cm <= 0:
            # Selling below variable cost — no BEV is computable
            tier = DiscountTierResult(
                discount_pct=pct,
                discounted_price=round(disc_price, 2),
                contribution_margin=round(cm, 2),
                breakeven_volume=math.inf,
                required_volume=math.inf,
                volume_multiple=math.inf,
                risk_level=DiscountRiskLevel.HIGH,
                is_viable=False,
                shortfall_per_unit=round(abs(cm), 2),
            )
        else:
            bev = fixed_costs / cm
            req = (fixed_costs + target_profit) / cm
            multiple = req / base_bev if base_bev > 0 else math.inf

            if multiple > HIGH_RISK_MULTIPLE:
                risk = DiscountRiskLevel.HIGH
            elif multiple > MED_RISK_MULTIPLE:
                risk = DiscountRiskLevel.MEDIUM
            else:
                risk = DiscountRiskLevel.LOW

            tier = DiscountTierResult(
                discount_pct=pct,
                discounted_price=round(disc_price, 2),
                contribution_margin=round(cm, 2),
                breakeven_volume=round(bev, 2),
                required_volume=round(req, 2),
                volume_multiple=round(multiple, 4),
                risk_level=risk,
                is_viable=True,
                shortfall_per_unit=0.0,
            )

        tiers.append(tier)
        risk_levels_seen.append(tier.risk_level)

    # ── Summary ───────────────────────────────────────────────────────────────
    # Order: HIGH > MEDIUM > LOW
    _rank = {DiscountRiskLevel.LOW: 0, DiscountRiskLevel.MEDIUM: 1, DiscountRiskLevel.HIGH: 2}
    highest = max(risk_levels_seen, key=lambda r: _rank[r])
    any_high = highest == DiscountRiskLevel.HIGH

    return ViabilityReport(
        current_price=round(current_price, 2),
        fixed_costs=round(fixed_costs, 2),
        variable_costs=round(variable_costs, 2),
        target_profit=round(target_profit, 2),
        base_contribution_margin=round(base_cm, 2),
        base_breakeven_volume=round(base_bev, 2),
        base_required_volume=round(base_req, 2),
        tiers=tiers,
        any_high_risk=any_high,
        highest_risk=highest,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Helper: human-readable summary (used by Gemini prompt builder)
# ─────────────────────────────────────────────────────────────────────────────

def viability_report_to_text(report: ViabilityReport, currency: str = "$") -> str:
    """
    Converts a ViabilityReport into a plain-text summary suitable for
    injecting into a Gemini prompt.
    """
    lines = [
        "=== DISCOUNT VIABILITY ANALYSIS ===",
        f"  Current Price     : {currency}{report.current_price:,.2f}",
        f"  Variable Cost     : {currency}{report.variable_costs:,.2f}",
        f"  Fixed Costs       : {currency}{report.fixed_costs:,.2f}",
        f"  Target Profit     : {currency}{report.target_profit:,.2f}",
        f"  Base BEP Volume   : {report.base_breakeven_volume:,.1f} units",
        f"  Base Req. Volume  : {report.base_required_volume:,.1f} units (to hit target)",
        "",
        "--- Discount Scenarios ---",
    ]
    for t in report.tiers:
        pct_label = f"{int(t.discount_pct * 100)}%"
        if not t.is_viable:
            lines.append(
                f"  {pct_label} off → {currency}{t.discounted_price:,.2f} | "
                f"⚠ BELOW VARIABLE COST — unviable at any volume"
            )
        else:
            vol_str = (
                f"∞" if math.isinf(t.required_volume)
                else f"{t.required_volume:,.1f}"
            )
            lines.append(
                f"  {pct_label} off → {currency}{t.discounted_price:,.2f} | "
                f"CM: {currency}{t.contribution_margin:,.2f}/unit | "
                f"BEP: {t.breakeven_volume:,.1f} | "
                f"Need: {vol_str} units ({t.volume_multiple:.1f}× base) | "
                f"Risk: {t.risk_level.value}"
            )
    return "\n".join(lines)
