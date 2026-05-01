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
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events })
      });
    } catch (err) {
      console.error("[Analytics] Failed to flush events:", err);
      // Re-queue if failed? For now, just log.
    }
  }
}

export const analytics = new AnalyticsTracker();
