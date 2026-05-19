import { createClient } from '@supabase/supabase-js';

// Dedicated PPT Database Client
// Fallback to default if ppt-specific vars are not set
const supabaseUrl = process.env.NEXT_PUBLIC_PPT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_PPT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const pptSupabase = createClient(supabaseUrl, supabaseAnonKey);
