"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ShieldAlert, RefreshCw, Check, X, Send } from "lucide-react";
import { toast } from "react-hot-toast";

export default function EmailVerificationBanner() {
  const { user, emailVerified, resendVerificationEmail, refreshEmailVerification } = useAuth();
  const [isDismissed, setIsDismissed] = useState(true); // Default to true to prevent server-side render mismatch
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [justVerified, setJustVerified] = useState(false);

  // Respect user-scoped dismissal across sessions
  useEffect(() => {
    if (user) {
      const dismissed = localStorage.getItem(`email_verify_dismissed_${user.uid}`);
      setIsDismissed(dismissed === "true");
    } else {
      setIsDismissed(true);
    }
  }, [user]);

  // Do not render if user isn't logged in, email is verified, or they dismissed the banner
  if (!user || emailVerified || isDismissed || justVerified) return null;

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.success("Verification email resent! Please check your inbox and spam folder.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const verified = await refreshEmailVerification();
      if (verified) {
        setJustVerified(true);
        toast.success("Awesome! Your email has been successfully verified.");
      } else {
        toast.error("Email is still not verified. Please click the link in the email first.");
      }
    } catch (err) {
      toast.error("Failed to check status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = () => {
    if (user) {
      setIsDismissed(true);
      localStorage.setItem(`email_verify_dismissed_${user.uid}`, "true");
    }
  };

  return (
    <div
      className="w-full border-b px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left transition-all duration-300 animate-in fade-in slide-in-from-top"
      style={{
        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.03) 100%)",
        borderColor: "rgba(245, 158, 11, 0.15)",
      }}
    >
      <div className="flex items-center gap-3 flex-col md:flex-row">
        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-amber-300" style={{ fontFamily: "var(--font-body)" }}>
            Please Verify Your Email
          </p>
          <p className="text-[12px] text-amber-100/70" style={{ fontFamily: "var(--font-body)" }}>
            To unlock all features and secure your account, check your inbox for the verification link sent to <span className="font-semibold text-amber-300">{user.email}</span>.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer text-amber-300 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {resending ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          Resend Link
        </button>

        <button
          onClick={handleRefreshStatus}
          disabled={refreshing}
          className="text-[11px] font-bold px-4 py-1.5 rounded-full transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 text-navy bg-amber-400 hover:bg-amber-300"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}
        >
          {refreshing ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          I&apos;ve Verified
        </button>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-amber-300/60 hover:text-amber-200 hover:bg-amber-500/10 transition-colors ml-1 cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
