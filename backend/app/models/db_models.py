"""
SQLAlchemy ORM models — Spade & Scale
======================================
Tables:
  - user_businesses   : Stores the SME owner's business profile
  - competitors       : Tracked competitors per business
  - daily_insights    : AI/scraper-generated daily intelligence snapshots

All tables use UUID primary keys and reference auth.users(id) from Supabase.
Timestamps are handled in UTC automatically.
"""
import uuid
from datetime import datetime, date, timezone

from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
    Float,
    Boolean,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


def _now() -> datetime:
    """UTC-aware current timestamp."""
    return datetime.now(timezone.utc)


# =============================================================================
# 1. UserBusiness — the SME owner's own business profile
# =============================================================================
class UserBusiness(Base):
    __tablename__ = "user_businesses"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    # Link to the Supabase Auth user
    user_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="References auth.users(id) — enforced via Supabase RLS",
    )

    # Core business details
    name            = Column(String(255), nullable=False,        comment="Business / brand name")
    niche           = Column(String(255), nullable=True,         comment="Industry or niche (e.g. 'D2C skincare')")
    location        = Column(String(255), nullable=True,         comment="City, country, or 'online'")
    target_profit   = Column(Numeric(14, 2), nullable=True,      comment="Monthly profit target in local currency")

    # Optional extra context
    website_url     = Column(String(512), nullable=True)
    description     = Column(Text, nullable=True)
    is_active       = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at  = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    # Relationships
    competitors     = relationship("Competitor",    back_populates="business", cascade="all, delete-orphan")
    daily_insights  = relationship("DailyInsight",  back_populates="business", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<UserBusiness id={self.id} name={self.name!r}>"


# =============================================================================
# 2. Competitor — a competitor tracked by a UserBusiness
# =============================================================================
class Competitor(Base):
    __tablename__ = "competitors_orm"  # distinct from the Supabase-native 'competitors' table

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # FK to the business that owns this competitor record
    business_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core competitor fields
    name                = Column(String(255), nullable=False,   comment="Competitor business name")
    website_url         = Column(String(512), nullable=True,    comment="Main website URL")
    social_link         = Column(String(512), nullable=True,    comment="Primary social media profile URL")
    current_discount    = Column(String(255), nullable=True,    comment="Latest detected discount/promo (e.g. '20% off sitewide')")
    strategy_summary    = Column(Text,        nullable=True,    comment="AI/scraper-generated summary of their marketing strategy")

    # Extra scraped metadata
    last_scraped_at     = Column(DateTime(timezone=True), nullable=True, comment="Last time scraper ran on this competitor")
    rating              = Column(Float, nullable=True,          comment="Public rating (0-5) if available")
    category            = Column(String(255), nullable=True)
    region              = Column(String(255), nullable=True)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at  = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    # Relationships
    business        = relationship("UserBusiness",  back_populates="competitors")
    daily_insights  = relationship("DailyInsight",  back_populates="competitor", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Competitor id={self.id} name={self.name!r}>"


# =============================================================================
# 3. DailyInsight — a daily intelligence snapshot for a business/competitor
# =============================================================================
class DailyInsight(Base):
    __tablename__ = "daily_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # FK — which business this insight belongs to (required)
    business_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # FK — which competitor this insight is about (optional — can be a general insight)
    competitor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("competitors_orm.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Date of the insight (one per day per competitor/business)
    insight_date    = Column(Date, nullable=False, default=date.today, index=True)

    # Insight payload
    insight_type    = Column(
        SAEnum("promo_detected", "strategy_change", "new_discount",
               "sentiment_shift", "general", name="insight_type_enum"),
        nullable=False,
        default="general",
        comment="Category of this insight",
    )
    title           = Column(String(512), nullable=False,   comment="Short headline for the insight")
    summary         = Column(Text, nullable=True,           comment="Full detail / AI summary")
    raw_data        = Column(Text, nullable=True,           comment="Raw scraped content that triggered this insight")
    source_url      = Column(String(512), nullable=True,    comment="URL the insight was scraped from")
    confidence      = Column(Float, nullable=True,          comment="0.0-1.0 confidence score (if ML-generated)")
    is_read         = Column(Boolean, default=False, nullable=False)
    is_actionable   = Column(Boolean, default=False, nullable=False, comment="Flagged as requiring user action")

    # Timestamps
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

    # Relationships
    business    = relationship("UserBusiness", back_populates="daily_insights")
    competitor  = relationship("Competitor",   back_populates="daily_insights")

    def __repr__(self) -> str:
        return f"<DailyInsight id={self.id} date={self.insight_date} type={self.insight_type}>"
