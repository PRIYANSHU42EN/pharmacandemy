import { auth } from "@/lib/firebase/config";
import { UrgentWorkTicket, UrgentWorkMessage } from "@/types";


export class AIService {
  static async generateChatResponse(
    messages: { role: "user" | "assistant"; content: string }[],
    pillar: 'study' | 'negotiator' = 'study',
    preferredProvider?: string
  ) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages, pillar, preferredProvider }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to get AI response");
      }

      const data = await response.json();
      return data.text;
    } catch (error: any) {
      console.error("[AIService] Chat error:", error);
      throw error;
    }
  }




  static parseTicketData(text: string): Partial<UrgentWorkTicket> | null {
    const match = text.match(/<TICKET_DATA>([\s\S]*?)<\/TICKET_DATA>/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error("Failed to parse ticket data JSON", e);
      }
    }
    return null;
  }
}
