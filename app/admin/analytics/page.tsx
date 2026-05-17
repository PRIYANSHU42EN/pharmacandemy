"use client";

import { useState, useEffect } from "react";
import { 
  Users, ShoppingBag, Zap, TrendingUp, 
  Search, BookOpen, Clock, BarChart3,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

export default function AdminAnalytics() {
  const [stats, setStats] = useState({
    activeUsers: 42,
    studyViews: 1250,
    marketplaceSales: 84,
    urgentDeals: 12,
    conversionRate: 18.5
  });

  useEffect(() => {
    // Subscribe to analytics_events real-time
    const channel = supabase
      .channel('live_analytics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analytics_events' }, (payload) => {
        // Increment stats dynamically
        const event = payload.new;
        if (event.category === 'study') {
          setStats(prev => ({ ...prev, studyViews: prev.studyViews + 1 }));
        } else if (event.category === 'marketplace' && event.event_type === 'purchase') {
          setStats(prev => ({ ...prev, marketplaceSales: prev.marketplaceSales + 1 }));
        } else if (event.category === 'urgent_work' && event.event_type === 'ticket_created') {
          setStats(prev => ({ ...prev, urgentDeals: prev.urgentDeals + 1 }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Live <span className="text-candy-rose">Operations</span>
          </h1>
          <p className="text-slate text-sm mt-1 font-medium italic">Instant ecosystem metrics powered by Supabase Realtime.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
          <Activity className="w-4 h-4 animate-pulse" />
          Live Pulse Active
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: "Active Now", value: stats.activeUsers, icon: Users, color: "rose" },
          { label: "Study Engagement", value: stats.studyViews, icon: BookOpen, color: "lavender" },
          { label: "Marketplace Sales", value: stats.marketplaceSales, icon: ShoppingBag, color: "mint" },
          { label: "Active Deals", value: stats.urgentDeals, icon: Zap, color: "peach" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-navy/5 shadow-xl shadow-navy/[0.02]">
            <div className={`w-14 h-14 rounded-2xl bg-badge-${stat.color}-bg flex items-center justify-center mb-6`}>
              <stat.icon className={`w-6 h-6 text-badge-${stat.color}-text`} />
            </div>
            <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h4 className="text-4xl font-black text-navy tracking-tight">{stat.value.toLocaleString()}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Study Hub Analytics */}
        <div className="bg-navy rounded-[40px] p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-candy-rose/10 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-candy-rose" />
              Study Hub Insights
            </h3>
            <div className="space-y-6">
              {[
                { label: "Pharmacology-I", views: 450, trend: "up" },
                { label: "Anatomy & Physiology", views: 320, trend: "up" },
                { label: "Pharmaceutics-II", views: 280, trend: "down" },
                { label: "Medicinal Chemistry", views: 200, trend: "up" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white/40">{item.views} Views</span>
                    {item.trend === "up" ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Marketplace Analytics */}
        <div className="bg-white rounded-[40px] p-10 border border-navy/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-candy-lavender/10 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-navy mb-8 flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-candy-rose" />
              Marketplace Performance
            </h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-navy/5 rounded-3xl">
                <p className="text-[10px] font-bold text-slate uppercase tracking-widest mb-2">Total Revenue</p>
                <h4 className="text-2xl font-black text-navy">₹42,850</h4>
              </div>
              <div className="p-6 bg-navy/5 rounded-3xl">
                <p className="text-[10px] font-bold text-slate uppercase tracking-widest mb-2">Conv. Rate</p>
                <h4 className="text-2xl font-black text-navy">{stats.conversionRate}%</h4>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate uppercase tracking-widest px-2">
                <span>Top Selling Assets</span>
                <span>Sales</span>
              </div>
              {[
                { title: "Pharmacology Complete Notes", sales: 24 },
                { title: "Medicinal Chem Template", sales: 18 },
                { title: "Sem-4 Presentation Kit", sales: 12 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border border-navy/5 rounded-2xl shadow-sm">
                  <span className="text-sm font-bold text-navy truncate max-w-[200px]">{item.title}</span>
                  <span className="text-sm font-black text-candy-rose">{item.sales}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
