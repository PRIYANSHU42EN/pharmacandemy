import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCachedData } from "@/lib/redis";



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const courseId = searchParams.get("courseId");

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    if (id) {
      const { data, error } = await supabaseAdmin
        .from("semesters")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      return NextResponse.json({
        id: data.id,
        courseId: data.course_id,
        number: data.number,
        name: data.name,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });
    }

    if (!courseId) {
      return NextResponse.json({ error: "id or courseId is required" }, { status: 400 });
    }

    const cacheKey = `semesters:course:${courseId}`;

    const semesters = await getCachedData(
      cacheKey,
      async () => {
        const { data, error } = await supabaseAdmin!
          .from("semesters")
          .select("*")
          .eq("course_id", courseId)
          .eq("is_active", true)
          .order("number", { ascending: true });

        if (error) throw error;
        
        return (data || []).map(s => ({
          id: s.id,
          courseId: s.course_id,
          number: s.number,
          name: s.name,
          isActive: s.is_active,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }));
      },
      300 // 5 minutes
    );

    return NextResponse.json(semesters, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=59",
      }
    });
  } catch (error: any) {
    console.error("[API Semesters] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
