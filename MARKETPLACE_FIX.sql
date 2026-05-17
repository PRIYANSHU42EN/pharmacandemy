-- ==========================================
-- CubePharma Marketplace Fix & Seed
-- ==========================================

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.ppt_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Creator Profiles (if missing)
CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    total_sales INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fix Marketplace Table Schema
-- Ensure required columns exist
DO $$ 
BEGIN 
    -- category_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppt_marketplace' AND column_name='category_id') THEN
        ALTER TABLE public.ppt_marketplace ADD COLUMN category_id UUID REFERENCES public.ppt_categories(id);
    END IF;

    -- topic
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppt_marketplace' AND column_name='topic') THEN
        ALTER TABLE public.ppt_marketplace ADD COLUMN topic TEXT;
    END IF;

    -- creator_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppt_marketplace' AND column_name='creator_id') THEN
        ALTER TABLE public.ppt_marketplace ADD COLUMN creator_id UUID REFERENCES public.creator_profiles(id);
    END IF;

    -- tags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppt_marketplace' AND column_name='tags') THEN
        ALTER TABLE public.ppt_marketplace ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- moderation_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppt_marketplace' AND column_name='moderation_status') THEN
        ALTER TABLE public.ppt_marketplace ADD COLUMN moderation_status TEXT DEFAULT 'pending';
    END IF;

    -- is_featured
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppt_marketplace' AND column_name='is_featured') THEN
        ALTER TABLE public.ppt_marketplace ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 4. Seed Categories
INSERT INTO public.ppt_categories (name, slug, icon)
VALUES 
    ('Pharmaceutics', 'pharmaceutics', 'Package'),
    ('Pharmacology', 'pharmacology', 'Zap'),
    ('Pharmacognosy', 'pharmacognosy', 'Leaf'),
    ('Medicinal Chemistry', 'medicinal-chemistry', 'Beaker'),
    ('Hospital Pharmacy', 'hospital-pharmacy', 'Hospital'),
    ('Clinical Pharmacy', 'clinical-pharmacy', 'Activity'),
    ('Jurisprudence', 'jurisprudence', 'Scale'),
    ('Biochemistry', 'biochemistry', 'Microscope')
ON CONFLICT (slug) DO NOTHING;

-- 5. Enable Realtime for new tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'ppt_categories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ppt_categories;
    END IF;
END $$;

-- 6. Seed Test Assets (Optional, but helpful for testing)
DO $$
DECLARE 
    pharmaceutics_id UUID;
    pharmacology_id UUID;
BEGIN
    SELECT id INTO pharmaceutics_id FROM ppt_categories WHERE slug = 'pharmaceutics';
    SELECT id INTO pharmacology_id FROM ppt_categories WHERE slug = 'pharmacology';

    IF pharmaceutics_id IS NOT NULL THEN
        INSERT INTO public.ppt_marketplace (title, subject, semester, price, description, topic, category_id, thumbnail_url, sample_file_url, full_file_url, tags, moderation_status, is_active)
        VALUES 
            ('Advanced Drug Delivery Systems', 'Pharmaceutics', 7, 49900, 'Comprehensive guide to NDDS including liposomes, nanoparticles, and targeted delivery.', 'NDDS Overview', pharmaceutics_id, 'https://images.unsplash.com/photo-1587854680352-936b22b91030?q=80&w=1000', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '{"ndds", "delivery", "advanced"}', 'approved', true),
            ('Industrial Pharmacy - Tablet Manufacturing', 'Pharmaceutics', 5, 29900, 'Detailed presentation on large scale tablet production and quality control.', 'Tablet Tech', pharmaceutics_id, 'https://images.unsplash.com/photo-1585435557343-3b092031a831?q=80&w=1000', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '{"industrial", "tablets", "manufacturing"}', 'approved', true);
    END IF;

    IF pharmacology_id IS NOT NULL THEN
        INSERT INTO public.ppt_marketplace (title, subject, semester, price, description, topic, category_id, thumbnail_url, sample_file_url, full_file_url, tags, moderation_status, is_active)
        VALUES 
            ('Autonomic Nervous System Pharmacology', 'Pharmacology', 4, 39900, 'Visual guide to Sympathetic and Parasympathetic nervous systems.', 'ANS Deep Dive', pharmacology_id, 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=1000', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '{"ans", "autonomic", "pharmacology"}', 'approved', true);
    END IF;
END $$;
