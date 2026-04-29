import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error: Database client missing" }, { status: 500 });
    }

    // Check if user is admin in Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", uid)
      .single();

    if (userError || (user.role !== "admin" && user.role !== "super-admin")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { table, payload } = body;

    if (!["resources", "subjects", "courses"].includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Invalidate Cache
    try {
      const { invalidateCache } = await import("@/lib/redis");
      if (table === "courses") {
        await invalidateCache("courses:active");
      } else if (table === "subjects") {
        // Invalidate all subjects for now, or more specifically if we had the semesterId
        await invalidateCache("courses:active"); // Courses often show subject counts
      }
    } catch (err) {
      console.warn("[Admin API] Cache invalidation failed:", err);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Admin API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Admin check
    const { data: user } = await supabaseAdmin.from("users").select("role").eq("id", uid).single();
    if (user?.role !== "admin" && user?.role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const table = searchParams.get("table") || "resources";

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (table === "resources") {
      // Soft delete
      const { error } = await supabaseAdmin
        .from("resources")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    } else {
      // Hard delete for others? Or soft delete if they have is_deleted
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("id", id);
      if (error) throw error;
    }

    // Invalidate Cache
    try {
      const { invalidateCache } = await import("@/lib/redis");
      if (table === "courses") {
        await invalidateCache("courses:active");
      }
      // For subjects/resources, we'd need more info to invalidate specifically,
      // but invalidating the general list is a safe fallback.
    } catch (err) {
      console.warn("[Admin API] Cache invalidation failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
