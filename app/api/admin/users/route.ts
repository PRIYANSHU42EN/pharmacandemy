import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/firebase/admin";
import { withAdmin } from "@/lib/api-middleware";

export const GET = withAdmin(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API/Admin/Users] GET Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PATCH = withAdmin(async (request: NextRequest) => {
  try {
    const { uid, updates } = await request.json();
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Apply updates to target user
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
    
    // Update Firebase Custom Claims for consistency
    try {
      const claims: any = {
        role: data.role,
        emailVerified: true
      };
      
      await adminAuth.setCustomUserClaims(uid, claims);
      
      // Also update Firestore for total consistency
      const { adminDb } = await import("@/lib/firebase/admin");
      await adminDb.collection("users").doc(uid).update({
        role: data.role,
        updatedAt: new Date().toISOString()
      });
    } catch (claimErr: any) {
      console.warn("[Admin/Users] Failed to sync claims/firestore:", claimErr.message);
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    console.error("[API/Admin/Users] PATCH Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

