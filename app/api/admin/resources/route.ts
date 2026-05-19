import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateCache } from "@/lib/redis";
import { withAdmin } from "@/lib/api-middleware";

export const GET = withAdmin(async (req: NextRequest) => {
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { title, description, type, url, subject_id, course_id, preview_image_url, tags, year } = body;

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    const { data, error } = await supabaseAdmin
      .from("resources")
      .insert([{
        title,
        description,
        type,
        url,
        subject_id,
        course_id,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PATCH = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    const { data, error } = await supabaseAdmin
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    // 1. Fetch item by id (to get URL and subject_id)
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("resources")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // 2. If file -> delete from storage (Supabase)
    const url = existing.url;
    if (url) {
      try {
        let bucket = "pdfs";
        let path = url;

        if (url.includes("supabase.co/storage/v1/object/")) {
          const urlParts = url.split("/storage/v1/object/");
          if (urlParts.length >= 2) {
            const pathParts = urlParts[1].split("/");
            // Remove 'public' or 'authenticated' prefix
            pathParts.shift();
            bucket = pathParts.shift() || "pdfs";
            path = pathParts.join("/");
          }
        } else if (url.startsWith("http")) {
          // External URL (Drive, etc.), don't delete from our storage
          bucket = ""; 
        } else {
          // It's a relative path (e.g. 123-file.pdf)
          bucket = "pdfs";
          path = url;
        }

        if (bucket && path) {
          console.log(`[Admin API] Deleting from storage: bucket=${bucket}, path=${path}`);
          await supabaseAdmin.storage.from(bucket).remove([path]);
        }
      } catch (storageErr) {
        console.warn("[Admin API] Storage deletion failed (continuing):", storageErr);
      }
    }

    // 3. Delete from DB (Hard delete)
    const { error: deleteError } = await supabaseAdmin
      .from("resources")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // 4. Invalidate Cache
    try {
      if (existing.subject_id) {
        await invalidateCache(`resources:list:${existing.subject_id}`);
      }
    } catch (err) {
      console.warn("[Admin API] Cache invalidation failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

