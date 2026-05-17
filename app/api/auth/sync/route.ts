import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chatSupabaseAdmin } from "@/lib/supabase/chatAdmin";
import { calculateStreak } from "@/lib/streak";
import { applyReferral, generateReferralCode } from "@/lib/referral";
import logger from "@/lib/logger";
import { applyRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/sync
 * High-performance, atomic user synchronization between Firebase and Supabase.
 * Target Latency: < 1.5s
 */
export async function POST(req: NextRequest) {
  try {
    // 0. Rate Limiting
    const rateLimitResponse = await applyRateLimit(req, {
      maxRequests: 30,
      windowMs: 60000,
      errorMessage: "Too many sync attempts. Please try again in a minute."
    });
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    // 1. Critical Initialization Check
    if (!adminAuth || !adminDb || !supabaseAdmin) {
      logger.error("[Sync] ❌ Critical infrastructure missing (Firebase/Supabase Admin)");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // 2. Fast Token Verification
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken) {
       return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { uid, email, picture } = decodedToken;
    const body = await req.json().catch(() => ({}));
    const { name, displayName, referralCode: incomingRefCode } = body;

    const userName = name || displayName || email?.split("@")[0] || "Student";
    const photoURL = picture || null;
    
    logger.info({ uid }, `[Sync] 🔄 High-speed sync initiated`);

    // 3. Parallel Read (Supabase is Source of Truth)
    // We race Supabase against a tight timeout. Firestore is the secondary fallback.
    const supabasePromise = supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
      
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const result = await Promise.race([supabasePromise, timeoutPromise]) as any;
    
    let dbUser = result?.data || null;
    
    // 4. Firestore Fallback (only if Supabase is slow or missing user)
    if (!dbUser) {
      const firestoreSnap = await adminDb.collection("users").doc(uid).get().catch(() => null);
      if (firestoreSnap?.exists) {
        dbUser = firestoreSnap.data();
        logger.info({ uid }, `[Sync] Packaged Firestore fallback used`);
      }
    }

    // 5. Data Consolidation
    const isSuperAdmin = email === "smashgaming5488@gmail.com";
    const userRole = isSuperAdmin ? "admin" : (dbUser?.role || "user");
    
    let referralCode = dbUser?.referral_code || dbUser?.referralCode;
    if (!referralCode) referralCode = generateReferralCode();

    let username = dbUser?.username || null;
    if (!username) {
      const base = (email?.split("@")[0] || userName).toLowerCase().replace(/\./g, "").replace(/\s/g, "");
      username = `${base}${uid.substring(0, 4)}`.toLowerCase();
    }

    const currentStreak = dbUser?.streak || 0;
    const prevLastActive = dbUser?.last_active_date || dbUser?.lastActiveDate || null;
    const { newStreak, lastActiveDate, shouldUpdate: isNewDay } = calculateStreak(prevLastActive, currentStreak);

    // 6. Non-Blocking Background Updates
    // We prepare the update and fire it without awaiting the full completion if possible,
    // or we wait with a very short timeout.
    const profile = {
      uid,
      email: email || "",
      displayName: userName,
      username,
      role: userRole,
      streak: newStreak,
      lastActiveDate,
      streakUpdated: isNewDay,
      referralCode
    };

    const updatePromises = [];

    // Atomic Supabase Upsert
    const upsertData = {
      id: uid,
      email: email || "",
      name: userName,
      display_name: userName,
      username,
      photo_url: photoURL,
      role: userRole,
      streak: newStreak,
      last_active_date: lastActiveDate,
      referral_code: referralCode,
      updated_at: new Date().toISOString()
    };

    updatePromises.push(supabaseAdmin.from("users").upsert(upsertData));

    // Dual-Sync to Chat Database if configured
    if (chatSupabaseAdmin && process.env.NEXT_PUBLIC_CHAT_SUPABASE_URL !== process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // We omit 'username' here because the secondary DB might not have the column yet
      // and we cannot easily run migrations on it via this environment.
      const chatUpsertData = { ...upsertData };
      delete (chatUpsertData as any).username;

      Promise.resolve(chatSupabaseAdmin.from("users").upsert(chatUpsertData)).then(({ error }) => {
        if (error) logger.warn({ uid }, "[Sync] ⚠️ Chat DB Sync failed");
      }).catch(e => logger.warn({ uid, error: e }, "[Sync] ⚠️ Chat DB Sync exception"));
    }

    // Firestore Sync
    updatePromises.push(adminDb.collection("users").doc(uid).set({
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true }));

    // Custom Claims (Security)
    if (dbUser?.role !== userRole) {
      updatePromises.push(adminAuth.setCustomUserClaims(uid, {
        role: userRole
      }));
    }

    // Handle Referral (New Users Only)
    if (!dbUser && incomingRefCode) {
      updatePromises.push(applyReferral(uid, incomingRefCode));
    }

    // 7. Finalize & Respond Fast
    // We wait max 1s for background tasks to kick off or finish.
    const finalTimeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), 1000));
    await Promise.race([Promise.allSettled(updatePromises), finalTimeout]);

    return NextResponse.json({ success: true, profile });

  } catch (error: any) {
    logger.error({ error: error.message }, "[Sync] ❌ Fatal Error during sync");
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
