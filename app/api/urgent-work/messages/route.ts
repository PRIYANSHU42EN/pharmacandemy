import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await req.json();
    const { ticketId, message, isAi } = body;

    // Verify ticket ownership
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("urgent_work_tickets")
      .select("user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || ticket.user_id !== userId) {
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
    console.error("[Messages API] Error:", error.message);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function GET(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const ticketId = searchParams.get("ticketId");
      
      if (!ticketId) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });

      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Verify ticket ownership
      const { data: ticket } = await supabaseAdmin
        .from("urgent_work_tickets")
        .select("user_id")
        .eq("id", ticketId)
        .single();

      if (!ticket || ticket.user_id !== userId) {
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
      console.error("[Messages API] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}
