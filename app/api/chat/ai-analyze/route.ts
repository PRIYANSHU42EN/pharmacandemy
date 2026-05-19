import { NextRequest, NextResponse } from "next/server";
import { aiRouter } from "@/lib/ai/router";
import { NEGOTIATION_EXTRACTOR_PROMPT } from "@/lib/ai/prompts";
import { chatSupabaseAdmin } from "@/lib/supabase/chatAdmin";
import { withAuth } from "@/lib/api-middleware";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { messages, roomId } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages to analyze" }, { status: 400 });
    }

    const user = (req as any).user;
    if (!user || !user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.uid;
    const userEmail = user.email;
    let existingRoom: any = null;

    // 1. Authorization check before performing AI call (Direct Object Reference Protection)
    if (roomId && chatSupabaseAdmin) {
      const { data: room, error: roomError } = await chatSupabaseAdmin
        .from("chat_rooms")
        .select("participant_ids, metadata")
        .eq("room_id", roomId)
        .single();

      if (roomError || !room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }

      existingRoom = room;

      // Check admin status or participant status
      const { data: userProfile } = await chatSupabaseAdmin
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      const isAdmin = userProfile?.role === "admin" || userProfile?.role === "super-admin" || userEmail === "smashgaming5488@gmail.com";
      const isParticipant = room.participant_ids?.includes(userId);

      if (!isAdmin && !isParticipant) {
        return NextResponse.json({ error: "Forbidden: You are not a participant in this room" }, { status: 403 });
      }
    }

    // Format messages for AI
    const aiMessages = [
      { role: "system", content: NEGOTIATION_EXTRACTOR_PROMPT },
      ...messages.map((m: any) => ({
        role: m.role || (m.clientId === "admin" ? "assistant" : "user"),
        content: m.text || m.content
      }))
    ];

    const response = await aiRouter.chat(aiMessages as any, {
      pillar: "negotiator",
      fallbackEnabled: true
    });

    // Parse JSON response
    try {
      const jsonStr = response.text.match(/\{[\s\S]*\}/)?.[0] || response.text;
      const data = JSON.parse(jsonStr);
      
      if (roomId && chatSupabaseAdmin && existingRoom) {
        await chatSupabaseAdmin
          .from("chat_rooms")
          .update({
            metadata: {
              ...existingRoom.metadata,
              aiData: data
            }
          })
          .eq("room_id", roomId);
      }

      return NextResponse.json(data);
    } catch (e) {
      console.error("[AI Analyze Error]: Failed to parse AI JSON response", e);
      return NextResponse.json({ error: "Failed to process AI analysis" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[AI Analyze Error]:", error);
    return NextResponse.json({ error: "Failed to analyze conversation" }, { status: 500 });
  }
});

