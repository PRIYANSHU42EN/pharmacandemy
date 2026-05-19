import { NextRequest, NextResponse } from "next/server";
import { pptSupabaseAdmin } from "@/lib/supabase/pptAdmin";
import { adminAuth } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pptId = searchParams.get("id");
    const authHeader = req.headers.get("Authorization");

    if (!pptId) return NextResponse.json({ error: "Missing asset ID" }, { status: 400 });

    if (!pptSupabaseAdmin) {
      return NextResponse.json({ error: "Storage/Database not configured" }, { status: 500 });
    }

    // 1. Fetch PPT details
    const { data: ppt, error: pptError } = await pptSupabaseAdmin
      .from("ppt_marketplace")
      .select("*")
      .eq("id", pptId)
      .single();

    if (pptError || !ppt) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    // 2. If free, just give it
    if (ppt.price === 0) {
       return await generateDownloadResponse(ppt.full_file_url);
    }

    // 3. Check Authentication for paid assets
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 4. Verify Purchase
    const { data: purchase, error: purchaseError } = await pptSupabaseAdmin
      .from("ppt_purchases")
      .select("*")
      .eq("user_id", userId)
      .eq("ppt_id", pptId)
      .maybeSingle();

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: "Purchase required" }, { status: 403 });
    }

    return await generateDownloadResponse(ppt.full_file_url);

  } catch (error: any) {
    console.error("[Download API] Error:", error.message);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

async function generateDownloadResponse(fileUrl: string) {
  // Extract path from public URL if stored as full URL, or use path directly
  // Assuming full_file_url is a public URL like https://.../storage/v1/object/public/ppt_assets/full_assets/xyz.pptx
  // We need the relative path: full_assets/xyz.pptx
  
  const pathParts = fileUrl.split('/ppt_assets/');
  if (pathParts.length < 2) return NextResponse.json({ error: "Invalid file path" }, { status: 500 });
  
  const filePath = pathParts[1];

  if (!pptSupabaseAdmin) {
    throw new Error("PPT Storage not initialized");
  }
  
  const { data, error } = await pptSupabaseAdmin.storage
    .from("ppt_assets")
    .createSignedUrl(filePath, 300); // 5 minute link

  if (error) throw error;

  return NextResponse.json({ url: data.signedUrl });
}
