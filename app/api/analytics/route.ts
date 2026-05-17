import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyFirebaseToken } from "@/lib/auth-utils";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // 1. Optional Authentication (Strictly enforced if present)
    const decodedToken = await verifyFirebaseToken(request);
    const verifiedUid = decodedToken?.uid || null;

    const body = await request.json();
    const { events } = body; 

    if (!supabaseAdmin) {
      logger.error("[API/Analytics] Supabase Admin not initialized");
      return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    const eventsToInsert = (Array.isArray(events) ? events : [body]).filter(e => e && (e.eventType || e.event_type || e.event_name));

    if (eventsToInsert.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error } = await supabaseAdmin
      .from('analytics_events')
      .insert(eventsToInsert.map(event => ({
        user_id: verifiedUid, 
        event_type: event.eventType || event.event_type || event.event_name,
        resource_id: event.resourceId || event.resource_id || null,
        metadata: {
          ...(event.metadata || {}),
          client_reported_uid: event.userId || event.user_id || null
        },
        created_at: event.createdAt || event.created_at || new Date().toISOString()
      })));

    if (error) {
      logger.error({ error, eventsCount: eventsToInsert.length }, "[API/Analytics] Database Insert Error");
      // Return 200 even on insert failure to prevent client-side noise
      return NextResponse.json({ success: false }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error.message }, "[API/Analytics] Internal Error");
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
