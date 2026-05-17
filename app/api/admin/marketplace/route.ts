import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyFirebaseToken, checkAdminRole } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      title, category_id, topic, price, 
      description, thumbnail_url, 
      sample_file_url, full_file_url, preview_images,
      creator_id, tags, moderation_status, is_featured, is_active
    } = body;

    // Insert PPT
    const { data: ppt, error: pptErr } = await supabaseAdmin
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
}

export async function PATCH(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, updates } = body;

    const { data, error } = await supabaseAdmin
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
}

export async function DELETE(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = await checkAdminRole(decodedToken.uid);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const { error } = await supabaseAdmin
      .from('ppt_marketplace')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
