"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function EmailVerificationBanner() {
  const [mounted, setMounted] = useState(false);
  const { user, emailVerified, resendVerificationEmail } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user || emailVerified) return null;

  const handleResend = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (e) {
      // silently fail — user can try again
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
      style={{
        background: "rgba(247, 223, 197, 0.97)",
        border: "0.5px solid rgba(247, 180, 100, 0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="text-[18px]">📧</span>
      <p
        className="flex-1 text-[12px] leading-snug"
        style={{ fontFamily: "var(--font-body)", color: "#7a4a00" }}
      >
        <strong>Verify your email</strong> to unlock all features. Check your inbox for a link.
      </p>
      <button
        onClick={handleResend}
        disabled={sending || sent}
        className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
        style={{
          background: sent ? "rgba(197,247,232,0.5)" : "rgba(247,180,100,0.25)",
          color: sent ? "#1a7a50" : "#7a4a00",
          fontFamily: "var(--font-body)",
          border: "0.5px solid currentColor",
        }}
      >
        {sent ? "Sent ✓" : sending ? "Sending…" : "Resend"}
      </button>
    </div>
  );
}
