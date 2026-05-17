import { supabase } from "@/lib/supabase/client";

export type AnalyticsCategory = 'study' | 'marketplace' | 'urgent_work';

export class AnalyticsService {
  static async trackEvent(
    eventType: string, 
    category: AnalyticsCategory, 
    metadata: any = {}, 
    userId?: string
  ) {
    try {
      const { error } = await supabase.from('analytics_events').insert({
        event_type: eventType,
        category,
        user_id: userId,
        metadata,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // Real-time broadcast for live dashboards (optional if Supabase Realtime is enabled on table)
      console.log(`[Analytics] Tracked: ${eventType} in ${category}`);
    } catch (e) {
      console.error("[Analytics] Tracking failed:", e);
    }
  }

  // Helper for Study Hub
  static trackPageView(path: string, userId?: string) {
    this.trackEvent('page_view', 'study', { path }, userId);
  }

  // Helper for Marketplace
  static trackPurchase(pptId: string, amount: number, userId: string) {
    this.trackEvent('purchase', 'marketplace', { pptId, amount }, userId);
  }

  // Helper for Urgent Work
  static trackTicketCreation(ticketId: string, userId: string) {
    this.trackEvent('ticket_created', 'urgent_work', { ticketId }, userId);
  }
}
