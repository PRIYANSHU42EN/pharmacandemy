"use client";

import Badge from "@/components/ui/Badge";

interface Event {
  id: string;
  event_type: string;
  metadata?: any;
  created_at: string;
  user_id?: string;
  userName?: string;
  userEmail?: string;
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
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
           <Badge variant="mint">Live Feed</Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[460px]">
         {loading ? (
           <div className="p-8 text-center opacity-50 text-[13px]">Initializing stream...</div>
         ) : events.length === 0 ? (
           <div className="p-8 text-center opacity-50 text-[13px]">Waiting for platform events...</div>
         ) : (
           <div className="divide-y divide-black/5">
              {events.map((event) => (
                <div key={event.id} className="p-4 flex items-start gap-4 hover:bg-black/[0.02] transition-colors">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0" style={{ 
                     background: event.event_type === 'login' ? 'rgba(247,223,197,0.3)' : 
                                 event.event_type === 'view' ? 'rgba(216,197,247,0.3)' : 
                                 'rgba(197,247,232,0.3)' 
                   }}>
                     {event.event_type === 'login' ? '🔑' : event.event_type === 'view' ? '📖' : '💎'}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-[13px] font-bold truncate" style={{ color: "var(--color-navy)" }}>
                           {event.userName || "Unknown User"}
                        </p>
                        <span className="text-[10px] opacity-40 font-medium shrink-0">
                           {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[12px] opacity-70 leading-relaxed">
                         {event.event_type === 'login' ? 'Logged into the platform' : 
                          event.event_type === 'view' ? (
                            <>Opened <span className="font-semibold">{event.metadata?.title || 'a resource'}</span></>
                          ) : 
                          'Completed a payment'}
                      </p>
                      {event.userEmail && (
                        <p className="text-[10px] opacity-40 mt-1 truncate italic">
                          {event.userEmail}
                        </p>
                      )}
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
}

