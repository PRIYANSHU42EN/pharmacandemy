import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCachedData } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
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
          url: r.url,
          subjectId: r.subject_id,
          courseId: r.course_id,
          isPremium: r.is_premium,
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
    console.error("[API Resources List] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
