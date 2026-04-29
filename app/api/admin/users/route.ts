import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/firebase/admin";

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

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    console.error("[API/Admin/Users] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
