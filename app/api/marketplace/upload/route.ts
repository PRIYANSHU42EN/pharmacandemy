import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyFirebaseToken } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database client missing" }, { status: 500 });
    }

    const body = await req.json();
    const { 
      title, subject, category, price, 
      semester, description, thumbnailUrl, 
      sampleUrl, fullUrl, displayName 
    } = body;

    // 1. Get or create creator profile
    let { data: profile, error: profileFetchErr } = await supabaseAdmin
      .from('creator_profiles')
      .select('id')
      .eq('user_id', decodedToken.uid)
      .maybeSingle();

    if (profileFetchErr) throw profileFetchErr;

    if (!profile) {
      const { data: newProfile, error: profileCreateErr } = await supabaseAdmin
        .from('creator_profiles')
        .insert({ 
          user_id: decodedToken.uid, 
          display_name: displayName || "Anonymous Creator" 
        })
        .select()
        .single();
      
      if (profileCreateErr) throw profileCreateErr;
      profile = newProfile;
    }

    // 2. Insert PPT
    const { data: ppt, error: pptErr } = await supabaseAdmin
      .from('ppt_marketplace')
      .insert({
        title,
        subject,
        category: category || 'General',
        price: parseInt(price), // already in paise from frontend or parsed here
        semester: parseInt(semester),
        description,
        thumbnail_url: thumbnailUrl,
        sample_file_url: sampleUrl,
        full_file_url: fullUrl,
        creator_id: profile!.id,
        is_active: true
      })
      .select()
      .single();

    if (pptErr) throw pptErr;

    return NextResponse.json({ success: true, ppt });

  } catch (error: any) {
    console.error("[Marketplace Upload API] Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
