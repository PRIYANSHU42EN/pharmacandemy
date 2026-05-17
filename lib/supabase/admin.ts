import { createClient } from "@supabase/supabase-js";

// This client uses the SERVICE_ROLE_KEY to bypass RLS.
// Use ONLY on the server.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
