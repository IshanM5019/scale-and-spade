-- Migration 001: Create competitors table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.competitors (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    website     TEXT,
    category    TEXT,
    region      TEXT,
    rating      NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 5),
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast user_id lookups
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON public.competitors(user_id);

-- Enable Row Level Security
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
