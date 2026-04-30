import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateCache } from "@/lib/redis";
import { verifyFirebaseToken, checkAdminRole } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    let query = supabaseAdmin.from("resources").select("*").eq("is_deleted", false);
    
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, type, url, subject_id, course_id, is_premium, preview_image_url, tags, year } = body;

    const { data, error } = await supabaseAdmin!
      .from("resources")
      .insert([{
        title,
        description,
        type,
        url,
        subject_id,
        course_id,
        is_premium: is_premium || false,
        preview_image_url,
        tags: tags || [],
        year,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Invalidate Cache
    try {
      if (subject_id) {
        await invalidateCache(`resources:list:${subject_id}`);
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

export async function PATCH(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    const { data, error } = await supabaseAdmin!
      .from("resources")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Invalidate Cache
    try {
      if (data.subject_id) {
        await invalidateCache(`resources:list:${data.subject_id}`);
      }
    } catch (err) {
      console.warn("[Admin API] Cache invalidation failed:", err);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Fetch subject_id before soft-delete so we can invalidate
    const { data: existing } = await supabaseAdmin!
      .from("resources")
      .select("subject_id")
      .eq("id", id)
      .single();

    // Soft delete
    const { error } = await supabaseAdmin!
      .from("resources")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    // Invalidate Cache
    try {
      if (existing?.subject_id) {
        await invalidateCache(`resources:list:${existing.subject_id}`);
      }
    } catch (err) {
      console.warn("[Admin API] Cache invalidation failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
