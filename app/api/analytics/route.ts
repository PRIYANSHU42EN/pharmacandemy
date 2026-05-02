import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyFirebaseToken } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    // 1. Optional Authentication (Strictly enforced if present)
    const decodedToken = await verifyFirebaseToken(request);
    const verifiedUid = decodedToken?.uid || null;

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
