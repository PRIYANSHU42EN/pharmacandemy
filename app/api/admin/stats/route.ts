import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error: Admin client missing" }, { status: 500 });
    }

    // Admin check in Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", uid)
      .single();

    if (userError || (user.role !== "admin" && user.role !== "super-admin")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 1. Total Users
    const { count: totalUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });

    // 2. Premium Users
    const { count: premiumUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_premium", true);

    // 3. Total Courses
    const { count: totalCourses } = await supabaseAdmin
      .from("courses")
      .select("*", { count: "exact", head: true });

    // 4. Total Resources
    const { count: totalResources } = await supabaseAdmin
      .from("resources")
      .select("*", { count: "exact", head: true });

    // 5. Logins Today (Last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: loginsToday } = await supabaseAdmin
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "login")
      .gt("created_at", oneDayAgo);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      totalCourses: totalCourses || 0,
      totalResources: totalResources || 0,
      loginsToday: loginsToday || 0,
      activeNow: loginsToday || 0, // Fallback active count
    });
  } catch (error: any) {
    console.error("[Admin Stats API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
