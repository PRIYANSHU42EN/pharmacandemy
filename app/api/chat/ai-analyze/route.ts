import { NextRequest, NextResponse } from "next/server";
import { aiRouter } from "@/lib/ai/router";
import { NEGOTIATION_EXTRACTOR_PROMPT } from "@/lib/ai/prompts";
import { adminAuth } from "@/lib/firebase/admin";
import { chatSupabaseAdmin } from "@/lib/supabase/chatAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, roomId } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages to analyze" }, { status: 400 });
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
      
      if (roomId && chatSupabaseAdmin) {
        const { data: room } = await chatSupabaseAdmin
          .from("chat_rooms")
          .select("metadata")
          .eq("room_id", roomId)
          .single();
        
        if (room) {
          await chatSupabaseAdmin
            .from("chat_rooms")
            .update({
              metadata: {
                ...room.metadata,
                aiData: data
              }
            })
            .eq("room_id", roomId);
        }
      }

      return NextResponse.json(data);
    } catch (e) {
      console.error("[AI Analyze Error]: Failed to parse AI JSON response");
      return NextResponse.json({ error: "Failed to process AI analysis" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[AI Analyze Error]:", error);
    return NextResponse.json({ error: "Failed to analyze conversation" }, { status: 500 });
  }
}
