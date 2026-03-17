"""
advisor.py — Brutally Honest Business Consultant, powered by Gemini Flash.

Core responsibility:
  1. Accept the user's cost inputs + target_profit + scraped competitor data.
  2. Compute a suggested price using the canonical formula:
        Price_suggested = (Fixed_Costs + Target_Profit) / Estimated_Volume + Variable_Cost
  3. Feed everything into Gemini with a no-nonsense system prompt.
  4. Return a structured advisory response that tells the user whether their
     goal is realistic OR if they are being delusional — with hard numbers.
"""

from __future__ import annotations

import os
import textwrap
from dataclasses import dataclass, field
from typing import Optional

from google import genai
from google.genai import types as genai_types

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class CompetitorSnapshot:
    """Lightweight summary of one scraped competitor."""
    name: str
    website: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    rating: Optional[float] = None
    best_promo: Optional[str] = None       # top promo text from scraper
    promos: list[str] = field(default_factory=list)


@dataclass
class PricingInputs:
    """
    All cost/volume inputs the user provides.

    fixed_costs     — total monthly/annual fixed overhead (rent, salaries, etc.)
    variable_cost   — per-unit variable cost (materials, shipping, etc.)
    estimated_volume — expected units sold in the same period as fixed_costs
    target_profit   — the profit the user *dreams* of making in that period
    current_price   — the price the user is currently charging (optional)
    """
    fixed_costs: float
    variable_cost: float
    estimated_volume: float
    target_profit: float
    current_price: Optional[float] = None


@dataclass
class AdvisoryResult:
    """Structured response returned to the caller / API layer."""
    suggested_price: float
    markup_over_variable_cost: float        # how much above variable cost?
    competitor_avg_price: Optional[float]   # derived from promos/notes if available
    verdict: str                            # "REALISTIC" | "DELUSIONAL" | "BORDERLINE"
    llm_analysis: str                       # full Gemini narrative
    formula_breakdown: dict                 # intermediates for the frontend to display


# ---------------------------------------------------------------------------
# Formula
# ---------------------------------------------------------------------------

def compute_suggested_price(inputs: PricingInputs) -> tuple[float, dict]:
    """
    Apply the canonical pricing formula:
        Price_suggested = (Fixed_Costs + Target_Profit) / Estimated_Volume + Variable_Cost

    Returns (suggested_price, formula_breakdown_dict).
    """
    if inputs.estimated_volume <= 0:
        raise ValueError("estimated_volume must be greater than zero.")

    contribution_needed = inputs.fixed_costs + inputs.target_profit
    price = (contribution_needed / inputs.estimated_volume) + inputs.variable_cost

    breakdown = {
        "fixed_costs": inputs.fixed_costs,
        "target_profit": inputs.target_profit,
        "estimated_volume": inputs.estimated_volume,
        "variable_cost": inputs.variable_cost,
        "contribution_needed_per_unit": round(contribution_needed / inputs.estimated_volume, 4),
        "suggested_price": round(price, 2),
    }
    return round(price, 2), breakdown


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a Brutally Honest Business Consultant — think of yourself as the
    lovechild of a Wall Street CFO and an old-school market trader who has seen
    every flavour of small-business delusion imaginable.

    Your job is to:
    1. Analyse whether the user's pricing goal is achievable compared to the
       current market landscape shown by their competitors.
    2. Be direct, data-driven, and completely unfiltered. If their goal is
       unrealistic, say so — clearly, bluntly, and with the numbers to prove it.
    3. Highlight specific market risks (undercutting, commoditisation, promo wars).
    4. Give actionable recommendations: what they MUST change to hit their target
       or, if the goal is impossible, what a sane alternative looks like.

    Formatting rules:
    - Use short punchy paragraphs. No corporate fluff.
    - Bold the verdict (REALISTIC / BORDERLINE / DELUSIONAL) on the first line.
    - Follow with a "Why" section citing numbers from the context.
    - End with a "What to do" bullet list (3–5 bullets, each starting with an emoji).
    - Keep the total response under 400 words — consultants charge by insight, not word count.
""")


def _build_user_message(
    inputs: PricingInputs,
    suggested_price: float,
    breakdown: dict,
    competitors: list[CompetitorSnapshot],
) -> str:
    """Compose the user-turn message that carries all the data."""

    comp_lines = []
    for c in competitors:
        line = f"  • {c.name}"
        if c.category:
            line += f" [{c.category}]"
        if c.region:
            line += f" — {c.region}"
        if c.rating is not None:
            line += f" | ⭐ {c.rating}"
        if c.best_promo:
            line += f' | Best offer: "{c.best_promo}"'
        comp_lines.append(line)

    comp_section = "\n".join(comp_lines) if comp_lines else "  (No competitor data available)"

    current_price_line = (
        f"  Current price being charged : \u20b9{inputs.current_price:,.2f}"
        if inputs.current_price is not None
        else "  Current price being charged : Not specified"
    )

    return textwrap.dedent(f"""\
        === USER BUSINESS INPUTS (currency: Indian Rupees \u20b9) ===
          Fixed costs (period)         : \u20b9{inputs.fixed_costs:,.2f}
          Variable cost (per unit)     : \u20b9{inputs.variable_cost:,.2f}
          Estimated sales volume       : {inputs.estimated_volume:,.0f} units
          Target profit (same period)  : \u20b9{inputs.target_profit:,.2f}
        {current_price_line}

        === FORMULA RESULT ===
          Suggested price              : \u20b9{suggested_price:,.2f}
          (= (\u20b9{inputs.fixed_costs:,.2f} + \u20b9{inputs.target_profit:,.2f}) \u00f7 {inputs.estimated_volume:,.0f} units + \u20b9{inputs.variable_cost:,.2f})

        === COMPETITOR LANDSCAPE ===
        {comp_section}

        ---
        With the above data, give your brutally honest verdict.
        All amounts are in Indian Rupees (\u20b9). Use \u20b9 symbol in your response.
        Is the user's target profit REALISTIC, BORDERLINE, or DELUSIONAL given
        the market? Cite specific numbers. Be direct. No hand-holding.
    """)


# ---------------------------------------------------------------------------
# Main service function
# ---------------------------------------------------------------------------

def run_advisor(
    inputs: PricingInputs,
    competitors: list[CompetitorSnapshot],
    *,
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.5-flash",
) -> AdvisoryResult:
    """
    Compute the suggested price, call Gemini, and return a structured result.

    Parameters
    ----------
    inputs      : PricingInputs — cost/volume/profit data from the user.
    competitors : list[CompetitorSnapshot] — scraped competitor records.
    api_key     : Gemini API key (falls back to GEMINI_API_KEY env var).
    model_name  : which Gemini model to use (default: gemini-2.0-flash).

    Returns
    -------
    AdvisoryResult with suggested_price, verdict, and full LLM analysis.
    """
    # ── 1. Compute price ────────────────────────────────────────────────────
    suggested_price, breakdown = compute_suggested_price(inputs)

    markup = round(suggested_price - inputs.variable_cost, 2)

    # ── 2. Configure Gemini ─────────────────────────────────────────────────
    resolved_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not resolved_key:
        raise EnvironmentError(
            "GEMINI_API_KEY is not set. "
            "Add it to your .env file or pass api_key= explicitly."
        )
    client = genai.Client(api_key=resolved_key)

    # ── 3. Build prompt & call model ─────────────────────────────────────────
    user_message = _build_user_message(inputs, suggested_price, breakdown, competitors)

    response = client.models.generate_content(
        model=model_name,
        contents=user_message,
        config=genai_types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            temperature=0.7,        # a bit spicy — honest consultants have opinions
            max_output_tokens=600,
        ),
    )

    llm_text: str = response.text.strip()

    # ── 4. Derive simple verdict from LLM output ─────────────────────────────
    upper = llm_text.upper()
    if "DELUSIONAL" in upper:
        verdict = "DELUSIONAL"
    elif "BORDERLINE" in upper:
        verdict = "BORDERLINE"
    else:
        verdict = "REALISTIC"

    # ── 5. Estimate competitor avg price from promos (best effort) ───────────
    # Real scraping gives promo text, not raw prices — so we leave this None
    # unless the caller enriches the snapshots with parsed price data.
    competitor_avg_price: Optional[float] = None

    return AdvisoryResult(
        suggested_price=suggested_price,
        markup_over_variable_cost=markup,
        competitor_avg_price=competitor_avg_price,
        verdict=verdict,
        llm_analysis=llm_text,
        formula_breakdown=breakdown,
    )
