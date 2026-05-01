"use client";

import Badge from "@/components/ui/Badge";

interface Event {
  id: string;
  event_type: string;
  metadata?: any;
  created_at: string;
  user_id?: string;
}

interface ActivityFeedProps {
  events: Event[];
  loading: boolean;
}

export default function ActivityFeed({ events, loading }: ActivityFeedProps) {
  return (
    <div
      className="lg:col-span-2 rounded-xl overflow-hidden flex flex-col"
      style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}
    >
      <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white/50">
        <h2 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Real-time Activity
        </h2>
        <Badge variant="mint">Live</Badge>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[400px]">
         {loading ? (
           <div className="p-8 text-center opacity-50 text-[13px]">Initializing stream...</div>
         ) : events.length === 0 ? (
           <div className="p-8 text-center opacity-50 text-[13px]">Waiting for platform events...</div>
         ) : (
           <div className="divide-y divide-black/5">
              {events.map((event) => (
                <div key={event.id} className="p-4 flex items-center gap-4 hover:bg-black/[0.02] transition-colors">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px]" style={{ 
                     background: event.event_type === 'login' ? 'rgba(247,223,197,0.2)' : 
                                 event.event_type === 'view' ? 'rgba(216,197,247,0.2)' : 
                                 'rgba(197,247,232,0.2)' 
                   }}>
                     {event.event_type === 'login' ? '🔑' : event.event_type === 'view' ? '👁️' : '💰'}
                   </div>
                   <div className="flex-1">
                      <p className="text-[13px] font-medium">
                         {event.event_type === 'login' ? 'User logged in' : 
                          event.event_type === 'view' ? `Viewed: ${event.metadata?.title || 'Resource'}` : 
                          'Payment success'}
                      </p>
                      <p className="text-[11px] opacity-50 font-mono">
                         {new Date(event.created_at).toLocaleTimeString()} • {event.user_id?.substring(0, 8)}...
                      </p>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
}
