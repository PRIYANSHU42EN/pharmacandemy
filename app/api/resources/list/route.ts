import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCachedData } from "@/lib/redis";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const subjectId = searchParams.get("subjectId");

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    if (id) {
      const { data, error } = await supabaseAdmin
        .from("resources")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }
        throw error;
      }
      if (data.is_deleted) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      
      return NextResponse.json({
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type,
        url: "", // SECURITY: URL hidden from list API
        subjectId: data.subject_id,
        courseId: data.course_id,
        previewImageUrl: data.preview_image_url,
        tags: data.tags || [],
        year: data.year,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });
    }

    if (!subjectId) {
      return NextResponse.json({ error: "id or subjectId is required" }, { status: 400 });
    }

    const cacheKey = `resources:list:${subjectId}`;

    const resources = await getCachedData(
      cacheKey,
      async () => {
        const { data, error } = await supabaseAdmin!
          .from("resources")
          .select("*")
          .eq("subject_id", subjectId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        return (data || []).map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type,
          url: "", // SECURITY: URL hidden from list API
          subjectId: r.subject_id,
          courseId: r.course_id,
          previewImageUrl: r.preview_image_url,
          tags: r.tags || [],
          year: r.year,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      },
      300 // 5 minutes
    );

    return NextResponse.json(resources, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=59",
      }
    });
  } catch (error: any) {
    console.error("[API Resources List] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
