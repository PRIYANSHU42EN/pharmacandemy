-- =============================================================================
-- PharmaCademy — Secure Admin Role System & RLS
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tqszrvonunmsvhmzrepx/sql
-- =============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 2. USERS TABLE POLICIES
-- Users can see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT USING (auth.uid()::text = id);

-- Admins can see all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Users can update their own profile (e.g. name)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid()::text = id);

-- 3. CONTENT TABLES (Courses, Subjects, Resources)
-- Public read access for everyone
DROP POLICY IF EXISTS "Public read access" ON public.courses;
CREATE POLICY "Public read access" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON public.subjects;
CREATE POLICY "Public read access" ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON public.resources;
CREATE POLICY "Public read access" ON public.resources FOR SELECT USING (true);

-- Admin-only write access (INSERT, UPDATE, DELETE)
-- Courses
DROP POLICY IF EXISTS "Admin write access" ON public.courses;
CREATE POLICY "Admin write access" ON public.courses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Subjects
DROP POLICY IF EXISTS "Admin write access" ON public.subjects;
CREATE POLICY "Admin write access" ON public.subjects
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Resources
DROP POLICY IF EXISTS "Admin write access" ON public.resources;
CREATE POLICY "Admin write access" ON public.resources
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);
