import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ users: [] });
    }

    // Search in primary Supabase users table with safe escaping
    const safeQuery = query.replace(/[%,]/g, ''); // Basic sanitization for Supabase .or()
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, username, display_name, photo_url")
      .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
      .limit(10);

    if (error) {
      console.error("[User Search] Error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("[User Search API Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
