import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    // Health Check: Ensure Admin SDK is alive
    if (!adminAuth || !adminDb) {
      console.error("[Sync] ❌ Firebase Admin SDK not initialized properly");
      return NextResponse.json({ error: "Backend configuration error" }, { status: 500 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    const { name, displayName } = await req.json();

    const userName = name || displayName || email?.split("@")[0] || "Student";
    console.log(`[Sync] 🔄 Sync request for: ${email} (${uid})`);

    // 1. Fetch existing profile from Firestore to preserve roles/premium
    let existingData: any = null;
    const userRef = adminDb.collection("users").doc(uid);
    try {
      // Timeout Firestore read after 3s
      const fetchPromise = userRef.get();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      
      const userSnap = await Promise.race([fetchPromise, timeoutPromise]) as any;
      if (userSnap?.exists) {
        existingData = userSnap.data();
      }
    } catch (e: any) {
      const errorMsg = e.message || (typeof e === 'string' ? e : JSON.stringify(e));
      console.warn("[Sync] ⚠️ Firestore read failed or timed out:", errorMsg);
    }

    // Role Logic: Super Admin Priority > Existing Role > Default "user"
    const isSuperAdmin = email === "smashgaming5488@gmail.com" || email === "smasgaming5488@gmail.com" || email === "testadmin@example.com";
    const userRole = isSuperAdmin ? "admin" : (existingData?.role ?? "user");
    const isPremium = existingData?.isPremium ?? false;

    // 2. Update Firestore (Source of Truth for Profile) - Wrapped in try/catch
    try {
      const updatePromise = userRef.set({
        uid,
        email: email || "",
        emailVerified: decodedToken.email_verified || false,
        displayName: userName,
        isPremium,
        premiumExpiry: existingData?.premiumExpiry || null,
        role: userRole,
        updatedAt: new Date().toISOString(),
        createdAt: existingData?.createdAt || new Date().toISOString(),
      }, { merge: true });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 1500) // Lower timeout to 1.5s
      );

      await Promise.race([updatePromise, timeoutPromise]);
      console.log(`[Sync] ✅ Firestore update successful for ${email}`);
    } catch (e: any) {
      if (e.message?.includes("PERMISSION_DENIED") || e.message?.includes("API has not been used")) {
        console.warn("[Sync] 🛑 Firestore API is DISABLED in cloud console. Skipping Firestore sync.");
      } else {
        const errorMsg = e.message || (typeof e === 'string' ? e : JSON.stringify(e));
        console.error("[Sync] ❌ Firestore write failed or timed out:", errorMsg);
      }
      // We continue to Supabase even if Firestore fails
    }

    // 3. Set Custom Claims in Firebase Auth (for instant frontend role check)
    try {
      await adminAuth.setCustomUserClaims(uid, {
        role: userRole,
        isPremium: isPremium,
        emailVerified: decodedToken.email_verified || false
      });
      console.log(`[Sync] 🔑 Custom claims set for ${email}: ${userRole}`);
    } catch (e: any) {
      console.warn("[Sync] ⚠️ Claims update failed:", e.message);
    }

    // 4. Sync to Supabase (Mirror for DB operations)
    if (supabaseAdmin) {
      const { error: pgError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: uid,
          email: email || "",
          email_verified: decodedToken.email_verified || false,
          name: userName,
          role: userRole,
          is_premium: isPremium,
          premium_expiry: existingData?.premiumExpiry || null,
          updated_at: new Date().toISOString()
        });
      
      if (pgError) {
        console.warn(`[Sync] ⚠️ Supabase sync warning: ${pgError.message}`);
      } else {
        console.log(`[Sync] ✅ Supabase sync successful for ${uid}`);
      }
    }

    // Phase 7: Role fetched AFTER sync
    return NextResponse.json({ 
      success: true, 
      profile: {
        uid,
        email,
        displayName: userName,
        role: userRole,
        isPremium: isPremium,
        premiumExpiry: existingData?.premiumExpiry || null
      }
    });
  } catch (error: any) {
    console.error("[Sync] ❌ Fatal Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
