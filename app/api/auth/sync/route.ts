import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculateStreak } from "@/lib/streak";
import { applyReferral, generateReferralCode } from "@/lib/referral";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    // Health Check: Ensure Admin SDK and DBs are alive
    if (!adminAuth || !adminDb) {
      console.error("[Sync] ❌ Firebase Admin SDK not initialized properly. Check FIREBASE_SERVICE_ACCOUNT_KEY.");
      return NextResponse.json({ error: "Firebase configuration error" }, { status: 500 });
    }

    if (!supabaseAdmin) {
      console.error("[Sync] ❌ Supabase Admin not initialized. Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.");
      return NextResponse.json({ error: "Supabase configuration error" }, { status: 500 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken) {
       return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { uid, email, picture, email_verified, firebase } = decodedToken;
    const body = await req.json().catch(() => ({}));
    const { name, displayName, referralCode: incomingRefCode } = body;

    const userName = name || displayName || email?.split("@")[0] || "Student";
    const isGoogleAuth = firebase?.sign_in_provider === 'google.com';
    const finalEmailVerified = true; // Email verification completely disabled
    
    console.log(`[Sync] 🔄 Sync request for: ${email} (${uid})`);

    // 1. Fetch existing profile from Supabase (SOURCE OF TRUTH)
    let supabaseData: any = null;
    if (supabaseAdmin) {
        const supabasePromise = supabaseAdmin
          .from("users")
          .select("id, email, name, role, is_premium, premium_expires_at, created_at, updated_at, streak, last_active_date, referral_code, referred_by, referral_count")
          .eq("id", uid)
          .maybeSingle();
        
        const supabaseTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        const { data, error } = await Promise.race([supabasePromise, supabaseTimeout]) as any;
        
        if (data) {
          supabaseData = data;
          console.log(`[Sync] 📦 Supabase profile found for ${uid}. Premium=${data.is_premium}`);
        } else if (error) {
          console.warn("[Sync] ⚠️ Supabase fetch error:", error.message);
        } else {
          console.warn("[Sync] ⚠️ Supabase fetch timed out (3s)");
        }
    }

    // 2. Fallback to Firestore only if Supabase data is missing
    let firestoreData: any = null;
    const userRef = adminDb.collection("users").doc(uid);
    if (!supabaseData) {
      try {
        const fetchPromise = userRef.get();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const userSnap = await Promise.race([fetchPromise, timeoutPromise]) as any;
        if (userSnap?.exists) {
          firestoreData = userSnap.data();
          console.log(`[Sync] 📦 Firestore fallback profile found for ${uid}`);
        }
      } catch (e: any) {
        console.warn("[Sync] ⚠️ Firestore fallback read failed:", e.message);
      }
    }

    // Combine data: Supabase > Firestore
    const isSuperAdmin = email === "smashgaming5488@gmail.com" || email === "smasgaming5488@gmail.com" || email === "testadmin@example.com";
    const userRole = isSuperAdmin ? "admin" : (supabaseData?.role || firestoreData?.role || "user");
    const isPremium = supabaseData ? !!supabaseData.is_premium : (firestoreData?.isPremium ?? false);
    const premiumExpiry = supabaseData?.premium_expires_at || firestoreData?.premiumExpiry || null;
    const photoURL = picture || supabaseData?.photo_url || firestoreData?.photoURL || null;
    
    // Referral Logic
    const isNewUser = !supabaseData;
    let referralCode = supabaseData?.referral_code || firestoreData?.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode();
    }

    // Streak Logic (Server-side Source of Truth)
    const currentStreak = supabaseData?.streak || firestoreData?.streak || 0;
    const prevLastActive = supabaseData?.last_active_date || firestoreData?.lastActiveDate || null;
    const { newStreak, lastActiveDate, shouldUpdate: isNewDay } = calculateStreak(prevLastActive, currentStreak);

    // 2. Perform non-blocking updates in parallel
    const updatePromises = [];

    // Update Firestore
    updatePromises.push((async () => {
      try {
        await userRef.set({
          uid,
          email: email || "",
          emailVerified: finalEmailVerified,
          displayName: userName,
          photoURL,
          isPremium,
          premiumExpiry,
          streak: newStreak,
          lastActiveDate,
          referralCode,
          referredBy: supabaseData?.referred_by || firestoreData?.referredBy || null,
          referralCount: supabaseData?.referral_count || firestoreData?.referralCount || 0,
          role: userRole,
          updatedAt: new Date().toISOString(),
          createdAt: supabaseData?.created_at || firestoreData?.createdAt || new Date().toISOString(),
        }, { merge: true });
        console.log(`[Sync] ✅ Firestore update successful for ${email}`);
      } catch (e: any) {
        console.warn("[Sync] ⚠️ Firestore write failed:", e.message);
      }
    })());

    // Update Custom Claims
    updatePromises.push((async () => {
      try {
        await adminAuth.setCustomUserClaims(uid, {
          role: userRole,
          isPremium: isPremium,
          emailVerified: finalEmailVerified
        });
        console.log(`[Sync] 🔑 Custom claims set for ${email}`);
      } catch (e: any) {
        console.warn("[Sync] ⚠️ Claims update failed:", e.message);
      }
    })());

    // Update Supabase
    if (supabaseAdmin) {
      updatePromises.push((async () => {
        try {
          const { error: pgError } = await supabaseAdmin
            .from("users")
            .upsert({
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
            });
          if (pgError) throw pgError;
          console.log(`[Sync] ✅ Supabase sync successful for ${uid}`);
        } catch (e: any) {
          console.warn("[Sync] ⚠️ Supabase sync warning:", e.message);
        }
      })());
    }

    // Referral Logic (Moved to parallel)
    if (isNewUser && incomingRefCode) {
      updatePromises.push(applyReferral(uid, incomingRefCode).catch(e => {
        console.warn("[Sync] ⚠️ Referral application failed:", e.message);
      }));
    }

    // Wait for all updates with a hard cap timeout
    const batchTimeout = new Promise((resolve) => setTimeout(resolve, 4000));
    await Promise.race([Promise.allSettled(updatePromises), batchTimeout]);

    // Phase 7: Role fetched AFTER sync
    return NextResponse.json({ 
      success: true, 
      profile: {
        uid,
        email,
        displayName: userName,
        role: userRole,
        isPremium: isPremium,
        premiumExpiry: premiumExpiry,
        streak: newStreak,
        lastActiveDate,
        streakUpdated: isNewDay,
        referralCode
      }
    });
  } catch (error: any) {
    console.error("[Sync] ❌ Fatal Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
