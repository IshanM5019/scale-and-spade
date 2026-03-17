"""
Spade & Scale — Web Scraper Utility
=====================================
Uses httpx to load pages (lightweight, under Render RAM limits),
then BeautifulSoup to parse and extract promotional / offer content.

Features:
  - Lightweight httpx async client (avoids heavy Playwright chromium)
  - Targets 'Promo', 'Offer', 'Deal', 'Discount' sections by:
      • semantic HTML (section, article, aside)
      • ARIA roles
      • common CSS class/id patterns
      • meta tags (og:description, twitter:description)
  - Falls back to full page text if no promo section found
  - Returns structured PromoResult dataclass
  - Async-first design — safe to call from FastAPI background tasks

Usage:
    from app.utils.scraper import scrape_promotions
    result = await scrape_promotions("https://example.com")
    print(result.promos)
"""
import asyncio
import re
import logging
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration constants
# ---------------------------------------------------------------------------
DEFAULT_TIMEOUT_MS      = 20_000    # 20 seconds page load timeout
USER_AGENT              = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# Keywords that signal a promo/offer section
# ---------------------------------------------------------------------------
PROMO_KEYWORDS = [
    "promo", "promotion", "offer", "offers", "deal", "deals",
    "discount", "discounts", "sale", "coupon", "voucher",
    "flash-sale", "limited-time", "exclusive", "special",
    "savings", "clearance", "bundle", "cashback",
]

# CSS class/id substrings to look for (case-insensitive)
PROMO_CLASS_PATTERNS = re.compile(
    r"(promo|offer|deal|discount|sale|coupon|banner|campaign|special|savings)",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------
@dataclass
class PromoResult:
    url: str
    success: bool
    page_title: str = ""
    promos: list[str] = field(default_factory=list)          # extracted promo texts
    raw_html_snippet: str = ""                                # raw HTML of best match section
    meta_description: str = ""
    error: Optional[str] = None

    @property
    def best_promo(self) -> str:
        """Returns the most prominent promo text, or empty string."""
        return self.promos[0] if self.promos else ""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _is_promo_element(tag) -> bool:
    """
    Returns True if a BeautifulSoup tag looks like a promo/offer section.
    Checks: class, id, aria-label, data-section attributes.
    """
    for attr in ("class", "id", "aria-label", "data-section", "data-testid"):
        value = tag.get(attr, "")
        if isinstance(value, list):
            value = " ".join(value)
        if PROMO_CLASS_PATTERNS.search(value):
            return True
    return False


def _clean_text(text: str) -> str:
    """Strip excess whitespace and very short strings."""
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned if len(cleaned) > 15 else ""


def _extract_promos_from_soup(soup: BeautifulSoup) -> tuple[list[str], str]:
    """
    Scans the parsed HTML for promo sections.
    Returns (list_of_promo_texts, raw_html_of_best_section).
    """
    promos: list[str] = []
    best_html = ""

    # ── Strategy 1: Tags with promo-matching class/id/aria ──────────────────
    candidate_tags = ["section", "div", "article", "aside", "header",
                      "footer", "nav", "ul", "span", "p", "a", "h1",
                      "h2", "h3", "marquee", "banner"]

    for tag in soup.find_all(candidate_tags):
        if _is_promo_element(tag):
            text = _clean_text(tag.get_text(separator=" "))
            if text:
                promos.append(text)
                if not best_html:
                    best_html = str(tag)[:2000]   # cap raw HTML size

    # ── Strategy 2: Keyword scan inside heading + anchor text ────────────────
    if not promos:
        for tag in soup.find_all(["h1", "h2", "h3", "h4", "a", "strong", "b", "em"]):
            text = tag.get_text(separator=" ").strip().lower()
            if any(kw in text for kw in PROMO_KEYWORDS):
                clean = _clean_text(tag.get_text(separator=" "))
                if clean:
                    promos.append(clean)

    # ── Strategy 3: <meta> tags (og:description / twitter:description) ───────
    if not promos:
        for meta in soup.find_all("meta"):
            name = meta.get("name", "") or meta.get("property", "")
            if name.lower() in ("og:description", "twitter:description", "description"):
                content = _clean_text(meta.get("content", ""))
                if content and any(kw in content.lower() for kw in PROMO_KEYWORDS):
                    promos.append(content)

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_promos: list[str] = []
    for p in promos:
        key = p[:80]    # compare first 80 chars to avoid near-duplicates
        if key not in seen:
            seen.add(key)
            unique_promos.append(p)

    return unique_promos[:10], best_html   # return top 10


# ---------------------------------------------------------------------------
# Public async entry-point
# ---------------------------------------------------------------------------
async def scrape_promotions(
    url: str,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
    wait_for_selector: Optional[str] = None,
) -> PromoResult:
    """
    Loads `url` using httpx, extracting promo/offer content.
    (Optimized for Render Free Tier: uses httpx instead of Playwright).

    Args:
        url:                The business URL to scrape
        timeout_ms:         Max ms to wait for page load (default 20s)
        wait_for_selector:  Ignored in httpx version.
    """
    # Validate URL
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return PromoResult(url=url, success=False, error="Invalid URL")

    # Add default scheme if missing
    if not url.startswith("http"):
        url = "https://" + url

    logger.info(f"[scraper] Starting scrape for: {url}")

    try:
        async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=timeout_ms / 1000.0) as client:
            response = await client.get(url, headers={"User-Agent": USER_AGENT})
            response.raise_for_status()
            html_content = response.text
    except Exception as exc:
        logger.error(f"[scraper] Failed to load {url}: {exc}")
        return PromoResult(url=url, success=False, error=str(exc))

    # --- Parse with BeautifulSoup -----------------------------------------------
    soup = BeautifulSoup(html_content, "lxml" if "lxml" in str(BeautifulSoup) else "html.parser")

    try:
        page_title = soup.title.string if soup.title else ""
    except Exception:
        page_title = ""

    # Remove noise: scripts, styles, hidden fields
    for tag in soup.find_all(["script", "style", "noscript", "iframe", "input"]):
        tag.decompose()

    promos, best_html = _extract_promos_from_soup(soup)

    # Extract meta description
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag:
        meta_desc = _clean_text(meta_tag.get("content", ""))

    logger.info(f"[scraper] Done. Found {len(promos)} promo(s) on {url}")

    return PromoResult(
        url=url,
        success=True,
        page_title=page_title,
        promos=promos,
        raw_html_snippet=best_html,
        meta_description=meta_desc,
    )


# ---------------------------------------------------------------------------
# Batch scraping helper
# ---------------------------------------------------------------------------
async def scrape_multiple(
    urls: list[str],
    concurrency: int = 3,
) -> list[PromoResult]:
    """
    Scrapes multiple URLs with a semaphore to limit concurrent requests.
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def bounded_scrape(url: str) -> PromoResult:
        async with semaphore:
            return await scrape_promotions(url)

    results = await asyncio.gather(
        *[bounded_scrape(url) for url in urls],
        return_exceptions=False,
    )
    return list(results)


# ---------------------------------------------------------------------------
# CLI quick-test  (python -m app.utils.scraper https://example.com)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    async def _main():
        target = sys.argv[1] if len(sys.argv) > 1 else "https://example.com"
        result = await scrape_promotions(target)
        print(f"\n{'='*60}")
        print(f"URL   : {result.url}")
        print(f"Title : {result.page_title}")
        print(f"Promos found: {len(result.promos)}")
        for i, p in enumerate(result.promos, 1):
            print(f"  [{i}] {p[:200]}")
        if result.error:
            print(f"Error : {result.error}")

    asyncio.run(_main())
