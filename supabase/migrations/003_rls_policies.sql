-- Migration 003: Row Level Security Policies
-- =============================================================================
-- These policies ensure users can ONLY see and modify their own data.
-- The FastAPI backend uses the service_role key which bypasses RLS —
-- RLS here protects direct Supabase client calls from the frontend.

-- -------------------------
-- competitors table policies
-- -------------------------

CREATE POLICY "Users can view their own competitors"
    ON public.competitors
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own competitors"
    ON public.competitors
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own competitors"
    ON public.competitors
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own competitors"
    ON public.competitors
    FOR DELETE
    USING (auth.uid() = user_id);

-- -------------------------
-- profit_entries table policies
-- -------------------------

CREATE POLICY "Users can view their own profit entries"
    ON public.profit_entries
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profit entries"
    ON public.profit_entries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profit entries"
    ON public.profit_entries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profit entries"
    ON public.profit_entries
    FOR DELETE
    USING (auth.uid() = user_id);
