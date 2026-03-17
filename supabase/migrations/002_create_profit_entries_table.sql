-- Migration 002: Create profit_entries table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profit_entries (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_type  TEXT NOT NULL CHECK (entry_type IN ('revenue', 'expense')),
    category    TEXT NOT NULL,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    entry_date  DATE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profit_entries_user_id    ON public.profit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_entries_entry_date ON public.profit_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_profit_entries_type       ON public.profit_entries(entry_type);

-- Enable Row Level Security
ALTER TABLE public.profit_entries ENABLE ROW LEVEL SECURITY;
