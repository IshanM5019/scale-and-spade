from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import auth, competitor, profit, scraper, advisor

app = FastAPI(
    title="Spade & Scale API",
    description="Business Intelligence API for SMEs — Competitor Analysis & Profit Manager",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow the Next.js frontend to call this API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router,       prefix="/api/v1/auth",        tags=["Auth"])
app.include_router(competitor.router, prefix="/api/v1/competitors",  tags=["Competitor Analysis"])
app.include_router(profit.router,     prefix="/api/v1/profit",       tags=["Profit Manager"])
app.include_router(scraper.router,    prefix="/api/v1/intelligence", tags=["Scraper / Intelligence"])
app.include_router(advisor.router,    prefix="/api/v1/advisor",      tags=["AI Advisor"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "Spade & Scale API"}
