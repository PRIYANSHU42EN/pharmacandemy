"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, MoreVertical, Edit2, Trash2, 
  Download, Eye, BarChart3, TrendingUp, Package,
  X, Check, AlertCircle, ShieldCheck, UserCheck, LayoutGrid, Tag, Star, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

export default function AdminMarketplace() {
  const [ppts, setPpts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    pendingModeration: 0
  });
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPpt, setEditingPpt] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // File states
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [fullFile, setFullFile] = useState<File | null>(null);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Categories
      const { data: catData } = await supabase.from('ppt_categories').select('*').order('name');
      if (catData) setCategories(catData);

      // 2. Fetch Creators
      const { data: creatorData } = await supabase.from('creator_profiles').select('*').order('display_name');
      if (creatorData) setCreators(creatorData);

      // 3. Fetch PPTs with joins
      const { data: pptsData } = await supabase
        .from('ppt_marketplace')
        .select('*, category:ppt_categories(*), creator:creator_profiles(*)')
        .order('created_at', { ascending: false });
      
      if (pptsData) {
        setPpts(pptsData);
        setStats(prev => ({
          ...prev,
          pendingModeration: pptsData.filter(p => p.moderation_status === 'pending').length
        }));
      }

      // 4. Fetch Sales Stats
      const { data: purchases } = await supabase
        .from('ppt_purchases')
        .select('amount');
      
      if (purchases) {
        const totalRev = purchases.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        setStats(prev => ({
          ...prev,
          totalSales: purchases.length,
          totalRevenue: totalRev / 100
        }));
      }
    };
    fetchData();

    const channel = supabase
      .channel('admin_marketplace_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ppt_marketplace' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ppt_assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('ppt_assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      let thumbnailUrl = editingPpt?.thumbnail_url || "";
      let sampleUrl = editingPpt?.sample_file_url || "";
      let fullUrl = editingPpt?.full_file_url || "";
      let previewUrls = editingPpt?.preview_images || [];

      if (thumbnailFile) {
        thumbnailUrl = await uploadFile(thumbnailFile, "thumbnails");
      } else if (formData.get('thumbnail_url_manual')) {
        thumbnailUrl = formData.get('thumbnail_url_manual') as string;
      }

      if (sampleFile) {
        sampleUrl = await uploadFile(sampleFile, "samples");
      } else if (formData.get('sample_url_manual')) {
        sampleUrl = formData.get('sample_url_manual') as string;
      }

      if (fullFile) {
        fullUrl = await uploadFile(fullFile, "full_assets");
      } else if (formData.get('full_url_manual')) {
        fullUrl = formData.get('full_url_manual') as string;
      }
      if (previewFiles.length > 0) {
        const newPreviewUrls = await Promise.all(previewFiles.map(file => uploadFile(file, "previews")));
        previewUrls = [...previewUrls, ...newPreviewUrls];
      }

      const pptData = {
        title: formData.get('title'),
        category_id: formData.get('category_id'),
        topic: formData.get('topic'),
        creator_id: formData.get('creator_id'),
        price: parseInt(formData.get('price') as string) || 0,
        description: formData.get('description'),
        thumbnail_url: thumbnailUrl,
        sample_file_url: sampleUrl,
        full_file_url: fullUrl,
        preview_images: previewUrls.length > 0 ? previewUrls : [thumbnailUrl],
        tags: (formData.get('tags') as string || "").split(',').map(t => t.trim()).filter(t => t),
        moderation_status: formData.get('moderation_status'),
        is_featured: formData.get('is_featured') === 'true',
        is_active: formData.get('is_active') === 'true',
      };

      const { auth: firebaseAuth } = await import("@/lib/firebase/config");
      const idToken = await firebaseAuth.currentUser?.getIdToken();
      
      const response = await fetch("/api/admin/marketplace", {
        method: editingPpt ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(editingPpt ? { id: editingPpt.id, updates: pptData } : pptData)
      });

      if (!response.ok) throw new Error("Failed to save asset");
      
      toast.success(editingPpt ? "Asset updated" : "Asset created");
      setIsModalOpen(false);
      setEditingPpt(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanent delete?")) return;
    try {
      const { auth: firebaseAuth } = await import("@/lib/firebase/config");
      const idToken = await firebaseAuth.currentUser?.getIdToken();
      await fetch(`/api/admin/marketplace?id=${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredPpts = ppts.filter(ppt => {
    const matchesSearch = ppt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ppt.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || 
                       (activeTab === "pending" && ppt.moderation_status === 'pending') || 
                       (activeTab === "featured" && ppt.is_featured);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="p-10 max-w-[1600px] mx-auto min-h-screen bg-[#F8FAFC]">
      
      {/* Header Area */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-12 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
               <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Marketplace Control</h1>
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] ml-1">Universal Asset Management & Moderation</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
            <input 
              type="text"
              placeholder="Filter by title, topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-200 rounded-[1.25rem] py-4 pl-14 pr-6 text-sm w-80 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => { setEditingPpt(null); setIsModalOpen(true); }}
            className="px-8 py-4 bg-slate-900 text-white rounded-[1.25rem] font-bold text-sm shadow-xl shadow-slate-900/10 flex items-center gap-3 hover:-translate-y-1 transition-all"
          >
            <Plus className="w-5 h-5" />
            Register Asset
          </button>
        </div>
      </div>

      {/* Modern Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        {[
          { label: "Platform Assets", value: ppts.length, icon: Package, color: "blue" },
          { label: "Pending Review", value: stats.pendingModeration, icon: AlertCircle, color: "orange" },
          { label: "Total Transactions", value: stats.totalSales, icon: Zap, color: "purple" },
          { label: "Platform Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "emerald" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-${stat.color}-500/10 transition-all`} />
            <div className="flex items-center gap-4 mb-4">
               <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
            <h4 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
          </div>
        ))}
      </div>

      {/* Tabs & Table Container */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-2">
          {["all", "pending", "featured"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="p-8">Visual Asset</th>
                <th className="p-8">Context</th>
                <th className="p-8">Commercials</th>
                <th className="p-8">Status</th>
                <th className="p-8 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPpts.map((ppt) => (
                <tr key={ppt.id} className="group hover:bg-blue-50/30 transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-14 rounded-2xl bg-slate-100 overflow-hidden relative shadow-sm border border-slate-200">
                        {ppt.thumbnail_url ? (
                          <img src={ppt.thumbnail_url} alt="" className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 mb-1 leading-none">{ppt.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-2">
                           <UserCheck className="w-3 h-3" />
                           {ppt.creator?.display_name || "Internal Admin"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="space-y-2">
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                          <LayoutGrid className="w-3 h-3" />
                          {ppt.category?.name || "General"}
                       </span>
                       <p className="text-xs font-bold text-slate-500 truncate max-w-[200px]">{ppt.topic}</p>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="space-y-1">
                       <p className="text-lg font-black text-slate-900 leading-none">₹{(ppt.price / 100).toFixed(0)}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">{ppt.download_count} Conversions</p>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                      ppt.moderation_status === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                      ppt.moderation_status === 'pending' ? "bg-orange-50 text-orange-600" : "bg-rose-50 text-rose-600"
                    )}>
                       <div className={cn("w-2 h-2 rounded-full", 
                          ppt.moderation_status === 'approved' ? "bg-emerald-500" : 
                          ppt.moderation_status === 'pending' ? "bg-orange-500" : "bg-rose-500"
                       )} />
                       {ppt.moderation_status}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => { setEditingPpt(ppt); setIsModalOpen(true); }}
                        className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(ppt.id)}
                        className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-10 border-b border-slate-50 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight mb-1">
                  {editingPpt ? "Update Visual Identity" : "New Market Entry"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Asset Registration System</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Presentation Title</label>
                  <input name="title" defaultValue={editingPpt?.title} required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Modern Physics V2..." />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Category</label>
                  <select name="category_id" defaultValue={editingPpt?.category_id} required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all">
                    {categories.length > 0 ? (
                      categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    ) : (
                      <option value="">Run MARKETPLACE_FIX.sql to see categories</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Creator</label>
                  <select name="creator_id" defaultValue={editingPpt?.creator_id} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all">
                    <option value="">Platform Internal</option>
                    {creators.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Topic/Subtitle</label>
                  <input name="topic" defaultValue={editingPpt?.topic} required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Quantum Mechanics..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Price Index (Paise)</label>
                  <input name="price" type="number" defaultValue={editingPpt?.price} required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="4900" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Meta Tags (CSV)</label>
                  <input name="tags" defaultValue={editingPpt?.tags?.join(', ')} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="physics, science, 3d..." />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Technical Summary</label>
                <textarea name="description" defaultValue={editingPpt?.description} required rows={4} className="w-full bg-slate-50 border-none rounded-[2rem] py-6 px-8 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Architectural details..." />
              </div>

              {/* Uploads Section */}
              <div className="grid grid-cols-3 gap-8 bg-slate-50 p-8 rounded-[2.5rem]">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Market Hero (Image)</label>
                       <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} className="text-[10px] font-bold text-slate-500 w-full" />
                    </div>
                    <input name="thumbnail_url_manual" defaultValue={editingPpt?.thumbnail_url} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-[11px] font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Or paste image URL..." />
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Deck (PDF)</label>
                       <input type="file" accept=".pdf" onChange={e => setSampleFile(e.target.files?.[0] || null)} className="text-[10px] font-bold text-slate-500 w-full" />
                    </div>
                    <input name="sample_url_manual" defaultValue={editingPpt?.sample_file_url} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-[11px] font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Or paste PDF URL..." />
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source Presentation (PPTX)</label>
                       <input type="file" accept=".pptx,.ppt" onChange={e => setFullFile(e.target.files?.[0] || null)} className="text-[10px] font-bold text-slate-500 w-full" />
                    </div>
                    <input name="full_url_manual" defaultValue={editingPpt?.full_file_url} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-[11px] font-bold focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Or paste PPTX URL..." />
                 </div>
              </div>

              {/* Moderation Controls */}
              <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-200">
                 <div className="flex items-center gap-3 mb-8">
                    <ShieldCheck className="w-6 h-6 text-blue-200" />
                    <h4 className="font-black text-xl tracking-tight">Security & Moderation</h4>
                 </div>
                 <div className="grid grid-cols-3 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase tracking-widest text-blue-200">Moderation State</label>
                       <select name="moderation_status" defaultValue={editingPpt?.moderation_status || 'pending'} className="w-full bg-white/10 border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-0">
                          <option value="pending" className="text-slate-900">Pending Review</option>
                          <option value="approved" className="text-slate-900">Public Release</option>
                          <option value="rejected" className="text-slate-900">Rejected / Fraud</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase tracking-widest text-blue-200">Feature Status</label>
                       <select name="is_featured" defaultValue={editingPpt?.is_featured ? 'true' : 'false'} className="w-full bg-white/10 border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-0">
                          <option value="false" className="text-slate-900">Standard Listing</option>
                          <option value="true" className="text-slate-900">Hero Section</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase tracking-widest text-blue-200">System Visibility</label>
                       <select name="is_active" defaultValue={editingPpt?.is_active ? 'true' : 'false'} className="w-full bg-white/10 border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-0">
                          <option value="true" className="text-slate-900">Active Live</option>
                          <option value="false" className="text-slate-900">Deactivated</option>
                       </select>
                    </div>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : editingPpt ? "Commit Structural Updates" : "Initialize Asset Listing"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
