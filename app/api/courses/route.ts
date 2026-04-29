import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCachedData } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const courses = await getCachedData(
      "courses:active",
      async () => {
        const { data, error } = await supabaseAdmin!
          .from("courses")
          .select("*")
          .eq("is_active", true)
          .order("order", { ascending: true });

        if (error) throw error;
        
        return (data || []).map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          description: c.description,
          order: c.order,
          isActive: c.is_active,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
      },
      300 // 5 minutes
    );

    return NextResponse.json(courses, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=59",
      }
    });
  } catch (error: any) {
    console.error("[API Courses] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
