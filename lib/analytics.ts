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

    this.batchTimeout = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => this.flush());
      } else {
        this.flush();
      }
    }, this.BATCH_DELAY);
  }

  private async flush() {
    if (this.queue.length === 0) {
      this.batchTimeout = null;
      return;
    }

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
          // Silent fail for token, send as guest
        }
      }

      await fetch("/api/analytics", {
        method: "POST",
        headers,
        body: JSON.stringify({ events }),
        // Use keepalive to ensure the request completes even if the page is closed
        keepalive: true,
      });
    } catch (err) {
      // Fail silently in production to avoid polluting console
    }
  }
}

export const analytics = new AnalyticsTracker();
