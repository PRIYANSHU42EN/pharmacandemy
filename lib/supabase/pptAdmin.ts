import { createClient } from "@supabase/supabase-js";

// Dedicated PPT Admin Client (Service Role)
// Fallback to default if ppt-specific vars are not set
const supabaseUrl = (process.env.NEXT_PUBLIC_PPT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const supabaseServiceKey = (process.env.PPT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;

export const pptSupabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
