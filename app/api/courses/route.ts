import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCachedData } from "@/lib/redis";



export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized");
    }

    if (id) {
      const { data, error } = await supabaseAdmin
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }
        throw error;
      }
      
      return NextResponse.json({
        id: data.id,
        name: data.name,
        code: data.code,
        description: data.description,
        order: data.order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      });
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
    console.error("[API Courses] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
