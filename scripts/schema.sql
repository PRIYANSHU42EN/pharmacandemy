-- =============================================================================
-- PharmaCademy — Consolidated Production Schema
-- Use this to initialize or update your Supabase database.
-- =============================================================================

-- 1. USERS TABLE
-- Stores user profiles mirrored from Firebase
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Firebase UID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    is_premium BOOLEAN DEFAULT false,
    premium_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id),
    name TEXT NOT NULL,
    semester_number INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. RESOURCES TABLE
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES public.subjects(id),
    course_id UUID REFERENCES public.courses(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'pdf', 'video', etc.
    url TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ANALYTICS_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT, -- Firebase UID
    event_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. STORAGE BUCKETS (Note: Run these via Supabase Dashboard or API)
-- Bucket ID: resources
-- Public: true

-- 7. ENABLE RLS (Bypassed by supabaseAdmin, but good for defense-in-depth)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 8. DEFAULT POLICIES (Read-only for public content)
CREATE POLICY "Public read access" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.resources FOR SELECT USING (is_deleted = false);
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (true); -- Filtered by API
