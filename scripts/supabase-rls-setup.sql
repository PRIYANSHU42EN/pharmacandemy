-- =============================================================================
-- PharmaCademy — Supabase RLS (Row Level Security) Policies
-- Run these in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/ibrfcnfreoputaqpzagu/sql
-- =============================================================================

-- IMPORTANT: These policies use the anon key (public access).
-- Since auth is handled by Firebase (not Supabase Auth), we allow
-- anon reads and trust the app-level Firebase auth checks for writes.

-- =============================================================================
-- 1. COURSES TABLE — Public read, no write from client
-- =============================================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select" ON courses;
CREATE POLICY "courses_select"
  ON courses FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- 2. SUBJECTS TABLE — Public read
-- =============================================================================
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subjects_select" ON subjects;
CREATE POLICY "subjects_select"
  ON subjects FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- 3. RESOURCES TABLE — Public read, anon insert/delete (Firebase auth gates it)
-- =============================================================================
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_select" ON resources;
CREATE POLICY "resources_select"
  ON resources FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "resources_insert" ON resources;
CREATE POLICY "resources_insert"
  ON resources FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "resources_delete" ON resources;
CREATE POLICY "resources_delete"
  ON resources FOR DELETE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "resources_update" ON resources;
CREATE POLICY "resources_update"
  ON resources FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- 4. USERS TABLE — Public read, anon insert/update (for Firebase user sync)
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- 5. VERIFY: Check that resources table has is_deleted with a default of false
-- =============================================================================
-- Run this to check:
-- SELECT column_name, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'resources' AND column_name = 'is_deleted';

-- If is_deleted has no default, add one:
-- ALTER TABLE resources ALTER COLUMN is_deleted SET DEFAULT false;
