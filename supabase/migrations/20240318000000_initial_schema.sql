-- Create profiles table safely
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  niche TEXT,
  location TEXT,
  target_profit NUMERIC,
  base_costs NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create competitors table safely
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  social_media_handle TEXT,
  last_scraped_strategy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for competitors
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies for competitors
DROP POLICY IF EXISTS "Users can view their own competitors." ON public.competitors;
CREATE POLICY "Users can view their own competitors." ON public.competitors FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own competitors." ON public.competitors;
CREATE POLICY "Users can insert their own competitors." ON public.competitors FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own competitors." ON public.competitors;
CREATE POLICY "Users can update their own competitors." ON public.competitors FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own competitors." ON public.competitors;
CREATE POLICY "Users can delete their own competitors." ON public.competitors FOR DELETE USING (auth.uid() = user_id);

-- Create analysis_logs table safely
CREATE TABLE IF NOT EXISTS public.analysis_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_suggestion TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for analysis_logs
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies for analysis_logs
DROP POLICY IF EXISTS "Users can view their own analysis logs." ON public.analysis_logs;
CREATE POLICY "Users can view their own analysis logs." ON public.analysis_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analysis logs." ON public.analysis_logs;
CREATE POLICY "Users can insert their own analysis logs." ON public.analysis_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own analysis logs." ON public.analysis_logs;
CREATE POLICY "Users can delete their own analysis logs." ON public.analysis_logs FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user registration and automatically create a profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
