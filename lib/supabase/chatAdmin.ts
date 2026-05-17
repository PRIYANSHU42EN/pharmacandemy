import { createClient } from "@supabase/supabase-js";

// Dedicated Chat Admin Client (Service Role)
// Fallback to default if chat-specific vars are not set
const supabaseUrl = (process.env.NEXT_PUBLIC_CHAT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const supabaseServiceKey = (process.env.CHAT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;

export const chatSupabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
