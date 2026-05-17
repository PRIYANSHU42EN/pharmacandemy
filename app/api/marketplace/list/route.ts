import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("ppt_marketplace")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formattedData = data.map((item: any) => ({
      id: item.id,
      title: item.title,
      subject: item.subject,
      semester: item.semester,
      category: item.category,
      price: item.price,
      description: item.description,
      thumbnailUrl: item.thumbnail_url,
      previewImages: item.preview_images || [],
      sampleFileUrl: item.sample_file_url,
      downloadCount: item.download_count || 0,
      rating: item.rating || 5.0,
      tags: item.tags || [],
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error("[Marketplace API] Error:", error.message);
    return NextResponse.json({ error: "Failed to fetch PPTs" }, { status: 500 });
  }
}
