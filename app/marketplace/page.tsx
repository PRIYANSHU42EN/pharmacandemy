"use client";

import { useState, useEffect } from "react";
import PPTCard from "@/components/marketplace/PPTCard";
import { Search, SlidersHorizontal, Loader2, Sparkles, LayoutGrid } from "lucide-react";
import { PPTListing, PPTCategory } from "@/types";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

export default function MarketplacePage() {
  const [ppts, setPpts] = useState<PPTListing[]>([]);
  const [categories, setCategories] = useState<PPTCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 1. Fetch Categories
        const { data: catData } = await supabase
          .from('ppt_categories')
          .select('*')
          .order('name');
        
        if (catData) setCategories(catData);

        // 2. Fetch PPTs with joins
        let query = supabase
          .from('ppt_marketplace')
          .select(`
            *,
            category:ppt_categories(*),
            creator:creator_profiles(*)
          `)
          .eq('is_active', true)
          .eq('moderation_status', 'approved');

        if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
        else if (sortBy === 'popular') query = query.order('download_count', { ascending: false });
        else if (sortBy === 'rated') query = query.order('rating', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        setPpts(data as any[]);
      } catch (error) {
        // console.("Failed to fetch Marketplace data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('universal_marketplace')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ppt_marketplace' }, () => {
        fetchData(); // Simplest way to keep joins in sync
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

  const filteredPpts = ppts.filter((ppt) => {
    const matchesSearch = 
      ppt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ppt.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ppt.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategoryId === "all" || ppt.category_id === selectedCategoryId;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      {/* Universal Marketplace Hero */}
      <section className="relative py-28 bg-[#0F172A] overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>
        
        <div className="container-main relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
            <Sparkles className="w-3 h-3" />
            The Universal Presentation Engine
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tight">
            Design <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Different.</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-xl leading-relaxed mb-12">
            The world's first decentralized marketplace for high-impact academic presentations. 
            From Quantum Physics to Digital Marketing—unlocked for everyone.
          </p>

          {/* Advanced Search */}
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="w-6 h-6 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by topic, field, or creator..."
              className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-xl shadow-2xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Navigation & Filters */}
      <main className="container-main py-16">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar: Categories */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="sticky top-28 space-y-8">
              <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Categories</h3>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategoryId("all")}
                    className={cn(
                      "w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all",
                      selectedCategoryId === "all" 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    All Disciplines
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all",
                        selectedCategoryId === cat.id 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Explore Presentations</h2>
                <p className="text-slate-500 font-medium">
                  Showing <span className="text-blue-600 font-bold">{filteredPpts.length}</span> curated assets
                </p>
              </div>
              
              <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 px-4 border-r border-slate-100">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sort By</span>
                </div>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer pr-4"
                >
                  <option value="newest">Latest Arrivals</option>
                  <option value="popular">Most Downloaded</option>
                  <option value="rated">Highest Rated</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs animate-pulse">Syncing Marketplace...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {filteredPpts.map((ppt, index) => (
                    <PPTCard key={ppt.id} ppt={ppt} priority={index < 3} />
                  ))}
                </div>

                {filteredPpts.length === 0 && (
                  <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 mt-4">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Search className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">No presentations found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium mb-8">
                      We couldn't find anything matching your search. Try adjusting your filters or categories.
                    </p>
                    <button 
                      onClick={() => { setSelectedCategoryId("all"); setSearchQuery(""); }}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
