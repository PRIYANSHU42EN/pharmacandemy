import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import logger from "@/lib/logger";

// Username validation: alphanumeric + underscores, 3-20 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

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
      logger.warn({ uid: decodedToken.uid }, "[API Users Me] Profile not found");
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 3. Return combined user data
    return NextResponse.json({
      uid: profile.id,
      email: profile.email,
      displayName: profile.name,
      username: profile.username,
      role: profile.role,
      streak: profile.streak || 0,
      lastActiveDate: profile.last_active_date,
      referralCode: profile.referral_code,
      referralCount: profile.referral_count || 0,
      createdAt: profile.created_at,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "[API Users Me] Error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/users/me
 * Update the current user's username (and optionally display name).
 * Validates format and uniqueness before persisting.
 */
export async function PATCH(req: NextRequest) {
  let decodedToken: any = null;
  try {
    // 1. Verify Authentication
    decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { username, displayName } = body;

    // Build update payload — only include fields that are provided
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    // 2. Validate & process username if provided
    if (username !== undefined) {
      const trimmed = String(username).trim().toLowerCase();

      if (!USERNAME_REGEX.test(trimmed)) {
        return NextResponse.json(
          { error: "Username must be 3-20 characters and can only contain letters, numbers, and underscores." },
          { status: 400 }
        );
      }

      // 3. Check uniqueness (exclude self)
      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", trimmed)
        .neq("id", decodedToken.uid)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "This username is already taken. Try another one." },
          { status: 409 }
        );
      }

      updateData.username = trimmed;
    }

    // 4. Validate & process display name if provided
    if (displayName !== undefined) {
      const trimmedName = String(displayName).trim();
      if (trimmedName.length < 1 || trimmedName.length > 50) {
        return NextResponse.json(
          { error: "Display name must be between 1 and 50 characters." },
          { status: 400 }
        );
      }
      updateData.display_name = trimmedName;
      updateData.name = trimmedName;
    }

    // 5. Persist to Supabase
    const { data: updated, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", decodedToken.uid)
      .select("id, username, display_name, email, role, streak, referral_code")
      .single();

    if (error) {
      logger.error({ uid: decodedToken.uid, error: error.message }, "[API Users Me] Update error");
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        uid: updated.id,
        email: updated.email,
        displayName: updated.display_name,
        username: updated.username,
        role: updated.role,
        streak: updated.streak,
        referralCode: updated.referral_code,
      },
    });
  } catch (error: any) {
    logger.error({ uid: decodedToken?.uid, error: error.message }, "[API Users Me] PATCH Error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
