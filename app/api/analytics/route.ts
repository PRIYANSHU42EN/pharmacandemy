import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { events } = body; // Support batching

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
        user_id: event.userId || event.user_id || null,
        event_type: event.eventType || event.event_type || event.event_name,
        resource_id: event.resourceId || event.resource_id || null,
        metadata: event.metadata || {},
        created_at: event.createdAt || event.created_at || new Date().toISOString()
      })));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API/Analytics] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
