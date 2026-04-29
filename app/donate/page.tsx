"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { DONATION_PRESETS } from "@/constants";
import { supabase } from "@/lib/supabase/client";

function loadScript(src: string) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donated, setDonated] = useState(false);

  const { userProfile, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const finalAmount = selectedAmount || (customAmount ? parseInt(customAmount) * 100 : 0);

  const handleDonate = async () => {
    if (!finalAmount) return;
    setErrorMsg("");

    if (!user) {
      router.push("/login?redirect=/donate");
      return;
    }

    setLoading(true);
    try {
      // 1. Get Supabase Auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Authentication session expired. Please re-login.");
      }
      const token = session.access_token;

      // 2. Load Razorpay SDK
      const isLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load.");
      }

      // 3. Create Order on backend (with Supabase auth token)
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount: finalAmount, type: "donation" }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Failed to initialize donation");

      // 4. Configure Razorpay Standard Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "demo-key",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "PharmaCademy",
        description: "Support PharmaCademy Development",
        image: "/favicon.ico",
        order_id: orderData.orderId,
        theme: { color: "#FB6F92" },
        prefill: {
          name: userProfile?.displayName || user.displayName || "",
          email: userProfile?.email || user.email || "",
        },
        handler: async function (response: any) {
          try {
            // Get fresh session
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            const freshToken = freshSession?.access_token || token;

            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${freshToken}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setDonated(true);
            } else {
              setErrorMsg(verifyData.error || "Donation verification failed.");
            }
          } catch (err) {
            console.error("[Donation] Verification exception:", err);
            setErrorMsg("Critical validation error. Contact support.");
          } finally {
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
      console.error("[Donation] Setup error:", error);
      setErrorMsg(error.message || "Something went wrong.");
      setLoading(false);
    }
  };

  if (donated) {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4" style={{ background: "#F9F8F7" }}>
        <div className="text-center max-w-md">
          <span className="text-[64px] block mb-4">💝</span>
          <h1 className="text-[28px] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Thank You!
          </h1>
          <p className="text-[16px] leading-relaxed" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
            Your support means a lot. Every donation helps us keep PharmaCademy accessible and affordable for pharmacy students across India.
          </p>
          <p className="text-[13px] mt-4" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
            — Priyanshu, Creator
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-16" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-lg">
        <div className="text-center mb-10">
          <span className="text-[48px] block mb-4">☕</span>
          <h1 className="text-[28px] sm:text-[32px] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Support PharmaCademy
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
            PharmaCademy is built by a solo developer to help pharmacy students study better. Your donations help keep the platform running and growing.
          </p>
          <p className="text-[12px] mt-3 px-3 py-1.5 rounded-full inline-block" style={{ background: "rgba(247,197,216,0.1)", color: "var(--color-badge-rose-text)", fontFamily: "var(--font-body)" }}>
            💡 Donations do NOT grant premium access
          </p>
        </div>

        {/* Amount selection */}
        <div className="rounded-2xl p-6" style={{ background: "var(--color-cream)", border: "0.5px solid #e0e0e0" }}>
          <p className="label mb-4" style={{ color: "var(--color-candy-rose)" }}>
            Choose Amount
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {DONATION_PRESETS.map((preset) => (
              <button
                key={preset.amount}
                onClick={() => {
                  setSelectedAmount(preset.amount);
                  setCustomAmount("");
                }}
                className="py-3 rounded-xl text-center transition-all text-[16px] font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  background: selectedAmount === preset.amount
                    ? "var(--color-navy)"
                    : "rgba(26,31,60,0.03)",
                  color: selectedAmount === preset.amount
                    ? "var(--color-candy-rose)"
                    : "var(--color-navy)",
                  border: selectedAmount === preset.amount
                    ? "1px solid var(--color-navy)"
                    : "1px solid rgba(26,31,60,0.1)",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="mb-6">
            <label
              htmlFor="custom-amount"
              className="block text-[12px] font-medium mb-1.5"
              style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}
            >
              Or enter custom amount
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-mid)" }}>₹</span>
              <input
                id="custom-amount"
                type="number"
                min="1"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg outline-none text-[14px] transition-all"
                style={{
                  background: "rgba(26,31,60,0.02)",
                  border: "1px solid rgba(26,31,60,0.1)",
                  fontFamily: "var(--font-body)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-candy-rose)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(247,197,216,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(26,31,60,0.1)";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="Enter amount"
              />
            </div>
          </div>

          <button
            onClick={handleDonate}
            disabled={!finalAmount || loading}
            className="btn btn-accent w-full justify-center text-[14px] py-3 disabled:opacity-70 disabled:cursor-wait"
            style={{ opacity: finalAmount && !loading ? 1 : 0.5 }}
          >
            {loading ? "Processing Securely..." : `Donate ${finalAmount ? `₹${finalAmount / 100}` : ""}`}
          </button>
          {errorMsg && (
            <div className="mt-3 text-[11px] text-center" style={{ color: "var(--color-badge-rose-text)", fontFamily: "var(--font-body)" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex justify-center gap-3 mt-3">
            {["UPI", "Cards", "Net Banking"].map((m) => (
              <span key={m} className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
