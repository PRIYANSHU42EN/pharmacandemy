import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    const { name, displayName } = await req.json();

    const userName = name || displayName || email?.split("@")[0] || "Student";
    console.log(`[Sync] 🔄 Sync request for: ${email} (${uid})`);

    // 1. Fetch existing profile from Firestore to preserve roles/premium
    let existingData: any = null;
    const userRef = adminDb.collection("users").doc(uid);
    try {
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        existingData = userSnap.data();
      }
    } catch (e: any) {
      console.warn("[Sync] ⚠️ Firestore read failed (Likely API disabled):", e.message);
    }

    // Role Logic: Super Admin Priority > Existing Role > Default "user"
    const isSuperAdmin = email === "smashgaming5488@gmail.com";
    const userRole = isSuperAdmin ? "admin" : (existingData?.role ?? "user");
    const isPremium = existingData?.isPremium ?? false;

    // 2. Update Firestore (Source of Truth for Profile) - Wrapped in try/catch
    try {
      await userRef.set({
        uid,
        email: email || "",
        displayName: userName,
        isPremium,
        premiumExpiry: existingData?.premiumExpiry || null,
        role: userRole,
        updatedAt: new Date().toISOString(),
        createdAt: existingData?.createdAt || new Date().toISOString(),
      }, { merge: true });
      console.log(`[Sync] ✅ Firestore update successful for ${email}`);
    } catch (e: any) {
      console.error("[Sync] ❌ Firestore write failed:", e.message);
      // We continue to Supabase even if Firestore fails
    }

    // 3. Sync to Supabase (Mirror for DB operations)
    const client = supabaseAdmin || supabase;
    if (client) {
      const { error: pgError } = await client
        .from("users")
        .upsert({
          id: uid,
          email: email || "",
          name: userName,
          role: userRole,
          is_premium: isPremium,
          updated_at: new Date().toISOString()
        });
      
      if (pgError) {
        console.warn(`[Sync] ⚠️ Supabase sync warning: ${pgError.message}`);
      } else {
        console.log(`[Sync] ✅ Supabase sync successful for ${uid} using ${supabaseAdmin ? 'admin' : 'public'} client`);
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
