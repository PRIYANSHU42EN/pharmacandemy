-- Migration: Add PPT Marketplace and Urgent Work System
-- Created: 2026-05-08

-- PPT Marketplace Table
CREATE TABLE IF NOT EXISTS ppt_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    semester INTEGER NOT NULL,
    description TEXT,
    price INTEGER NOT NULL DEFAULT 0, -- in paise
    tags TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    preview_images TEXT[] DEFAULT '{}',
    sample_file_url TEXT,
    full_file_url TEXT NOT NULL,
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    is_free BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PPT Purchases Table
CREATE TABLE IF NOT EXISTS ppt_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    ppt_id UUID REFERENCES ppt_marketplace(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Urgent Work Tickets Table
CREATE TABLE IF NOT EXISTS urgent_work_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    subject TEXT NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    requirements JSONB DEFAULT '{}',
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'emergency')),
    budget_expectation INTEGER,
    proposed_price INTEGER,
    status TEXT CHECK (status IN ('pending', 'quoted', 'paid', 'in_progress', 'delivered', 'completed', 'cancelled')) DEFAULT 'pending',
    admin_notes TEXT,
    ai_summary TEXT,
    complexity_score INTEGER,
    urgency_score INTEGER,
    payment_id TEXT,
    delivery_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Urgent Work Messages Table
CREATE TABLE IF NOT EXISTS urgent_work_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES urgent_work_tickets(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- NULL for AI
    message TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ppt_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppt_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgent_work_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgent_work_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Simplified for now, can be refined)
CREATE POLICY "Public can view active PPTs" ON ppt_marketplace FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own purchases" ON ppt_purchases FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own tickets" ON urgent_work_tickets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own messages" ON urgent_work_messages FOR SELECT USING (EXISTS (
    SELECT 1 FROM urgent_work_tickets WHERE id = ticket_id AND user_id = auth.uid()::text
));

-- Admin Policies
CREATE POLICY "Admins have full access to marketplace" ON ppt_marketplace FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin'))
);
CREATE POLICY "Admins have full access to tickets" ON urgent_work_tickets FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin'))
);
CREATE POLICY "Admins have full access to messages" ON urgent_work_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'super-admin'))
);
