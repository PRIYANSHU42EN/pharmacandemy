import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/rate-limit";
import { withAdmin } from "@/lib/api-middleware";

// Allowed MIME types and extensions for security
const ALLOWED_TYPES = {
  "pdfs": ["application/pdf"],
  "resources": ["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]
};

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const rateLimitResponse = await applyRateLimit(req, { maxRequests: 20, windowMs: 60000 });
    if (rateLimitResponse) return rateLimitResponse;

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

    // Security: Validate File Type
    const allowedForBucket = ALLOWED_TYPES[bucket as keyof typeof ALLOWED_TYPES] || [];
    if (!allowedForBucket.includes(file.type)) {
      console.warn(`[Upload API] Rejected invalid file type: ${file.type} for bucket ${bucket}`);
      return NextResponse.json({ error: "Invalid file type. Only standard documents and media are allowed." }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    
    // Security: File Size Limit (100MB)
    if (bytes.byteLength > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 100MB limit." }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Failed to upload file to storage system." }, { status: 500 });
    }

    // For the secure 'pdfs' bucket, return the proxy URL
    if (bucket === "pdfs") {
      const proxyUrl = `/api/pdf?path=${data.path}`;
      return NextResponse.json({ url: proxyUrl, bucket: "pdfs", path: data.path });
    }

    // For other buckets (public), return the full public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl, bucket });
  } catch (error: any) {
    console.error("[Upload API] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

