"""
main.py — Spade & Scale FastAPI application entry point.
=========================================================

CORS:       Accepts requests from the Next.js frontend (localhost:3000 in dev,
            Vercel URL in prod). Configured via ALLOWED_ORIGINS env var.

Routers:
  /api/v1/auth          — Supabase auth helpers (sign-in via JWT)
  /api/v1/competitors   — competitor CRUD
  /api/v1/profit        — profit entries, summary, forecast
  /api/v1/intelligence  — on-demand competitor scraper
  /api/v1/advisor       — legacy pricing advisor (direct input)
  /api/v1/analyze       — ★ unified endpoint: Supabase data + scrape + Gemini

Run locally:
  cd backend
  uvicorn app.main:app --reload --port 8000
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1 import auth, competitor, profit, scraper, advisor, analyze, discount

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("spade")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Spade & Scale API",
    description=(
        "Business Intelligence API for SMEs — Competitor Analysis, "
        "Profit Manager & AI Advisor powered by Gemini Flash."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "System",                "description": "Health checks and diagnostics"},
        {"name": "Auth",                  "description": "Supabase authentication helpers"},
        {"name": "Competitor Analysis",   "description": "Competitor CRUD and tracking"},
        {"name": "Profit Manager",        "description": "P&L entries, summaries and forecasts"},
        {"name": "Scraper / Intelligence","description": "On-demand web scraping of competitor offers"},
        {"name": "AI Advisor",            "description": "Legacy direct-input pricing advisor"},
        {
            "name": "Analyze",
            "description": (
                "★ **Unified analysis endpoint.** "
                "Fetches Supabase P&L data, scrapes competitor offers in the background, "
                "and sends everything to Gemini Flash for a REALISTIC / BORDERLINE / DELUSIONAL verdict."
            ),
        },
        {
            "name": "Discount Viability",
            "description": (
                "Calculates break-even point and required sales volume for 10%, 20%, and 30% "
                "discounts. Flags HIGH RISK strategies (required volume > 2× BEP) via Gemini."
            ),
        },
    ],
)


# ─────────────────────────────────────────────────────────────────────────────
# CORS — allow the Next.js frontend
# ─────────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,   # e.g. ["http://localhost:3000", "https://your-app.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api/v1/auth",        tags=["Auth"])
app.include_router(competitor.router, prefix="/api/v1/competitors",  tags=["Competitor Analysis"])
app.include_router(profit.router,     prefix="/api/v1/profit",       tags=["Profit Manager"])
app.include_router(scraper.router,    prefix="/api/v1/intelligence", tags=["Scraper / Intelligence"])
app.include_router(advisor.router,    prefix="/api/v1/advisor",      tags=["AI Advisor"])

# ★ The new unified analyze router
app.include_router(analyze.router,    prefix="/api/v1/analyze",      tags=["Analyze"])

# Discount viability — break-even + risk classification + Gemini flag
app.include_router(discount.router,   prefix="/api/v1/discount",     tags=["Discount Viability"])


# ─────────────────────────────────────────────────────────────────────────────
# System endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Quick liveness probe — used by Docker, Render, and load balancers."""
    return {"status": "ok", "service": "Spade & Scale API", "version": "1.1.0"}


@app.get("/", tags=["System"], include_in_schema=False)
async def root():
    return JSONResponse({"message": "Spade & Scale API is running. Visit /docs for the interactive reference."})


# ─────────────────────────────────────────────────────────────────────────────
# Startup / shutdown events
# ─────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    logger.info("🂠  Spade & Scale API starting up...")
    logger.info(f"   ALLOWED_ORIGINS : {settings.ALLOWED_ORIGINS}")
    logger.info(f"   GEMINI_API_KEY  : {'✓ set' if settings.GEMINI_API_KEY else '✗ MISSING — /analyze will fail'}")
    logger.info(f"   SUPABASE_URL    : {settings.SUPABASE_URL[:40]}...")


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("🂠  Spade & Scale API shutting down.")
