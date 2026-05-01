import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { ResourceService } from "@/services/resourceService";

/**
 * POST /api/resources/verify-access
 * Server-side premium content access verification.
 * The client sends the resource ID and their Firebase Auth token.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const idToken = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { resourceId } = await req.json();
    if (!resourceId) {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

    // Use centralized service for verification and secure URL generation
    const result = await ResourceService.verifyAccess(decodedToken.uid, resourceId);

    if (!result.authorized) {
      return NextResponse.json({ 
        authorized: false, 
        error: result.error || "Access denied" 
      }, { status: 403 });
    }

    return NextResponse.json({
      authorized: true,
      url: result.url,
      type: result.type,
      title: result.title
    });

  } catch (error: any) {
    console.error("[API Verify Access] Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

