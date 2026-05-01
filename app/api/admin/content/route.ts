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

export async function PATCH(req: NextRequest) {
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

    if (table === "courses") {
      // 1. Check for dependent subjects
      const { count: subjectCount, error: subErr } = await supabaseAdmin
        .from("subjects")
        .select("*", { count: 'exact', head: true })
        .eq("course_id", id);
      
      if (subErr) throw subErr;
      if (subjectCount && subjectCount > 0) {
        return NextResponse.json({ error: `Cannot delete course: ${subjectCount} subjects depend on it.` }, { status: 400 });
      }

      // 2. Check for dependent semesters
      const { count: semCount, error: semErr } = await supabaseAdmin
        .from("semesters")
        .select("*", { count: 'exact', head: true })
        .eq("course_id", id);
      
      if (semErr) throw semErr;
      if (semCount && semCount > 0) {
        return NextResponse.json({ error: `Cannot delete course: ${semCount} semesters depend on it.` }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
      if (error) throw error;
      console.log(`[Admin API] 🗑️ Deleted course: ${id}`);

    } else if (table === "subjects") {
      // Check for dependent resources
      const { count: resCount, error: resErr } = await supabaseAdmin
        .from("resources")
        .select("*", { count: 'exact', head: true })
        .eq("subject_id", id);
      
      if (resErr) throw resErr;
      if (resCount && resCount > 0) {
        return NextResponse.json({ 
          error: `Cannot delete subject: ${resCount} resources are still linked to it. Please delete or reassign these resources first.` 
        }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from("subjects").delete().eq("id", id);
      if (error) throw error;
      console.log(`[Admin API] 🗑️ Deleted subject: ${id}`);

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
        try {
          // Extract path from Supabase URL
          const isPublic = resource.url.includes("/public/");
          const separator = isPublic ? "/storage/v1/object/public/" : "/storage/v1/object/authenticated/";
          
          const urlParts = resource.url.split(separator);
          if (urlParts.length === 2) {
            const pathParts = urlParts[1].split("/");
            const bucket = pathParts.shift();
            const filePath = decodeURIComponent(pathParts.join("/")); // Decode to handle special chars
            
            if (bucket && filePath) {
              const { error: storageErr } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
              if (storageErr) {
                console.error(`[Admin API] ❌ Storage cleanup failed for ${filePath}:`, storageErr);
              } else {
                console.log(`[Admin API] 🗑️ Deleted storage file: ${filePath} from bucket: ${bucket}`);
              }
            }
          }
        } catch (storageErr: any) {
          console.warn("[Admin API] Storage cleanup logic exception:", storageErr.message);
        }
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
