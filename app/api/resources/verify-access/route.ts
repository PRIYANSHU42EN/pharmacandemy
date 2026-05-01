import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/resources/verify-access
 * Server-side premium content access verification.
 * The client sends the resource ID and their Firebase Auth token.
 * The server verifies the token, checks the resource's premium status,
 * and only returns the content URL if the user is authorized.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      );
    }

    // Enforce Email Verification
    if (!decodedToken.email_verified) {
      return NextResponse.json(
        { error: "Email verification required to access content" },
        { status: 403 }
      );
    }

    const { resourceId } = await req.json();
    if (!resourceId || typeof resourceId !== "string") {
      return NextResponse.json(
        { error: "Resource ID is required" },
        { status: 400 }
      );
    }

    // Fetch the resource document
    const resourceDoc = await adminDb.collection("resources").doc(resourceId).get();
    if (!resourceDoc.exists) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    const resourceData = resourceDoc.data()!;

    // Check if resource is soft-deleted
    if (resourceData.isDeleted) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // Helper to generate signed URL if needed
    const getSecureUrl = async (url: string) => {
      if (!url.includes("supabase.co/storage/v1/object/")) return url;
      
      const { supabaseAdmin } = await import("@/lib/supabase/admin");
      if (!supabaseAdmin) return url;

      try {
        const urlParts = url.split("/storage/v1/object/");
        if (urlParts.length < 2) return url;

        const pathParts = urlParts[1].split("/");
        pathParts.shift(); // Remove 'public' or 'authenticated' prefix
        const bucket = pathParts.shift();
        const path = pathParts.join("/");

        if (!bucket || !path) return url;

        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error || !data) return url;
        return data.signedUrl;
      } catch (err) {
        console.error("[API] Failed to generate signed URL:", err);
        return url;
      }
    };

    // If resource is not premium, grant access immediately with secure URL
    if (!resourceData.isPremium) {
      return NextResponse.json({
        authorized: true,
        url: await getSecureUrl(resourceData.url),
        type: resourceData.type,
        title: resourceData.title,
      });
    }

    // Resource IS premium — verify user's premium status
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const userData = userDoc.data()!;

    // Check admin role — admins always have access
    const isAdmin = ["admin", "super-admin", "content-admin"].includes(userData.role);
    if (isAdmin) {
      return NextResponse.json({
        authorized: true,
        url: await getSecureUrl(resourceData.url),
        type: resourceData.type,
        title: resourceData.title,
      });
    }

    // Check premium status and expiry
    if (!userData.isPremium || !userData.premiumExpiry) {
      return NextResponse.json({
        authorized: false,
        error: "You are not a premium member",
      }, { status: 403 });
    }

    const premiumExpiry = userData.premiumExpiry.toDate
      ? userData.premiumExpiry.toDate()
      : new Date(userData.premiumExpiry);

    if (premiumExpiry <= new Date()) {
      return NextResponse.json({
        authorized: false,
        error: "Your premium subscription has expired",
      }, { status: 403 });
    }

    // User is premium and subscription is active
    return NextResponse.json({
      authorized: true,
      url: await getSecureUrl(resourceData.url),
      type: resourceData.type,
      title: resourceData.title,
    });

  } catch (error: unknown) {
    console.error("[API] Resource access verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
