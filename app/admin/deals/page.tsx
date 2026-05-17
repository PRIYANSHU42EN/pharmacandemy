"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, User, Clock, AlertCircle, 
  CheckCircle2, DollarSign, ArrowRight,
  TrendingUp, Zap, Filter, Search, MoreHorizontal,
  BrainCircuit, ExternalLink, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

export default function AdminDealRoom() {
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial deals
  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('urgent_work_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setDeals(data);
      setLoading(false);
    };
    fetchDeals();

    // Subscribe to realtime updates for tickets
    const ticketsChannel = supabase
      .channel('urgent_tickets_changes_admin')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'urgent_work_tickets' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDeals(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDeals(prev => prev.map(d => d.id === payload.new.id ? payload.new : d));
            if (selectedDeal?.id === payload.new.id) setSelectedDeal(payload.new);
          } else if (payload.eventType === 'DELETE') {
            setDeals(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, []);

  // Fetch messages for selected deal
  useEffect(() => {
    if (!selectedDeal) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('urgent_work_messages')
        .select('*')
        .eq('ticket_id', selectedDeal.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    // Subscribe to realtime messages for THIS deal
    const messagesChannel = supabase
      .channel(`deal_messages_${selectedDeal.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'urgent_work_messages', filter: `ticket_id=eq.${selectedDeal.id}` }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedDeal]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-rose-200 text-rose-700 border-rose-300';
      case 'high': return 'bg-amber-200 text-amber-700 border-amber-300';
      default: return 'bg-navy/10 text-navy border-navy/20';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-navy tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Deal Room <span className="text-candy-rose">HQ</span>
          </h1>
          <p className="text-slate text-sm mt-1 font-medium italic">Command center for AI-negotiated academic contracts.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-[20px] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm">
            <Zap className="w-4 h-4" />
            {deals.filter(d => d.urgency_level === 'emergency').length} Critical Leads
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12 h-[750px]">
        {/* Leads Sidebar */}
        <div className="lg:col-span-1 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Live Leads</h3>
            <span className="bg-navy text-candy-rose px-2.5 py-1 rounded-full text-[10px] font-bold">
              {deals.length} Active
            </span>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-3 scrollbar-thin">
            {loading ? (
               <div className="flex flex-col items-center justify-center py-20">
                 <Loader2 className="w-8 h-8 text-candy-rose animate-spin mb-4" />
                 <p className="text-xs text-slate font-bold uppercase">Scanning DB...</p>
               </div>
            ) : deals.length === 0 ? (
              <div className="p-16 text-center bg-white/40 backdrop-blur-md rounded-[32px] border border-dashed border-navy/10 text-slate">
                <p className="text-sm font-bold opacity-40">No incoming deals.</p>
              </div>
            ) : deals.map((deal) => (
              <div 
                key={deal.id}
                onClick={() => setSelectedDeal(deal)}
                className={cn(
                  "group cursor-pointer p-6 rounded-[32px] border transition-all duration-300",
                  selectedDeal?.id === deal.id 
                    ? "bg-navy text-white border-navy shadow-[0_20px_40px_rgba(26,31,60,0.3)] scale-[1.02]" 
                    : deal.urgency_level === "emergency" 
                      ? "bg-rose-50 border-rose-100 hover:bg-rose-100" 
                      : "bg-white border-navy/5 shadow-sm hover:border-navy/20"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.2em]",
                    selectedDeal?.id === deal.id ? "text-candy-rose" : "text-slate/60"
                  )}>
                    {deal.id.slice(0, 8)}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest",
                    getUrgencyColor(deal.urgency_level)
                  )}>
                    {deal.urgency_level}
                  </span>
                </div>
                
                <h4 className="text-base font-bold mb-1 line-clamp-1 leading-tight">{deal.topic}</h4>
                <p className={cn(
                  "text-xs font-bold flex items-center gap-1.5 mb-5",
                  selectedDeal?.id === deal.id ? "text-white/40" : "text-slate/60"
                )}>
                  <User className="w-3.5 h-3.5" /> {deal.subject}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center",
                      selectedDeal?.id === deal.id ? "bg-white/10 text-candy-rose" : "bg-navy/5 text-navy"
                    )}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{deal.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-candy-rose">₹{deal.budget_expectation || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-2 flex flex-col h-full">
          {!selectedDeal ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md border border-dashed border-navy/10 rounded-[40px] p-20 text-center">
              <div className="w-24 h-24 rounded-[32px] bg-navy/5 flex items-center justify-center mb-8 shadow-inner">
                <BrainCircuit className="w-12 h-12 text-navy/10" />
              </div>
              <h3 className="text-xl font-bold text-navy mb-2">Lead Selection Required</h3>
              <p className="text-sm text-slate max-w-xs font-medium">Select an incoming lead to view the negotiation history and AI analysis.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[40px] border border-navy/5 shadow-2xl overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="p-8 bg-navy text-white flex items-center justify-between shadow-lg">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-2xl font-bold font-display text-candy-rose">{selectedDeal.topic}</h2>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-white/10",
                      getUrgencyColor(selectedDeal.urgency_level)
                    )}>
                      {selectedDeal.urgency_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-5 text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> ID: {selectedDeal.user_id?.slice(0, 12)}</span>
                    <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Due: {selectedDeal.deadline || "TBD"}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mb-1">Target Budget</p>
                  <p className="text-4xl font-black text-candy-rose">₹{selectedDeal.budget_expectation}</p>
                </div>
              </div>

              {/* AI Insight */}
              <div className="px-8 py-5 bg-candy-rose/5 border-b border-navy/5 flex gap-5 items-center">
                <div className="w-12 h-12 rounded-2xl bg-navy text-candy-rose flex items-center justify-center shrink-0 shadow-lg">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-navy uppercase tracking-[0.2em] mb-1">AI Intelligence Summary</h4>
                  <p className="text-sm text-slate font-medium italic">
                    "{selectedDeal.ai_summary || "Negotiation in progress. Lead shows high intent based on urgency."}"
                  </p>
                </div>
              </div>

              {/* Chat View */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-cream/20 scrollbar-thin">
                {messages.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 text-navy/10 animate-spin mb-4" />
                    <p className="text-[10px] font-bold text-slate/40 uppercase tracking-[0.3em]">Establishing Connection...</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2",
                      msg.is_ai ? "mr-auto" : "ml-auto flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md",
                      msg.is_ai ? "bg-navy text-candy-rose" : "bg-candy-rose text-navy"
                    )}>
                      {msg.is_ai ? <BrainCircuit className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className={cn(
                      "p-5 rounded-[24px] text-sm font-medium shadow-sm",
                      msg.is_ai 
                        ? "bg-white text-navy border border-navy/5 rounded-tl-none" 
                        : "bg-candy-rose text-navy rounded-tr-none"
                    )}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-8 bg-white border-t border-navy/5 flex items-center gap-6">
                <div className="flex-1">
                   <div className="flex items-center gap-3 text-[10px] text-slate font-bold uppercase tracking-widest opacity-50">
                     <AlertCircle className="w-3.5 h-3.5" />
                     Negotiation managed by Cube AI
                   </div>
                </div>
                <div className="flex gap-4">
                  <button className="btn btn-ghost px-8 py-4 text-xs font-bold border-dashed border-navy/20 hover:border-navy/40">
                    Edit Ticket
                  </button>
                  <button 
                    className={cn(
                      "btn px-10 py-4 font-black text-xs shadow-2xl transition-all uppercase tracking-widest",
                      selectedDeal.status === 'paid' ? "bg-emerald-600 text-white" : "bg-navy text-candy-rose hover:scale-105 active:scale-95"
                    )}
                    disabled={selectedDeal.status === 'paid'}
                  >
                    {selectedDeal.status === 'paid' ? "Payment Verified" : "Generate Invoice"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Footer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        {[
          { label: "Pipeline Value", value: `₹${deals.reduce((acc, d) => acc + (d.budget_expectation || 0), 0)}`, icon: TrendingUp, color: "rose" },
          { label: "Emergency Ratio", value: `${Math.round((deals.filter(d => d.urgency_level === 'emergency').length / (deals.length || 1)) * 100)}%`, icon: Zap, color: "lavender" },
          { label: "Avg Response", value: "2.4m", icon: Clock, color: "mint" },
          { label: "Conversion", value: "24.5%", icon: DollarSign, color: "peach" }
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-md p-8 rounded-[32px] border border-white shadow-xl flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl bg-navy flex items-center justify-center shadow-lg`}>
              <stat.icon className={`w-6 h-6 text-candy-rose`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate/60 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <h4 className="text-2xl font-black text-navy">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
