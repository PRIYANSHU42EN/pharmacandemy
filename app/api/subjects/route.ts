import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getCachedData } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Support both courseId (from useSubjects hook) and semesterId
    const courseId = searchParams.get("courseId");
    const semesterId = searchParams.get("semesterId");

    if (!courseId && !semesterId) {
      return NextResponse.json({ error: "courseId or semesterId is required" }, { status: 400 });
    }

    const cacheKey = courseId
      ? `subjects:course:${courseId}`
      : `subjects:sem:${semesterId}`;

    const subjects = await getCachedData(
      cacheKey,
      async () => {
        let query = supabase.from("subjects").select("*");

        if (courseId) {
          query = query.eq("course_id", courseId);
        } else {
          query = query.eq("semester_id", semesterId);
        }

        const { data, error } = await query.order("name", { ascending: true });

        if (error) throw error;

        return (data || []).map(s => ({
          id: s.id,
          courseId: s.course_id,
          semesterId: s.semester_id,
          semesterNumber: s.semester_number,
          name: s.name,
          description: s.description,
          coverImageUrl: s.cover_image_url,
          isPremium: s.is_premium,
          resourceCount: s.resource_count,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }));
      },
      300 // 5 minutes
    );

    return NextResponse.json(subjects, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=59",
      }
    });
  } catch (error: any) {
    console.error("[API Subjects] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
