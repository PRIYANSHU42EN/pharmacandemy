-- Migration: Hardening Row Level Security and Policies
-- Created: 2026-05-18

-- =========================================================================
-- 1. Enable Row Level Security (RLS) on all remaining tables
-- =========================================================================
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ppt_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- Note: RLS is already enabled on ppt_marketplace, ppt_purchases, 
-- urgent_work_tickets, urgent_work_messages. We ensure it's on for completeness:
ALTER TABLE IF EXISTS public.ppt_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ppt_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.urgent_work_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.urgent_work_messages ENABLE ROW LEVEL SECURITY;


-- =========================================================================
-- 2. Drop existing policies to avoid conflict
-- =========================================================================
DROP POLICY IF EXISTS "Public can view active PPTs" ON public.ppt_marketplace;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.ppt_purchases;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.urgent_work_tickets;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.urgent_work_messages;
DROP POLICY IF EXISTS "Admins have full access to marketplace" ON public.ppt_marketplace;
DROP POLICY IF EXISTS "Admins have full access to tickets" ON public.urgent_work_tickets;
DROP POLICY IF EXISTS "Admins have full access to messages" ON public.urgent_work_messages;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile fields" ON public.users;
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.ppt_categories;
DROP POLICY IF EXISTS "Only admins can manage categories" ON public.ppt_categories;
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON public.creator_profiles;
DROP POLICY IF EXISTS "Users can create their own creator profile" ON public.creator_profiles;
DROP POLICY IF EXISTS "Creators can update their own profile" ON public.creator_profiles;
DROP POLICY IF EXISTS "Admins have full access to creator profiles" ON public.creator_profiles;
DROP POLICY IF EXISTS "Anyone can view approved and active marketplace items" ON public.ppt_marketplace;
DROP POLICY IF EXISTS "Creators can view their own marketplace items" ON public.ppt_marketplace;
DROP POLICY IF EXISTS "Creators can insert their own marketplace items" ON public.ppt_marketplace;
DROP POLICY IF EXISTS "Creators can update their own marketplace items" ON public.ppt_marketplace;
DROP POLICY IF EXISTS "Admins have full access to marketplace items" ON public.ppt_marketplace;
DROP POLICY IF EXISTS "Users can select their own purchases" ON public.ppt_purchases;
DROP POLICY IF EXISTS "Users can record a purchase" ON public.ppt_purchases;
DROP POLICY IF EXISTS "Admins have full access to purchases" ON public.ppt_purchases;
DROP POLICY IF EXISTS "Users can select their own tickets" ON public.urgent_work_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.urgent_work_tickets;
DROP POLICY IF EXISTS "Users can update their own pending tickets" ON public.urgent_work_tickets;
DROP POLICY IF EXISTS "Users can read messages for their own tickets" ON public.urgent_work_messages;
DROP POLICY IF EXISTS "Users can post messages on their own tickets" ON public.urgent_work_messages;
DROP POLICY IF EXISTS "Admins have full access to ticket messages" ON public.urgent_work_messages;


-- =========================================================================
-- 3. Users Table Policies
-- =========================================================================
CREATE POLICY "Users can read their own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile fields" ON public.users
    FOR UPDATE USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Admins have full access to users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin')
        )
    );


-- =========================================================================
-- 4. PPT Categories Table Policies
-- =========================================================================
CREATE POLICY "Anyone can view categories" ON public.ppt_categories
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories" ON public.ppt_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin', 'content-admin')
        )
    );


-- =========================================================================
-- 5. Creator Profiles Table Policies
-- =========================================================================
CREATE POLICY "Anyone can view creator profiles" ON public.creator_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own creator profile" ON public.creator_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Creators can update their own profile" ON public.creator_profiles
    FOR UPDATE USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins have full access to creator profiles" ON public.creator_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin')
        )
    );


-- =========================================================================
-- 6. PPT Marketplace Table Policies
-- =========================================================================
CREATE POLICY "Anyone can view approved and active marketplace items" ON public.ppt_marketplace
    FOR SELECT USING (is_active = true AND moderation_status = 'approved');

CREATE POLICY "Creators can view their own marketplace items" ON public.ppt_marketplace
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creator_profiles 
            WHERE id = ppt_marketplace.creator_id AND user_id = auth.uid()::text
        )
    );

CREATE POLICY "Creators can insert their own marketplace items" ON public.ppt_marketplace
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.creator_profiles 
            WHERE id = ppt_marketplace.creator_id AND user_id = auth.uid()::text
        )
    );

CREATE POLICY "Creators can update their own marketplace items" ON public.ppt_marketplace
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.creator_profiles 
            WHERE id = ppt_marketplace.creator_id AND user_id = auth.uid()::text
        )
    );

CREATE POLICY "Admins have full access to marketplace items" ON public.ppt_marketplace
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin', 'content-admin')
        )
    );


-- =========================================================================
-- 7. PPT Purchases Table Policies
-- =========================================================================
CREATE POLICY "Users can select their own purchases" ON public.ppt_purchases
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can record a purchase" ON public.ppt_purchases
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins have full access to purchases" ON public.ppt_purchases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin')
        )
    );


-- =========================================================================
-- 8. Urgent Work Tickets Table Policies
-- =========================================================================
CREATE POLICY "Users can select their own tickets" ON public.urgent_work_tickets
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create tickets" ON public.urgent_work_tickets
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own pending tickets" ON public.urgent_work_tickets
    FOR UPDATE USING (auth.uid()::text = user_id AND status = 'pending')
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins have full access to tickets" ON public.urgent_work_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin')
        )
    );


-- =========================================================================
-- 9. Urgent Work Messages Table Policies
-- =========================================================================
CREATE POLICY "Users can read messages for their own tickets" ON public.urgent_work_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.urgent_work_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can post messages on their own tickets" ON public.urgent_work_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.urgent_work_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()::text
        )
    );

CREATE POLICY "Admins have full access to ticket messages" ON public.urgent_work_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin')
        )
    );
