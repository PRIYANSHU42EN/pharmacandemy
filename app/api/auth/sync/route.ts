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
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    const { name, displayName } = await req.json();

    const userName = name || displayName || email?.split("@")[0] || "Student";

    // 1. Sync to Firestore
    let existingData: any = null;
    try {
      console.log(`[Sync] Starting Firestore sync for ${uid} (${email})`);
      const userRef = adminDb.collection("users").doc(uid);
      const userSnap = await userRef.get();
      existingData = userSnap.data();

      const isSuperAdmin = email === "smashgaming5488@gmail.com";
      const userRole = isSuperAdmin ? "admin" : (existingData?.role ?? "user");

      await userRef.set({
        uid,
        email: email || "",
        displayName: userName,
        isPremium: existingData?.isPremium ?? false,
        premiumExpiry: existingData?.premiumExpiry || null,
        role: userRole,
        updatedAt: new Date().toISOString(),
        createdAt: existingData?.createdAt || new Date().toISOString(),
      }, { merge: true });
      console.log(`[Sync] Firestore sync successful for ${uid}`);
    } catch (firestoreError: any) {
      console.error("[Sync] Firestore sync failed (ignoring):", firestoreError.message);
      // Continue to Supabase sync
    }

    const isSuperAdmin = email === "smashgaming5488@gmail.com";
    const userRole = isSuperAdmin ? "admin" : (existingData?.role ?? "user"); 

    // 2. Sync to Supabase
    if (supabaseAdmin) {
      console.log(`[Sync] Starting Supabase sync for ${uid}`);
      const { error: pgError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: uid,
          email: email || "",
          name: userName,
          role: userRole,
          is_premium: existingData?.isPremium ?? false,
          updated_at: new Date().toISOString()
        });
      
      if (pgError) console.warn(`[Sync] Supabase sync warning: ${pgError.message}`);
      else console.log(`[Sync] Supabase sync successful for ${uid}`);
    } else {
      console.warn("[Sync] Supabase sync skipped (missing service role key)");
    }

    return NextResponse.json({ 
      success: true, 
      message: "User synced successfully",
      profile: {
        uid,
        email,
        displayName: userName,
        role: existingData?.role ?? "user",
        isPremium: existingData?.isPremium ?? false
      }
    });
  } catch (error: any) {
    console.error("[Sync] Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
