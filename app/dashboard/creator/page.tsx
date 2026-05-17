"use client";

import { useState, useEffect } from "react";
import { 
  Package, DollarSign, TrendingUp, BarChart3, 
  Upload, Edit2, Trash2, Eye, Plus, Search,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    activeListings: 0,
    avgRating: 4.8
  });
  const [myPpts, setMyPpts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchCreatorData() {
      setLoading(true);
      if (!user?.uid) return;
      // Fetch Creator Profile
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.uid)
        .single();

      if (profile) {
        setStats({
          totalSales: profile.total_sales,
          totalRevenue: profile.total_revenue / 100,
          activeListings: 0, // Will update after fetching ppts
          avgRating: Number(profile.rating)
        });

        // Fetch My PPTs
        const { data: ppts } = await supabase
          .from('ppt_marketplace')
          .select('*')
          .eq('creator_id', profile.id)
          .order('created_at', { ascending: false });
        
        if (ppts) {
          setMyPpts(ppts);
          setStats(prev => ({ ...prev, activeListings: ppts.filter(p => p.is_active).length }));
        }
      }
      setLoading(false);
    }

    fetchCreatorData();
  }, [user]);

  return (
    <div className="min-h-screen bg-cream/30 p-8 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-navy tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Creator <span className="text-candy-rose">Studio</span>
            </h1>
            <p className="text-slate text-sm mt-1 font-medium">Manage your academic assets and track your impact.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/marketplace/upload"
              className="btn btn-primary px-8 py-4 shadow-2xl shadow-navy/20 flex items-center gap-3 group"
            >
              <Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
              Upload New PPT
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {[
            { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "rose", trend: "+12%" },
            { label: "Total Sales", value: stats.totalSales, icon: BarChart3, color: "lavender", trend: "+5%" },
            { label: "Active Listings", value: stats.activeListings, icon: Package, color: "mint", trend: "Stable" },
            { label: "Avg Rating", value: stats.avgRating, icon: TrendingUp, color: "peach", trend: "High" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] border border-navy/5 shadow-xl shadow-navy/[0.02] relative overflow-hidden group">
              <div className={cn(
                "absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20 -mr-10 -mt-10 transition-all group-hover:scale-150",
                `bg-badge-${stat.color}-bg`
              )} />
              <div className={`w-14 h-14 rounded-2xl bg-badge-${stat.color}-bg flex items-center justify-center mb-6 shadow-inner`}>
                <stat.icon className={`w-6 h-6 text-badge-${stat.color}-text`} />
              </div>
              <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <div className="flex items-end justify-between">
                <h4 className="text-3xl font-black text-navy">{stat.value}</h4>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* My Assets */}
        <div className="bg-white rounded-[40px] border border-navy/5 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-navy/5 flex items-center justify-between bg-navy/[0.01]">
            <h3 className="text-xl font-bold text-navy">My Presentations</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate" />
              <input 
                type="text" 
                placeholder="Search my assets..." 
                className="bg-navy/5 border-none rounded-2xl py-3 pl-11 pr-4 text-sm w-64 focus:ring-2 focus:ring-navy/5"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate">
                  <th className="p-8">Presentation</th>
                  <th className="p-8">Price</th>
                  <th className="p-8">Sales</th>
                  <th className="p-8">Status</th>
                  <th className="p-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                       <Loader2 className="w-10 h-10 text-candy-rose animate-spin mx-auto mb-4" />
                       <p className="text-xs text-slate font-bold uppercase tracking-widest">Fetching Studio Data...</p>
                    </td>
                  </tr>
                ) : myPpts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-24 text-center">
                       <div className="w-20 h-20 bg-navy/5 rounded-full flex items-center justify-center mx-auto mb-6">
                         <Plus className="w-10 h-10 text-slate/20" />
                       </div>
                       <h4 className="text-xl font-bold text-navy mb-2">No listings yet</h4>
                       <p className="text-sm text-slate mb-8">Start your creator journey by uploading your first PPT.</p>
                       <Link href="/marketplace/upload" className="btn btn-ghost border-dashed border-navy/20 text-navy hover:border-navy">
                         Upload Now
                       </Link>
                    </td>
                  </tr>
                ) : myPpts.map((ppt) => (
                  <tr key={ppt.id} className="group hover:bg-navy/[0.01] transition-colors">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 rounded-xl bg-navy/10 overflow-hidden relative border border-navy/5 shadow-sm">
                          {ppt.thumbnail_url ? (
                            <img src={ppt.thumbnail_url} alt="" className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-navy/20">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-navy">{ppt.title}</p>
                          <p className="text-[10px] text-slate font-medium mt-0.5">{ppt.category} • Sem {ppt.semester}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <p className="text-sm font-bold text-navy">₹{(ppt.price / 100).toLocaleString()}</p>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-navy">{ppt.download_count || 0}</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      </div>
                    </td>
                    <td className="p-8">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        ppt.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      )}>
                        {ppt.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="p-3 bg-white border border-navy/5 rounded-xl text-slate hover:text-navy hover:shadow-lg transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-3 bg-white border border-navy/5 rounded-xl text-slate hover:text-navy hover:shadow-lg transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-3 bg-white border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
