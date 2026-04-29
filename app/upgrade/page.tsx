"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";

const premiumFeatures = [
  { icon: "📝", title: "All PYQs", desc: "Last 10 years, every subject — organized by year" },
  { icon: "📄", title: "Premium PDF Notes", desc: "In-app viewer with fast revision material" },
  { icon: "⭐", title: "Exam Booster", desc: "High-yield expected questions curated by experts" },
  { icon: "🧠", title: "Practice Mode", desc: "Flashcard sessions with bookmarks and progress" },
  { icon: "🔥", title: "Streak Freeze", desc: "Protect your streak once per month" },
  { icon: "🚫", title: "Ad-Free", desc: "Distraction-free study experience" },
];

const freeFeatures = [
  "Limited subjects",
  "Sample PYQs (1–2 per subject)",
  "Free video lectures",
  "Daily questions",
  "Basic search",
];

const premiumAllFeatures = [
  "All subjects unlocked",
  "10+ years of PYQs per subject",
  "Full PDF notes library",
  "Exam Booster content",
  "Practice mode with bookmarks",
  "Streak freeze (1/month)",
  "Priority support",
  "Ad-free experience",
];

function loadScript(src: string) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function UpgradePage() {
  const router = useRouter();
  const { userProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePayment = async (amount: number, type: string, planName: string) => {
    setErrorMsg("");
    if (!user) {
      router.push(`/login?redirect=/upgrade`);
      return;
    }

    setLoading(true);
    try {
      // 1. Get Firebase Auth token for server-side verification
      const idToken = await user.getIdToken();
      
      // 2. Load Razorpay SDK
      const isLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
      }

      // 3. Create Order on backend (with Firebase auth token)
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ amount, type }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Failed to initialize order");

      // 4. Configure Razorpay Standard Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "demo-key",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "PharmaCademy",
        description: `Premium Subscription — ${planName}`,
        image: "/favicon.ico", 
        order_id: orderData.orderId,
        theme: { color: "#FB6F92" }, 
        prefill: {
          name: userProfile?.displayName || user.displayName || "",
          email: userProfile?.email || user.email || "",
        },
        handler: async function (response: any) {
          try {
            // Get a fresh token for verification
            const freshToken = await user.getIdToken(true);

            // Verify payment on our backend
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${freshToken}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              router.push("/payment/success");
            } else {
              setErrorMsg(verifyData.error || "Payment verification failed.");
              setLoading(false);
            }
          } catch (err) {
            console.error("[Payment] Verification exception:", err);
            setErrorMsg("Critical validation error. Please contact support.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      // @ts-ignore
      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response: any) {
        setErrorMsg(response.error.description || "The transaction was declined.");
        setLoading(false);
      });
      rzp1.open();

    } catch (error: any) {
      console.error("[Payment] Setup error:", error);
      setErrorMsg(error.message || "Something went wrong initializing the checkout.");
      setLoading(false);
    }
  };

  return (
    <section style={{ minHeight: "calc(100vh - 64px)" }}>
      {/* Hero */}
      <div className="dark-surface py-16 lg:py-20">
        <div className="container-main text-center">
          <p className="label mb-3" style={{ color: "var(--color-candy-rose)" }}>
            Premium Access
          </p>
          <h1
            className="text-[32px] sm:text-[40px] max-w-2xl mx-auto mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-cream)" }}
          >
            Unlock Everything for Just ₹40/month
          </h1>
          <p
            className="text-[16px] max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-slate)" }}
          >
            Less than a cup of chai per day. Get full access to all PYQs, premium notes, exam boosters, and more.
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="py-12 lg:py-16" style={{ background: "#F9F8F7" }}>
        <div className="container-main">
          <div className="content-grid" style={{ gap: "20px", maxWidth: "900px", margin: "0 auto" }}>
            {premiumFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-5 flex gap-4 items-start"
                style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}
              >
                <span className="text-[28px] shrink-0">{f.icon}</span>
                <div>
                  <h3 className="text-[15px] font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>{f.title}</h3>
                  <p className="text-[13px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing comparison */}
      <div className="py-12 lg:py-16" style={{ background: "var(--color-cream)" }}>
        <div className="container-main max-w-3xl">
          <h2 className="text-[28px] text-center mb-10" style={{ fontFamily: "var(--font-display)" }}>
            Free vs Premium
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="rounded-2xl p-6" style={{ border: "0.5px solid #e0e0e0", background: "white" }}>
              <p className="label mb-2" style={{ color: "var(--color-mid)" }}>Free Plan</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-[36px] font-bold" style={{ fontFamily: "var(--font-display)" }}>₹0</span>
                <span className="text-[14px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>/month</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: "rgba(26,31,60,0.06)" }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/courses" className="btn btn-ghost w-full justify-center mt-6 text-[12px]">
                Start Free
              </Link>
            </div>

            {/* Premium Monthly */}
            <div
              className="rounded-2xl p-6 relative"
              style={{
                background: "white",
                border: "1px solid #e0e0e0",
              }}
            >
              <p className="label mb-2" style={{ color: "var(--color-mid)" }}>Monthly Plan</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-[36px] font-bold" style={{ fontFamily: "var(--font-display)" }}>₹40</span>
                <span className="text-[14px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>/month</span>
              </div>
              <ul className="flex flex-col gap-2.5 mb-6">
                <li className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: "rgba(197,247,232,0.15)", color: "var(--color-candy-mint)" }}>✓</span>
                  Full 1 Month Access
                </li>
                {premiumAllFeatures.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: "rgba(197,247,232,0.15)", color: "var(--color-candy-mint)" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handlePayment(4000, "premium_monthly", "1 Month")} 
                disabled={loading}
                className="btn btn-ghost w-full justify-center mt-auto text-[12px] disabled:opacity-70"
                style={{ border: "1px solid var(--color-navy)" }}
              >
                {loading ? "..." : "Get 1 Month"}
              </button>
            </div>

            {/* Premium Biannual */}
            <div
              className="rounded-2xl p-6 relative"
              style={{
                background: "var(--color-navy)",
                border: "1px solid var(--color-candy-rose)",
                boxShadow: "0 10px 30px rgba(251,111,146,0.15)"
              }}
            >
              {/* Value badge */}
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                style={{
                  background: "var(--color-candy-rose)",
                  color: "var(--color-navy)",
                  fontFamily: "var(--font-body)",
                }}
              >
                🔥 Best Value (SAVE 75%)
              </span>

              <p className="label mb-2" style={{ color: "var(--color-candy-rose)" }}>Biannual Plan</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-[36px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}>₹60</span>
                <span className="text-[14px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>/ 6 months</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                <li className="flex items-center gap-2 text-[13px]" style={{ color: "white", fontWeight: "bold", fontFamily: "var(--font-body)" }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: "rgba(197,247,232,0.25)", color: "var(--color-candy-mint)" }}>✓</span>
                  6 Months Full Access
                </li>
                {premiumAllFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: "rgba(253,252,251,0.8)", fontFamily: "var(--font-body)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: "rgba(197,247,232,0.15)", color: "var(--color-candy-mint)" }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handlePayment(6000, "premium_biannual", "6 Months")} 
                disabled={loading}
                className="btn btn-accent w-full justify-center mt-6 text-[12px] disabled:opacity-70"
              >
                {loading ? "Processing Securely..." : "Unlock 6 Months — ₹60"}
              </button>
            </div>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            {[
              { icon: "🔒", label: "Secure Payment" },
              { icon: "⚡", label: "Instant Access" },
              { icon: "❌", label: "Cancel Anytime" },
            ].map((t) => (
              <div key={t.label} className="trust-badge">
                <span>{t.icon}</span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
