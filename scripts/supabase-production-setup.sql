-- =============================================================================
-- PharmaCademy — Supabase Production Schema & RLS
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
-- =============================================================================

-- 1. CREATE USERS TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Firebase UID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. USERS POLICIES
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users FOR UPDATE TO anon, authenticated USING (true);

-- 4. COURSES POLICIES
DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses FOR SELECT TO anon, authenticated USING (true);

-- 5. SUBJECTS POLICIES
DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT TO anon, authenticated USING (true);

-- 6. RESOURCES POLICIES
DROP POLICY IF EXISTS "resources_select" ON public.resources;
CREATE POLICY "resources_select" ON public.resources FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "resources_insert" ON public.resources;
CREATE POLICY "resources_insert" ON public.resources FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "resources_delete" ON public.resources;
CREATE POLICY "resources_delete" ON public.resources FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "resources_update" ON public.resources;
CREATE POLICY "resources_update" ON public.resources FOR UPDATE TO anon, authenticated USING (true);

-- 7. ENSURE RESOURCES HAS is_deleted COLUMN
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resources' AND column_name='is_deleted') THEN
        ALTER TABLE public.resources ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;
END $$;
