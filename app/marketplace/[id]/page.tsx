"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { Star, Download, Lock, CheckCircle2, ChevronLeft, ChevronRight, Share2, AlertCircle, Loader2, Tag, User, ShieldCheck, Zap, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PPTListing } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { pptSupabase } from "@/lib/supabase/ppt";

export default function PPTDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [ppt, setPpt] = useState<PPTListing | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchPPT() {
      try {
        setLoading(true);
        const { data, error } = await pptSupabase
          .from('ppt_marketplace')
          .select(`
            *,
            category:ppt_categories(*),
            creator:creator_profiles(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setPpt(data as any);

        // Check if purchased
        if (user) {
          const { data: purchase } = await pptSupabase
            .from('ppt_purchases')
            .select('*')
            .eq('user_id', user.uid)
            .eq('ppt_id', id)
            .maybeSingle();
          
          if (purchase) setIsPurchased(true);
        }
      } catch (err: any) {
        // console.("Error fetching PPT:", err.message);
        toast.error("Failed to load presentation");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchPPT();
  }, [id, user]);

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please login to purchase");
      return;
    }

    setProcessing(true);
    try {
      const { auth: firebaseAuth } = await import("@/lib/firebase/config");
      const idToken = await firebaseAuth.currentUser?.getIdToken();

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ type: "ppt_purchase", pptId: id })
      });

      if (!orderRes.ok) throw new Error("Failed to create payment order");
      const { orderId, amount, currency } = await orderRes.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: "Universal Marketplace",
        description: `Purchase: ${ppt?.title}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            toast.loading("Verifying payment...");
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            toast.dismiss();
            if (verifyRes.ok) {
              setIsPurchased(true);
              toast.success("Purchase successful! Content unlocked.");
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (err: any) {
            toast.error(err.message);
          }
        },
        prefill: {
          name: userProfile?.displayName || "",
          email: user.email || ""
        },
        theme: { color: "#2563EB" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error: any) {
      toast.error("Purchase failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!ppt) return;
    
    try {
      toast.loading("Preparing download...");
      
      let headers: any = {};
      if (user) {
        const { auth: firebaseAuth } = await import("@/lib/firebase/config");
        const idToken = await firebaseAuth.currentUser?.getIdToken();
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      const response = await fetch(`/api/marketplace/download?id=${ppt.id}`, { headers });
      const data = await response.json();
      
      toast.dismiss();

      if (response.ok && data.url) {
        window.open(data.url, "_blank");
        toast.success("Download started");
      } else {
        throw new Error(data.error || "Failed to get download link");
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  const handleDownloadSample = () => {
    if (!ppt?.sample_file_url) return;
    toast.success("Sample download starting...");
    window.open(ppt.sample_file_url, "_blank");
  };

  const handleInquiry = async () => {
    if (!user) {
      toast.error("Please login to inquire");
      return;
    }

    setProcessing(true);
    try {
      const { auth: firebaseAuth } = await import("@/lib/firebase/config");
      const idToken = await firebaseAuth.currentUser?.getIdToken();

      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          contextType: "ppt_inquiry",
          contextId: id,
          metadata: {
            title: `Inquiry: ${ppt?.title}`,
            pptId: id,
            price: ppt?.price
          }
        })
      });

      if (!res.ok) throw new Error("Failed to create chat room");
      
      toast.success("Redirecting to Chat...");
      router.push("/my-chat");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB]">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-900 font-bold animate-pulse">Syncing Presentation Data...</p>
    </div>
  );

  if (!ppt) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB]">
      <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-900">Asset Unavailable</h2>
      <p className="text-slate-500 mb-8">This presentation might be private or under moderation.</p>
      <button onClick={() => router.push('/marketplace')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold">Return to Marketplace</button>
    </div>
  );

  const priceInRupees = ppt.price / 100;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-32">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Dynamic Header */}
      <div className="bg-white border-b border-slate-100 py-6 mb-12">
        <div className="container-main flex items-center justify-between">
           <button onClick={() => router.back()} className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Back to Browse
           </button>
           <div className="flex items-center gap-4">
              <button className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all">
                <Share2 className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              {ppt.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 mb-12">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    {ppt.creator?.avatar_url ? (
                      <Image src={ppt.creator.avatar_url} alt="" width={40} height={40} className="object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Creator</p>
                    <p className="text-sm font-bold text-slate-900">{ppt.creator?.display_name || "Independent Artist"}</p>
                 </div>
              </div>

              <div className="h-8 w-px bg-slate-100" />

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Category</p>
                <p className="text-sm font-bold text-slate-900">{ppt.category?.name || "Uncategorized"}</p>
              </div>

              <div className="h-8 w-px bg-slate-100" />

              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-slate-900">{ppt.rating.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-medium">({ppt.download_count} downloads)</span>
              </div>
            </div>

            {/* Preview System */}
            <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-[16/10] mb-8">
              <div className="relative w-full h-full">
                {ppt.preview_images && ppt.preview_images.length > 0 && (
                  <Image
                    src={ppt.preview_images[activeSlide]}
                    alt={`Slide ${activeSlide + 1}`}
                    fill
                    className="object-contain"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white/5 text-[10vw] font-black -rotate-45 select-none uppercase tracking-[1em]">
                    PREVIEW
                  </span>
                </div>
              </div>

              {/* Navigation */}
              {ppt.preview_images && ppt.preview_images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : ppt.preview_images.length - 1))}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button 
                    onClick={() => setActiveSlide((prev) => (prev < ppt.preview_images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex gap-4 mb-16 overflow-x-auto pb-4 px-2 no-scrollbar">
              {ppt.preview_images?.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={cn(
                    "relative w-40 aspect-video shrink-0 rounded-2xl overflow-hidden border-4 transition-all",
                    activeSlide === idx ? "border-blue-600 scale-105 shadow-xl" : "border-transparent opacity-50 hover:opacity-100"
                  )}
                >
                  <Image src={img} alt="Thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>

            {/* Description */}
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 mb-8">Presentation Overview</h2>
              <div className="prose prose-slate prose-lg max-w-none">
                {(ppt.description || "").split('\n').map((line, i) => (
                   <p key={i} className="text-slate-600 mb-6 leading-relaxed whitespace-pre-wrap font-medium">{line}</p>
                ))}
              </div>
              
              <div className="mt-12 flex flex-wrap gap-3">
                {(ppt.tags || []).map(tag => (
                   <span key={tag} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2">
                    <Tag className="w-3 h-3" /> {tag}
                   </span>
                ))}
              </div>
            </div>
          </div>

          {/* Checkout Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-12 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl shadow-blue-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-10 -mt-10" />

                <div className="bg-slate-50 rounded-2xl p-8 mb-8 text-center border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-3 font-black">
                    {priceInRupees === 0 ? "Open Source Asset" : "Unlimited Access License"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">
                      {priceInRupees === 0 ? "FREE" : `₹${priceInRupees}`}
                    </span>
                    {priceInRupees > 0 && (
                      <span className="text-lg text-slate-300 line-through font-bold">₹{priceInRupees * 2}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-0.5">Commercial Ready</p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">Verified by moderation team for copyright compliance.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-0.5">Instant Delivery</p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">Download directly in PPTX format after payment.</p>
                    </div>
                  </div>
                </div>

                {!isPurchased && priceInRupees > 0 ? (
                  <button 
                    onClick={handlePurchase}
                    disabled={processing}
                    className="w-full py-5 bg-blue-600 text-white rounded-[1.25rem] font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 group"
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Purchase Presentation
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={handleDownload}
                    className="w-full py-5 bg-emerald-600 text-white rounded-[1.25rem] font-bold text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    {isPurchased ? "Download Assets" : "Get Free Presentation"}
                  </button>
                )}

                {/* Chat Inquiry */}
                <button 
                  onClick={handleInquiry}
                  disabled={processing}
                  className="w-full mt-4 py-4 border-2 border-slate-100 text-slate-600 rounded-[1.25rem] font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  Inquire / Negotiate Price
                </button>

                <p className="text-[10px] text-slate-400 text-center mt-6 font-bold uppercase tracking-widest">
                  Secure Checkout via Razorpay
                </p>
              </div>

              {/* Free Sample */}
              {ppt.sample_file_url && (
                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex items-center justify-between group cursor-pointer" onClick={handleDownloadSample}>
                  <div>
                    <h4 className="font-bold mb-1">Download Preview</h4>
                    <p className="text-xs text-slate-400 font-medium">Free Sample PDF Included</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <Download className="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
