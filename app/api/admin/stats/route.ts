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

    // --- PARALLEL EXECUTION OF STATS ---
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const statsPromises = [
      // 1. Total Users
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
      // 2. Premium Users
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("is_premium", true),
      // 3. Total Courses
      supabaseAdmin.from("courses").select("*", { count: "exact", head: true }),
      // 4. Total Resources
      supabaseAdmin.from("resources").select("*", { count: "exact", head: true }),
      // 5. Total Payments
      supabaseAdmin.from("payments").select("*", { count: "exact", head: true }),
      // 6. Active Now (Unique users in last 15 mins)
      supabaseAdmin.from("analytics_events")
        .select("user_id", { count: "exact", head: false })
        .gt("created_at", fifteenMinutesAgo),
      // 7. Logins Today (Unique users in last 24h)
      supabaseAdmin.from("analytics_events")
        .select("user_id", { count: "exact", head: false })
        .eq("event_type", "login")
        .gt("created_at", oneDayAgo)
    ];

    const results = await Promise.all(statsPromises);
    
    // Extract counts safely
    const totalUsers = results[0].count || 0;
    const premiumUsers = results[1].count || 0;
    const totalCourses = results[2].count || 0;
    const totalResources = results[3].count || 0;
    const paymentCount = results[4].count || 0;
    
    // For Active Now/Logins, we need unique user_id count if possible, 
    // but head: true doesn't support distinct easily in standard count.
    // However, for small/medium load, we can just use the row count or a raw query.
    // Let's refine the unique count logic:
    const activeRaw = results[5].data || [];
    const uniqueActive = new Set(activeRaw.map(e => e.user_id)).size;
    
    const loginsRaw = results[6].data || [];
    const uniqueLogins = new Set(loginsRaw.map(e => e.user_id)).size;

    return NextResponse.json({
      totalUsers,
      premiumUsers,
      totalCourses,
      totalResources,
      paymentCount,
      loginsToday: uniqueLogins || 0,
      activeNow: Math.max(uniqueActive, 1), // At least 1 (the admin viewing)
    });
  } catch (error: any) {
    console.error("[Admin Stats API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
