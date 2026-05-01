import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // 1. Optional Authentication (Strictly enforced if present)
    const authHeader = request.headers.get("Authorization");
    let verifiedUid: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        verifiedUid = decodedToken.uid;
      } catch (err) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { events } = body; 

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const eventsToInsert = (Array.isArray(events) ? events : [body]).filter(e => e && (e.eventType || e.event_type || e.event_name));

    if (eventsToInsert.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error } = await supabaseAdmin
      .from('analytics_events')
      .insert(eventsToInsert.map(event => ({
        // Security Rule: If authenticated, use verified UID. If guest, force NULL.
        user_id: verifiedUid, 
        event_type: event.eventType || event.event_type || event.event_name,
        resource_id: event.resourceId || event.resource_id || null,
        metadata: {
          ...(event.metadata || {}),
          client_reported_uid: event.userId || event.user_id || null // Keep for debugging if needed
        },
        created_at: event.createdAt || event.created_at || new Date().toISOString()
      })));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API/Analytics] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
