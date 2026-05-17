-- CubePharma 3-Pillar Architecture Expansion

-- 1. Creator Profiles (For Marketplace)
CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    total_sales INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0, -- in paise
    rating DECIMAL(3,2) DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PPT Previews (For Marketplace)
CREATE TABLE IF NOT EXISTS public.ppt_previews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ppt_id UUID REFERENCES public.ppt_marketplace(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    is_watermarked BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AI Provider Logs (For Router Monitoring)
CREATE TABLE IF NOT EXISTS public.ai_provider_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- openai, anthropic, gemini, nvidia
    model TEXT NOT NULL,
    latency_ms INTEGER,
    status TEXT NOT NULL, -- success, failure
    error_message TEXT,
    context TEXT, -- study, negotiator
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- page_view, resource_access, purchase, ticket_created
    category TEXT NOT NULL, -- study, marketplace, urgent_work
    user_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Update Marketplace Table
ALTER TABLE public.ppt_marketplace ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.creator_profiles(id);
ALTER TABLE public.ppt_marketplace ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- 6. Enable Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE creator_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_provider_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;
