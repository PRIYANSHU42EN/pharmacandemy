-- SQL Migration for CubePharma Premium Systems
-- Run this in your Supabase SQL Editor

-- 1. PPT Marketplace Table
CREATE TABLE IF NOT EXISTS public.ppt_marketplace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    semester INTEGER,
    price INTEGER NOT NULL, -- in paise
    description TEXT,
    thumbnail_url TEXT,
    preview_images TEXT[],
    sample_file_url TEXT,
    full_file_url TEXT,
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 4.5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PPT Purchases Table
CREATE TABLE IF NOT EXISTS public.ppt_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    ppt_id UUID REFERENCES public.ppt_marketplace(id),
    amount INTEGER NOT NULL,
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Urgent Work Tickets Table
CREATE TABLE IF NOT EXISTS public.urgent_work_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    subject TEXT,
    deadline TEXT,
    requirements JSONB,
    urgency_level TEXT,
    budget_expectation INTEGER,
    complexity_score INTEGER,
    urgency_score INTEGER,
    status TEXT DEFAULT 'pending', -- pending, quoted, paid, completed
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Urgent Work Messages Table
CREATE TABLE IF NOT EXISTS public.urgent_work_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.urgent_work_tickets(id),
    role TEXT NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 5. Update Users Table (Add missing columns)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ppt_marketplace;
ALTER PUBLICATION supabase_realtime ADD TABLE ppt_purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE urgent_work_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE urgent_work_messages;

-- 7. Functions
CREATE OR REPLACE FUNCTION increment_ppt_download(ppt_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE ppt_marketplace
    SET download_count = download_count + 1
    WHERE id = ppt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
