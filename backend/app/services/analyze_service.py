"""
services/analyze_service.py
============================
Orchestration layer for the /analyze endpoint.

Responsibilities:
  1. fetch_financial_data()   — pulls profit_entries + business profile from Supabase
  2. run_background_scrape()  — async background task: scrapes competitor URLs
  3. call_gemini()            — sends enriched context to Gemini Flash
  4. build_analysis()         — main entry point combining all three steps

This service is the ONLY place that does financial arithmetic, so null-safety
is enforced here by construction: all inputs arrive as validated Pydantic models.
"""

from __future__ import annotations

import asyncio
import logging
import textwrap
import uuid
from datetime import datetime, date
from typing import Optional

from google import genai
from google.genai import types as genai_types
from supabase import Client

from app.models.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    BusinessProfile,
    FinancialSnapshot,
    PricingFormula,
    ScrapedCompetitor,
    ScrapeJobResult,
)
from app.utils.scraper import scrape_multiple

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# In-process job store  (replace with Redis for multi-worker deployments)
# ─────────────────────────────────────────────────────────────────────────────

_JOB_STORE: dict[str, ScrapeJobResult] = {}


def get_job(job_id: str) -> Optional[ScrapeJobResult]:
    return _JOB_STORE.get(job_id)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Supabase data fetching
# ─────────────────────────────────────────────────────────────────────────────

PROFIT_TABLE = "profit_entries"
PROFILE_TABLE = "profiles"          # Supabase Auth helpers create this
BUSINESS_TABLE = "user_businesses"  # SQLAlchemy ORM table


def fetch_financial_data(
    db: Client,
    user_id: str,
    period: Optional[str] = None,
) -> tuple[FinancialSnapshot, Optional[BusinessProfile]]:
    """
    Fetches the user's most recent monthly P&L from Supabase and their
    business profile (for target_profit, niche, etc.).

    Returns (FinancialSnapshot, BusinessProfile | None).

    The FinancialSnapshot is always returned — it may have zero values if the
    user has no profit entries, but it will NEVER have None in numeric fields.
    """
    # ── Determine the current period ─────────────────────────────────────────
    target_period = period or date.today().strftime("%Y-%m")

    # ── Fetch profit entries ──────────────────────────────────────────────────
    try:
        entries_resp = (
            db.table(PROFIT_TABLE)
            .select("entry_type, amount, entry_date")
            .eq("user_id", user_id)
            .like("entry_date", f"{target_period}%")   # filter to current month
            .execute()
        )
        entries = entries_resp.data or []
    except Exception as exc:
        logger.error(f"[analyze] Failed to fetch profit_entries for {user_id}: {exc}")
        entries = []

    # ── Aggregate ─────────────────────────────────────────────────────────────
    total_revenue = sum(
        float(e.get("amount") or 0)
        for e in entries
        if e.get("entry_type") == "revenue"
    )
    total_expenses = sum(
        float(e.get("amount") or 0)
        for e in entries
        if e.get("entry_type") == "expense"
    )
    net_profit = round(total_revenue - total_expenses, 2)
    margin = (
        round((net_profit / total_revenue) * 100, 2)
        if total_revenue > 0
        else None
    )

    snapshot = FinancialSnapshot(
        period=target_period,
        total_revenue=round(total_revenue, 2),
        total_expenses=round(total_expenses, 2),
        net_profit=net_profit,
        profit_margin_pct=margin,
        entry_count=len(entries),
    )

    # ── Fetch business profile ─────────────────────────────────────────────────
    business_profile: Optional[BusinessProfile] = None
    try:
        biz_resp = (
            db.table(BUSINESS_TABLE)
            .select("id, name, niche, target_profit, website_url")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        biz_rows = biz_resp.data or []
        if biz_rows:
            row = biz_rows[0]
            business_profile = BusinessProfile(
                id=row["id"],
                name=row.get("name") or "My Business",
                niche=row.get("niche"),          # validator coerces None → "General"
                target_profit=row.get("target_profit"),   # validator coerces None → 0.0
                website_url=row.get("website_url"),
            )
    except Exception as exc:
        logger.warning(f"[analyze] Could not fetch business profile for {user_id}: {exc}")

    return snapshot, business_profile


# ─────────────────────────────────────────────────────────────────────────────
# 2. Background scrape task
# ─────────────────────────────────────────────────────────────────────────────

async def _scrape_and_store(job_id: str, urls: list[str]) -> None:
    """
    Background coroutine: scrapes competitor URLs and stores results in
    the in-process job store.  Designed to be launched via
    BackgroundTasks.add_task() — runs AFTER the HTTP response is sent.
    """
    job = _JOB_STORE.get(job_id)
    if not job:
        return

    job.status = "running"
    logger.info(f"[scrape-job:{job_id}] Starting scrape for {len(urls)} URL(s).")

    try:
        results = await scrape_multiple(urls, concurrency=3)

        scraped: list[ScrapedCompetitor] = []
        for r in results:
            # Extract a human-readable name from the URL netloc
            from urllib.parse import urlparse
            netloc = urlparse(r.url).netloc or r.url
            name = netloc.removeprefix("www.").split(".")[0].title()

            scraped.append(
                ScrapedCompetitor(
                    name=name,
                    website=r.url,
                    best_promo=r.best_promo,          # validator ensures str not None
                    promos=r.promos,
                    scrape_success=r.success,
                    scrape_error=r.error,
                )
            )

        job.competitors = scraped
        job.status = "done"
        job.completed_at = datetime.utcnow()
        logger.info(f"[scrape-job:{job_id}] Done. {len(scraped)} competitor(s) scraped.")

    except Exception as exc:
        logger.error(f"[scrape-job:{job_id}] Failed: {exc}")
        job.status = "failed"
        job.error = str(exc)
        job.completed_at = datetime.utcnow()


def start_scrape_job(urls: list[str]) -> str:
    """
    Creates a ScrapeJobResult in the job store and returns its ID.
    The actual scrape is triggered by the caller via BackgroundTasks.
    """
    job_id = str(uuid.uuid4())
    _JOB_STORE[job_id] = ScrapeJobResult(job_id=job_id, status="pending")
    return job_id


async def run_background_scrape(job_id: str, urls: list[str]) -> None:
    """Entry point called by FastAPI BackgroundTasks."""
    await _scrape_and_store(job_id, urls)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Pricing formula (null-safe)
# ─────────────────────────────────────────────────────────────────────────────

def compute_pricing(req: AnalyzeRequest) -> tuple[float, PricingFormula]:
    """
    Price_suggested = (Fixed_Costs + Target_Profit) / Estimated_Volume + Variable_Cost

    All inputs have already been validated by Pydantic — no null checks needed here.
    """
    contribution_needed = req.fixed_costs + req.target_profit
    # estimated_volume is guaranteed > 0 by model_validator
    contribution_per_unit = contribution_needed / req.estimated_volume
    suggested = round(contribution_per_unit + req.variable_cost, 2)

    breakdown = PricingFormula(
        fixed_costs=req.fixed_costs,
        target_profit=req.target_profit,
        estimated_volume=req.estimated_volume,
        variable_cost=req.variable_cost,
        contribution_needed_per_unit=round(contribution_per_unit, 4),
        suggested_price=suggested,
    )
    return suggested, breakdown


# ─────────────────────────────────────────────────────────────────────────────
# 4. Gemini prompt
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a Brutally Honest Business Consultant — a Wall-Street CFO crossed
    with a no-nonsense market trader who has seen every flavour of small-business
    self-delusion you can imagine.

    Your job for this analysis:
    1. Judge whether the user's pricing target is REALISTIC, BORDERLINE, or DELUSIONAL
       based on their cost structure AND the competitor market data provided.
    2. Be direct, data-driven, and completely unfiltered.
    3. Cite specific numbers from the context — the user gave you real data, use it.
    4. Highlight market risks (undercutting, promo wars, commoditisation).
    5. Give 3–5 clear, actionable next steps.

    Output format (strictly follow this):
    **[VERDICT]** — one of: REALISTIC / BORDERLINE / DELUSIONAL

    **Why**
    2-3 punchy paragraphs, numbers-first.

    **What to do**
    - 🎯 Bullet 1
    - 📉 Bullet 2
    - 🔥 Bullet 3
    (3–5 bullets, each starting with an emoji)

    Total response: under 400 words. No corporate fluff. Consultants charge by insight.
""")


def _build_prompt(
    req: AnalyzeRequest,
    suggested_price: float,
    breakdown: PricingFormula,
    snapshot: Optional[FinancialSnapshot],
    profile: Optional[BusinessProfile],
    competitors: list[ScrapedCompetitor],
) -> str:
    """
    Builds the user-turn message for Gemini with all available context
    interpolated as structured text.
    """
    sym = req.currency_symbol

    # ── Business context ──────────────────────────────────────────────────────
    biz_name = profile.name if profile else "This business"
    niche    = profile.niche if profile else "General"
    biz_target = (
        f"{sym}{profile.target_profit:,.2f}" if profile and profile.target_profit
        else "Not specified"
    )

    # ── Financial snapshot ────────────────────────────────────────────────────
    if snapshot:
        fin_block = textwrap.dedent(f"""\
            === CURRENT MONTH FINANCIALS ({snapshot.period}) ===
              Actual Revenue   : {sym}{snapshot.total_revenue:,.2f}
              Actual Expenses  : {sym}{snapshot.total_expenses:,.2f}
              Net Profit (real): {sym}{snapshot.net_profit:,.2f}
              Profit Margin    : {f'{snapshot.profit_margin_pct:.1f}%' if snapshot.profit_margin_pct is not None else 'N/A'}
              Data points      : {snapshot.entry_count} entries
        """)
    else:
        fin_block = "=== CURRENT MONTH FINANCIALS ===\n  (No data yet — new user)\n"

    # ── Competitor section ────────────────────────────────────────────────────
    if competitors:
        comp_lines = []
        for c in competitors:
            line = f"  • {c.name}"
            if c.website:
                line += f" ({c.website})"
            if c.best_promo:
                line += f'\n    ↳ Best offer detected: "{c.best_promo[:200]}"'
            if not c.scrape_success:
                line += f"\n    ↳ (scrape failed: {c.scrape_error or 'unknown'})"
            comp_lines.append(line)
        comp_block = "=== COMPETITOR OFFERS (scraped) ===\n" + "\n".join(comp_lines)
    else:
        comp_block = "=== COMPETITOR OFFERS ===\n  (No competitor URLs provided — analyse blind)"

    # ── Pricing formula ───────────────────────────────────────────────────────
    formula_block = textwrap.dedent(f"""\
        === PRICING FORMULA ===
          Fixed Costs          : {sym}{req.fixed_costs:,.2f}
          Target Profit (goal) : {sym}{req.target_profit:,.2f}
          Estimated Volume     : {req.estimated_volume:,.0f} units
          Variable Cost/unit   : {sym}{req.variable_cost:,.2f}
          ─────────────────────────────────────
          Suggested Price      : {sym}{suggested_price:,.2f}
          Current Price        : {f'{sym}{req.current_price:,.2f}' if req.current_price else 'Not set'}
          Business Profit Goal : {biz_target}  ← from onboarding
    """)

    return f"""
BUSINESS: {biz_name} | NICHE: {niche}

{fin_block}
{formula_block}
{comp_block}

---
With ALL the above data, give your brutally honest verdict.
Is {biz_name}'s target profit of {biz_target} REALISTIC, BORDERLINE, or DELUSIONAL
given their cost structure AND the competitor market?

Cite specific numbers. Be direct. No hand-holding.
""".strip()


# ─────────────────────────────────────────────────────────────────────────────
# 5. Main orchestrator
# ─────────────────────────────────────────────────────────────────────────────

async def build_analysis(
    req: AnalyzeRequest,
    user_id: str,
    db: Client,
    gemini_api_key: str,
    *,
    # When True, scrape is awaited immediately (e.g. for testing).
    # When False (production), caller uses BackgroundTasks.
    eager_scrape: bool = False,
) -> tuple[AnalyzeResponse, str]:
    """
    Main orchestration function. Returns (AnalyzeResponse, scrape_job_id).

    The scrape_job_id can be polled via GET /api/v1/analyze/jobs/{job_id}.
    """
    # ── Step 1: Fetch Supabase data ───────────────────────────────────────────
    snapshot, profile = fetch_financial_data(db, user_id)

    # ── Step 2: Pricing formula ───────────────────────────────────────────────
    suggested_price, breakdown = compute_pricing(req)
    markup = round(suggested_price - req.variable_cost, 2)

    # ── Step 3: Competitor scrape (eager or background) ───────────────────────
    scraped_competitors: list[ScrapedCompetitor] = []
    job_id = ""

    if req.competitor_urls:
        if eager_scrape:
            # Await in-place (useful for testing and synchronous routes)
            raw_results = await scrape_multiple(req.competitor_urls, concurrency=3)
            for r in raw_results:
                from urllib.parse import urlparse
                netloc = urlparse(r.url).netloc or r.url
                name = netloc.removeprefix("www.").split(".")[0].title()
                scraped_competitors.append(
                    ScrapedCompetitor(
                        name=name,
                        website=r.url,
                        best_promo=r.best_promo,
                        promos=r.promos,
                        scrape_success=r.success,
                        scrape_error=r.error,
                    )
                )
        else:
            # Register a job — FastAPI BackgroundTasks will fire it after response
            job_id = start_scrape_job(req.competitor_urls)

    # ── Step 4: Call Gemini ───────────────────────────────────────────────────
    prompt = _build_prompt(
        req=req,
        suggested_price=suggested_price,
        breakdown=breakdown,
        snapshot=snapshot,
        profile=profile,
        competitors=scraped_competitors,
    )

    llm_text = await _call_gemini(
        prompt=prompt,
        api_key=gemini_api_key,
        model_name=req.model_name,
    )

    # ── Step 5: Derive verdict ────────────────────────────────────────────────
    upper = llm_text.upper()
    if "DELUSIONAL" in upper:
        verdict = "DELUSIONAL"
    elif "BORDERLINE" in upper:
        verdict = "BORDERLINE"
    else:
        verdict = "REALISTIC"

    # ── Assemble response ─────────────────────────────────────────────────────
    response = AnalyzeResponse(
        suggested_price=suggested_price,
        markup_over_variable_cost=markup,
        competitor_avg_price=None,   # populated post-scrape via /jobs poll
        verdict=verdict,
        llm_analysis=llm_text,
        formula_breakdown=breakdown,
        competitors_scraped=scraped_competitors,
        scrape_job_id=job_id or None,
        financial_snapshot=snapshot,
        model_used=req.model_name,
    )

    return response, job_id


async def _call_gemini(prompt: str, api_key: str, model_name: str) -> str:
    """
    Calls the Gemini API and returns the text response.
    Wrapped in asyncio.to_thread because google-genai's client is synchronous.
    """
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY is not configured. "
            "Add it to backend/.env before calling the analyze endpoint."
        )

    def _sync_call() -> str:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=600,
            ),
        )
        return response.text.strip()

    # Run the synchronous SDK call in a thread pool to avoid blocking the event loop
    return await asyncio.to_thread(_sync_call)
