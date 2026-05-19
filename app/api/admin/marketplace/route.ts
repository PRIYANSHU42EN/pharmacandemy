import { NextRequest, NextResponse } from "next/server";
import { pptSupabaseAdmin } from "@/lib/supabase/pptAdmin";
import { withAdmin } from "@/lib/api-middleware";

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { 
      title, category_id, topic, price, 
      description, thumbnail_url, 
      sample_file_url, full_file_url, preview_images,
      creator_id, tags, moderation_status, is_featured, is_active
    } = body;

    if (!pptSupabaseAdmin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // Insert PPT
    const { data: ppt, error: pptErr } = await pptSupabaseAdmin
      .from('ppt_marketplace')
      .insert({
        title,
        category_id,
        topic,
        price: parseInt(price),
        description,
        thumbnail_url,
        sample_file_url,
        full_file_url,
        preview_images,
        creator_id: creator_id || null,
        tags: tags || [],
        moderation_status: moderation_status || 'pending',
        is_featured: is_featured || false,
        is_active: is_active ?? true
      })
      .select()
      .single();

    if (pptErr) {
      console.error("[Admin Marketplace API] Supabase Insert Error:", pptErr);
      return NextResponse.json({ 
        error: pptErr.message, 
        details: pptErr.details,
        hint: pptErr.hint
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, ppt });

  } catch (error: any) {
    console.error("[Admin Marketplace API] Global Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PATCH = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!pptSupabaseAdmin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const { data, error } = await pptSupabaseAdmin
      .from('ppt_marketplace')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, ppt: data });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!pptSupabaseAdmin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const { error } = await pptSupabaseAdmin
      .from('ppt_marketplace')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

