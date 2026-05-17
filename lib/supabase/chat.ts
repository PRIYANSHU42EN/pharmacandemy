import { createClient } from '@supabase/supabase-js';

// Dedicated Chat Database Client
// Fallback to default if chat-specific vars are not set
const supabaseUrl = process.env.NEXT_PUBLIC_CHAT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_CHAT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const chatSupabase = createClient(supabaseUrl, supabaseAnonKey);
