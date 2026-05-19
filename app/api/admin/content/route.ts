import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { withAdmin } from "@/lib/api-middleware";

/**
 * Helper to delete a file from Supabase Storage given its URL
 */
async function deleteStorageFile(url: string) {
  if (!url || !supabaseAdmin) return;
  
  try {
    let bucket: string | undefined;
    let filePath: string | undefined;

    if (url.includes("/storage/v1/object/")) {
      // Handle full legacy URLs
      const isPublic = url.includes("/public/");
      const separator = isPublic ? "/storage/v1/object/public/" : "/storage/v1/object/authenticated/";
      
      const urlParts = url.split(separator);
      if (urlParts.length === 2) {
        const pathParts = urlParts[1].split("/");
        bucket = pathParts.shift();
        filePath = decodeURIComponent(pathParts.join("/"));
      }
    } else if (!url.startsWith("http")) {
      // Handle relative paths (e.g. "pdfs/file.pdf" or just "file.pdf" if in pdfs bucket)
      if (url.includes("/")) {
        const parts = url.split("/");
        bucket = parts.shift();
        filePath = parts.join("/");
      } else {
        bucket = "pdfs";
        filePath = url;
      }
    }
    
    if (bucket && filePath) {
      const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
      if (error) {
        console.error(`[Admin API] ❌ Storage cleanup failed for ${filePath} in ${bucket}:`, error);
      } else {
        console.log(`[Admin API] 🗑️ Deleted storage file: ${filePath} from bucket ${bucket}`);
      }
    }
  } catch (err: any) {
    console.warn("[Admin API] Storage cleanup logic exception:", err.message);
  }
}

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error: Database client missing" }, { status: 500 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PATCH = withAdmin(async (req: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = await req.json();
    const { table, id, payload } = body;

    if (!id || !table || !["resources", "subjects", "courses"].includes(table)) {
      return NextResponse.json({ error: "ID and valid table required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Invalidate Cache
    try {
      const { invalidateCache } = await import("@/lib/redis");
      if (table === "courses") {
        await invalidateCache("courses:active");
      }
    } catch (err) {
      console.warn("[Admin API] Cache invalidation failed:", err);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Admin API PATCH] Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (req: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const table = searchParams.get("table") || "resources";

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (table === "courses") {
      console.log(`[Admin API] 🗑️ Initializing cascading delete for course: ${id}`);
      
      // 1. Clean up ALL resources linked to this course (Storage + DB)
      const { data: resources, error: resFetchErr } = await supabaseAdmin
        .from("resources")
        .select("id, url")
        .eq("course_id", id);
      
      if (!resFetchErr && resources && resources.length > 0) {
        console.log(`[Admin API] Found ${resources.length} resources to clean up for course ${id}`);
        for (const res of resources) {
          if (res.url) await deleteStorageFile(res.url);
        }
        await supabaseAdmin.from("resources").delete().eq("course_id", id);
      }

      // 2. Delete all subjects
      await supabaseAdmin.from("subjects").delete().eq("course_id", id);

      // 3. Delete all semesters
      await supabaseAdmin.from("semesters").delete().eq("course_id", id);

      // 4. Finally delete the course
      const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
      if (error) throw error;
      
      console.log(`[Admin API] ✅ Successfully deleted course and all dependencies: ${id}`);

    } else if (table === "subjects") {
      console.log(`[Admin API] 🗑️ Initializing cascading delete for subject: ${id}`);

      // 1. Clean up resources linked to this subject
      const { data: resources, error: resFetchErr } = await supabaseAdmin
        .from("resources")
        .select("id, url")
        .eq("subject_id", id);
      
      if (!resFetchErr && resources && resources.length > 0) {
        for (const res of resources) {
          if (res.url) await deleteStorageFile(res.url);
        }
        await supabaseAdmin.from("resources").delete().eq("subject_id", id);
      }

      // 2. Delete the subject
      const { error } = await supabaseAdmin.from("subjects").delete().eq("id", id);
      if (error) throw error;

      console.log(`[Admin API] ✅ Successfully deleted subject and dependencies: ${id}`);

    } else if (table === "resources") {
      // Get the resource to find the file path and subject_id for cache invalidation
      const { data: resource, error: fetchError } = await supabaseAdmin
        .from("resources")
        .select("url, subject_id")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.warn(`[Admin API] Could not fetch resource ${id} metadata:`, fetchError.message);
      }

      if (resource?.url) {
        await deleteStorageFile(resource.url);
      }

      // Hard delete from DB
      const { error } = await supabaseAdmin
        .from("resources")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Invalidate Cache for specific subject
      try {
        const { invalidateCache } = await import("@/lib/redis");
        if (resource?.subject_id) {
          await invalidateCache(`resources:list:${resource.subject_id}`);
          console.log(`[Admin API] ⚡ Invalidated resource cache for subject: ${resource.subject_id}`);
        }
        await invalidateCache("courses:active");
      } catch (err) {
        console.warn("[Admin API] Cache invalidation failed:", err);
      }
    } else {
      // Default delete for other tables
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("id", id);
      if (error) throw error;
    }

    // Final Invalidation fallback
    try {
      const { invalidateCache } = await import("@/lib/redis");
      await invalidateCache("courses:active");
    } catch (err) {
      console.warn("[Admin API] Final cache invalidation failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
