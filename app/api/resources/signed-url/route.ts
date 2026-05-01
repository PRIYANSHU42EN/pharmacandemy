import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyFirebaseToken } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enforce email verification
    if (!decodedToken.email_verified) {
      return NextResponse.json(
        { error: "Email verification required to access private resources" },
        { status: 403 }
      );
    }

    const { path, bucket = "resources", expiresIn = 3600 } = await req.json();

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // Generate signed URL
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error: any) {
    console.error("[Signed URL API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
