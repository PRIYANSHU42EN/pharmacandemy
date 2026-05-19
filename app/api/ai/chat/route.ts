import { NextRequest, NextResponse } from "next/server";
import { aiRouter } from "@/lib/ai/router";
import { STUDY_ASSISTANT_PROMPT, NEGOTIATOR_PROMPT } from "@/lib/ai/prompts";
import { AIContext } from "@/lib/ai/types";
import { withAuth } from "@/lib/api-middleware";
import { applyRateLimit } from "@/lib/rate-limit";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    // Apply rate-limiting (limit to 50 requests per minute per IP)
    const limitResponse = await applyRateLimit(req, { maxRequests: 50, windowMs: 60000 });
    if (limitResponse) return limitResponse;

    const { messages, pillar, preferredProvider } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const systemPrompt = pillar === 'study' ? STUDY_ASSISTANT_PROMPT : NEGOTIATOR_PROMPT;
    
    const context: AIContext = {
      pillar: pillar || 'study',
      fallbackEnabled: true,
      preferredProvider: preferredProvider
    };

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await aiRouter.chat(fullMessages as any, context);
    
    return NextResponse.json({ 
      text: response.text,
      provider: response.provider,
      model: response.model
    });

  } catch (error: any) {
    console.error("[AI Chat API] Global Error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
});

