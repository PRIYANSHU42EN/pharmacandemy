"use client";

import { auth } from "@/lib/firebase/config";

interface AnalyticsEvent {
  eventType: 'view' | 'login' | 'payment' | 'search' | 'nav' | 'pdf_page_view' | 'pdf_session_end';
  resourceId?: string;
  metadata?: Record<string, any>;
}

class AnalyticsTracker {
  private queue: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 2000; // 2 seconds

  async track(event: AnalyticsEvent) {
    const userId = auth.currentUser?.uid || null;
    
    const payload = {
      ...event,
      userId,
      createdAt: new Date().toISOString()
    };

    this.queue.push(payload);
    this.scheduleBatch();
  }

  private scheduleBatch() {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(async () => {
      await this.flush();
    }, this.BATCH_DELAY);
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];
    this.batchTimeout = null;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      
      // Get Firebase ID Token if user is logged in
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (tokenErr) {
          console.warn("[Analytics] Token fetch failed, sending as guest:", tokenErr);
        }
      }

      await fetch("/api/analytics", {
        method: "POST",
        headers,
        body: JSON.stringify({ events })
      });
    } catch (err) {
      console.error("[Analytics] Failed to flush events:", err);
    }
  }
}

export const analytics = new AnalyticsTracker();
