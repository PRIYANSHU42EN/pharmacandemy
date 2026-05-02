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
        .gt("created_at", oneDayAgo),
      // 8. Recent Events (Last 50)
      supabaseAdmin.from("analytics_events")
        .select(`
          id,
          event_type,
          resource_id,
          created_at,
          metadata,
          users:user_id (name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50),
      // 9. Views Today
      supabaseAdmin.from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "view")
        .gt("created_at", oneDayAgo),
      // 10. Active Today (Unique users in last 24h)
      supabaseAdmin.from("analytics_events")
        .select("user_id")
        .gt("created_at", oneDayAgo)
    ];

    const results = await Promise.all(statsPromises);
    
    // Extract counts safely
    const totalUsers = results[0].count || 0;
    const premiumUsers = results[1].count || 0;
    const totalCourses = results[2].count || 0;
    const totalResources = results[3].count || 0;
    const paymentCount = results[4].count || 0;
    
    // Unique counts
    const activeNowRaw = results[5].data || [];
    const uniqueActiveNow = new Set(activeNowRaw.map(e => e.user_id)).size;
    
    const loginsRaw = results[6].data || [];
    const uniqueLogins = new Set(loginsRaw.map(e => e.user_id)).size;

    const events = (results[7].data || []).map((e: any) => ({
      ...e,
      userName: e.users?.name || e.users?.email?.split('@')[0] || "Guest",
      userEmail: e.users?.email || null
    }));

    const viewsToday = results[8].count || 0;

    const activeTodayRaw = results[9].data || [];
    const uniqueActiveToday = new Set(activeTodayRaw.map(e => e.user_id)).size;

    return NextResponse.json({
      totalUsers,
      premiumUsers,
      totalCourses,
      totalResources,
      paymentCount,
      loginsToday: uniqueLogins || 0,
      activeNow: Math.max(uniqueActiveNow, 1),
      activeToday: uniqueActiveToday || 0,
      viewsToday,
      events
    });
  } catch (error: any) {
    console.error("[Admin Stats API] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
