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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    let bucket = formData.get("bucket") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Auto-select bucket based on file type if not provided
    if (!bucket) {
      bucket = file.type === "application/pdf" ? "pdfs" : "resources";
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean filename
    const fileName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "-")}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error("[Upload API] Storage Error:", error);
      throw error;
    }

    // For the secure 'pdfs' bucket, we return the path which will be signed on demand
    if (bucket === "pdfs") {
      return NextResponse.json({ url: data.path, bucket: "pdfs" });
    }

    // For other buckets (public), return the full public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl, bucket });
  } catch (error: any) {
    console.error("[Upload API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
