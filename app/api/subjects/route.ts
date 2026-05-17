import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCachedData } from "@/lib/redis";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const courseId = searchParams.get("courseId");
    const semesterId = searchParams.get("semesterId");

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    if (id) {
      const { data, error } = await supabaseAdmin
        .from("subjects")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }
        throw error;
      }
      
      return NextResponse.json({
        id: data.id,
        courseId: data.course_id,
        semesterId: data.semester_id,
        semesterNumber: data.semester_number,
        name: data.name,
        description: data.description,
        coverImageUrl: data.cover_image_url,
        resourceCount: data.resource_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });
    }

    if (!courseId && !semesterId) {
      return NextResponse.json({ error: "id, courseId or semesterId is required" }, { status: 400 });
    }

    const cacheKey = courseId === "all" 
      ? "subjects:all"
      : courseId
        ? `subjects:course:${courseId}`
        : `subjects:sem:${semesterId}`;

    const subjects = await getCachedData(
      cacheKey,
      async () => {
        let query = supabaseAdmin!.from("subjects").select("*");

        if (courseId && courseId !== "all") {
          query = query.eq("course_id", courseId);
        } else if (semesterId) {
          // If semesterId is provided, we assume it's a semester number string/int
          // as the subjects table uses semester_number column
          query = query.eq("semester_number", semesterId);
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
    console.error("[API Subjects] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
