import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/api-middleware";
import logger from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const userId = (req as any).user.uid;

    const body = await req.json();
    const { ticketId, message, isAi } = body;

    // Verify ticket ownership (IDOR Prevention Check)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("urgent_work_tickets")
      .select("user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket || ticket.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized to message this ticket" }, { status: 403 });
    }

    // Insert message
    const { data, error } = await supabaseAdmin
      .from("urgent_work_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: isAi ? null : userId,
        message,
        is_ai: isAi
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error({ err: error.message }, "[Messages API] POST Error");
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    
    if (!ticketId) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });

    const userId = (req as any).user.uid;

    // Verify ticket ownership (IDOR Prevention Check)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("urgent_work_tickets")
      .select("user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket || ticket.user_id !== userId) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("urgent_work_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error({ err: error.message }, "[Messages API] GET Error");
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
});
