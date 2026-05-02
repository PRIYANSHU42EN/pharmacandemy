import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyFirebaseToken } from "@/lib/auth-utils";
import { getCachedData } from "@/lib/redis";

/**
 * GET /api/pdf?path=...
 * Returns a signed URL for a PDF file in the private 'pdfs' bucket.
 * Verifies user premium status before granting access.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    const queryToken = searchParams.get("token");

    if (!path) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    // 1. Authenticate user via Firebase (support header or query param)
    const authHeader = req.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : queryToken;
    
    if (!idToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decodedToken = await verifyFirebaseToken(idToken);
    if (!decodedToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Storage system not configured" }, { status: 500 });
    }

    // 2. Verify premium status in Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("is_premium, premium_expires_at, role")
      .eq("id", decodedToken.uid)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const isAdmin = ["admin", "super-admin", "content-admin"].includes(user.role || "");
    const isPremium = user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > new Date();

    if (!isAdmin && !isPremium) {
      return NextResponse.json({ error: "Premium required", code: "PREMIUM_REQUIRED" }, { status: 403 });
    }

    // 3. Handle External URLs (Legacy Google Drive, etc.) vs Supabase Paths
    if (path.startsWith("http")) {
      console.log("[API PDF] Streaming external URL:", path);
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`External source returned ${response.status}: ${path}`);
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("text/html")) {
        return NextResponse.json({ 
          error: "The file is too large for a direct download or requires virus scan approval. Please upload it directly to Supabase Storage for reliable access.",
          code: "LARGE_FILE_CONFIRMATION" 
        }, { status: 403 });
      }

      // Return stream directly
      return new NextResponse(response.body, {
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": "public, max-age=3600",
          "Content-Length": response.headers.get("Content-Length") || "",
        },
      });
    }

    // 4. Handle Supabase Path (Signed URL or direct stream)
    const { data, error: storageError } = await supabaseAdmin.storage
      .from("pdfs")
      .createSignedUrl(path, 600);

    if (storageError || !data) {
      throw new Error(storageError?.message || "Failed to generate signed URL");
    }

    // Streaming from Supabase signed URL
    const pdfResponse = await fetch(data.signedUrl);
    
    if (!pdfResponse.ok) {
        throw new Error(`Supabase storage fetch failed: ${pdfResponse.statusText}`);
    }

    return new NextResponse(pdfResponse.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=300",
        "Content-Length": pdfResponse.headers.get("Content-Length") || "",
      },
    });

  } catch (error: any) {
    console.error("[API PDF] Proxy error:", error.message);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
