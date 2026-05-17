"use client";

import { useState } from "react";
import { 
  Upload, FileText, ImageIcon, DollarSign, 
  ArrowLeft, CheckCircle2, AlertCircle, Info,
  Loader2, X, Plus, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Pharmacology", "Pharmaceutics", "Medicinal Chemistry", 
  "Clinical Pharmacy", "Anatomy", "Pathophysiology",
  "Seminars", "Projects", "Exam Prep", "Templates"
];

export default function PPTUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    category: "General",
    price: "",
    semester: "4",
    description: "",
    thumbnailUrl: "",
    sampleUrl: "",
    fullUrl: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/marketplace/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ...formData,
          price: Math.round(parseFloat(formData.price) * 100), // convert to paise
          displayName: user.displayName
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/creator"), 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-8">
        <div className="bg-white rounded-[48px] p-16 max-w-lg w-full text-center shadow-2xl shadow-navy/40 border border-white/10 animate-in zoom-in-95 duration-500">
           <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
             <CheckCircle2 className="w-12 h-12 text-emerald-500" />
           </div>
           <h2 className="text-3xl font-black text-navy mb-4 tracking-tight">Upload Successful!</h2>
           <p className="text-slate font-medium mb-8">Your asset is now being indexed in the marketplace. Redirecting to your studio...</p>
           <Loader2 className="w-8 h-8 text-candy-rose animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream/30 py-16 px-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/dashboard/creator" 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate hover:text-navy transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Studio
        </Link>

        <div className="bg-white rounded-[48px] border border-navy/5 shadow-2xl overflow-hidden">
          <div className="p-12 bg-navy text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-candy-rose/10 blur-[100px] -mr-32 -mt-32" />
            <h1 className="text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
              List Your <span className="text-candy-rose">Asset</span>
            </h1>
            <p className="text-white/60 text-sm font-medium">Globalize your knowledge. Earn from every download.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-12 space-y-10">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4">
                <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                <p className="text-rose-600 text-sm font-bold uppercase tracking-tight">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left Column */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-1">Presentation Title</label>
                  <div className="relative group">
                    <FileText className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate group-focus-within:text-candy-rose transition-colors" />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Advanced Drug Delivery Systems" 
                      className="w-full bg-navy/5 border-none rounded-2xl py-4 pl-14 pr-5 text-sm focus:ring-2 focus:ring-navy/5 transition-all"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-1">Academic Subject</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Pharmaceutics-IV" 
                    className="w-full bg-navy/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-navy/5 transition-all"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-1">Category</label>
                    <select 
                      className="w-full bg-navy/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-navy/5 transition-all appearance-none cursor-pointer"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-1">Listing Price (INR)</label>
                    <div className="relative group">
                      <DollarSign className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate group-focus-within:text-candy-rose transition-colors" />
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        placeholder="e.g. 49.00" 
                        className="w-full bg-navy/5 border-none rounded-2xl py-4 pl-11 pr-5 text-sm font-bold focus:ring-2 focus:ring-navy/5 transition-all"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-1">Thumbnail Image URL</label>
                  <div className="relative group">
                    <ImageIcon className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate group-focus-within:text-candy-rose transition-colors" />
                    <input 
                      required
                      type="url" 
                      placeholder="https://images.unsplash.com/..." 
                      className="w-full bg-navy/5 border-none rounded-2xl py-4 pl-14 pr-5 text-sm focus:ring-2 focus:ring-navy/5 transition-all"
                      value={formData.thumbnailUrl}
                      onChange={(e) => setFormData({...formData, thumbnailUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-1">Full Presentation URL</label>
                  <input 
                    required
                    type="url" 
                    placeholder="Direct link to PPTX/PDF..." 
                    className="w-full bg-navy/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-navy/5 transition-all"
                    value={formData.fullUrl}
                    onChange={(e) => setFormData({...formData, fullUrl: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-1">Description</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Detail the contents, number of slides, and key takeaways..." 
                    className="w-full bg-navy/5 border-none rounded-2xl py-4 px-5 text-sm focus:ring-2 focus:ring-navy/5 transition-all resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-navy/5">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn btn-primary py-6 rounded-3xl text-lg font-black shadow-2xl shadow-navy/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Deploying Asset...
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    Publish to Marketplace
                  </>
                )}
              </button>
              <p className="text-center mt-6 text-[10px] text-slate font-bold uppercase tracking-[0.3em]">
                By publishing, you agree to our Content Moderation Guidelines.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
