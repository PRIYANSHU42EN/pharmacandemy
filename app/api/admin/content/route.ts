import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyFirebaseToken, checkAdminRole } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error: Database client missing" }, { status: 500 });
    }

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) {
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
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) {
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
export async function GET(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table");

    if (!table || !["resources", "subjects", "courses", "users"].includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    let query = supabaseAdmin.from(table).select("*");
    
    if (table === "resources") {
      query = query.eq("is_deleted", false).order("created_at", { ascending: false });
    } else if (table === "users") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("name", { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
