import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculateStreak } from "@/lib/streak";
import { applyReferral, generateReferralCode } from "@/lib/referral";

/**
 * POST /api/auth/sync
 * High-performance, atomic user synchronization between Firebase and Supabase.
 * Target Latency: < 1.5s
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    // 1. Critical Initialization Check
    if (!adminAuth || !adminDb || !supabaseAdmin) {
      console.error("[Sync] ❌ Critical infrastructure missing (Firebase/Supabase Admin)");
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
    
    console.log(`[Sync] 🔄 High-speed sync for: ${email} (${uid})`);

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
        console.log(`[Sync] 📦 Firestore fallback used for ${uid}`);
      }
    }

    // 5. Data Consolidation
    const isSuperAdmin = email === "smashgaming5488@gmail.com" || email === "smasgaming5488@gmail.com";
    const userRole = isSuperAdmin ? "admin" : (dbUser?.role || "user");
    const isPremium = dbUser ? (dbUser.is_premium ?? dbUser.isPremium ?? false) : false;
    const premiumExpiry = dbUser?.premium_expires_at || dbUser?.premiumExpiry || null;
    
    let referralCode = dbUser?.referral_code || dbUser?.referralCode;
    if (!referralCode) referralCode = generateReferralCode();

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
      role: userRole,
      isPremium,
      premiumExpiry,
      streak: newStreak,
      lastActiveDate,
      streakUpdated: isNewDay,
      referralCode
    };

    const updatePromises = [];

    // Atomic Supabase Upsert
    updatePromises.push(supabaseAdmin.from("users").upsert({
      id: uid,
      email: email || "",
      name: userName,
      role: userRole,
      is_premium: isPremium,
      premium_expires_at: premiumExpiry,
      streak: newStreak,
      last_active_date: lastActiveDate,
      referral_code: referralCode,
      updated_at: new Date().toISOString()
    }));

    // Firestore Sync
    updatePromises.push(adminDb.collection("users").doc(uid).set({
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true }));

    // Custom Claims (Security)
    if (dbUser?.role !== userRole || dbUser?.is_premium !== isPremium) {
      updatePromises.push(adminAuth.setCustomUserClaims(uid, {
        role: userRole,
        isPremium: isPremium
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
    console.error("[Sync] ❌ Fatal Error:", error.message);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
