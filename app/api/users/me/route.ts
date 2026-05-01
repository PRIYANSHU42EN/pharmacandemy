import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // 2. Fetch User Profile from Supabase (Source of Truth)
    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", decodedToken.uid)
      .single();

    if (error || !profile) {
      console.warn(`[API Users Me] Profile not found for ${decodedToken.uid}`);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 3. Return combined user data
    return NextResponse.json({
      uid: profile.id,
      email: profile.email,
      displayName: profile.name,
      role: profile.role,
      isPremium: profile.is_premium,
      premiumExpiry: profile.premium_expires_at,
      streak: profile.streak || 0,
      lastActiveDate: profile.last_active_date,
      referralCode: profile.referral_code,
      referralCount: profile.referral_count || 0,
      createdAt: profile.created_at,
    });
  } catch (error: any) {
    console.error("[API Users Me] Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
