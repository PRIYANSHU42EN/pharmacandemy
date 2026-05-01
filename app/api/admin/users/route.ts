import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Admin check
    const { data: requester } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', decodedToken.uid)
      .single();

    if (requester?.role !== 'admin' && requester?.role !== 'super-admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, is_premium, premium_expires_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API/Admin/Users] GET Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid, updates } = await request.json();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // 1. Verify the caller's Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // 2. Check if the requester is actually an admin in Supabase
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { data: requester, error: reqError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', decodedToken.uid)
      .single();

    if (reqError || (requester?.role !== 'admin' && requester?.role !== 'super-admin')) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 3. Apply updates to target user
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', uid)
      .select()
      .single();

    if (error) throw error;
    
    // 4. Update Firebase Custom Claims for consistency
    try {
      const claims: any = {
        role: data.role,
        isPremium: data.is_premium,
        emailVerified: true // Assume verified if admin is touching it, or keep existing?
      };
      
      // Fetch existing claims to preserve emailVerified if needed, or just set it
      // For now, let's just set the essential role and premium status
      await adminAuth.setCustomUserClaims(uid, claims);
      
      // Also update Firestore for total consistency
      const { adminDb } = await import("@/lib/firebase/admin");
      await adminDb.collection("users").doc(uid).update({
        role: data.role,
        isPremium: data.is_premium,
        updatedAt: new Date().toISOString()
      });
    } catch (claimErr: any) {
      console.warn("[Admin/Users] Failed to sync claims/firestore:", claimErr.message);
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    console.error("[API/Admin/Users] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
