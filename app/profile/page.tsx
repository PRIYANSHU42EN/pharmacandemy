"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import StreakWidget from "@/components/shared/StreakWidget";

export default function ProfilePage() {
  const { user, userProfile, isPremium, loading, logout } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Route protection
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Please wait...</p>
      </div>
    );
  }

  const referralCode = userProfile?.referralCode || "------";
  const displayName = userProfile?.displayName || user.displayName || "Student";
  const email = userProfile?.email || user.email || "";
  const initials = displayName.charAt(0).toUpperCase();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://cubepharm.in/ref/${referralCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // failed
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Cubepharm",
          text: "Check out this study platform for pharmacy students!",
          url: `https://cubepharm.in/ref/${referralCode}`,
        });
      } catch {
        // cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (err) {
      console.error("[Profile] Logout failed:", err);
    }
  };

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-2xl">
        {/* Profile header */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: "var(--color-navy)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-[32px] font-bold shrink-0"
            style={{
              background: "rgba(247,197,216,0.15)",
              color: "var(--color-candy-rose)",
              fontFamily: "var(--font-display)",
            }}
          >
            {initials}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-[24px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-cream)" }}>
              {displayName}
            </h1>
            <p className="text-[14px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
              {email}
            </p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              {isPremium ? (
                <span
                  className="text-[11px] font-medium px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(247,197,216,0.15)",
                    color: "var(--color-candy-rose)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  👑 Premium Active
                </span>
              ) : (
                <>
                  <span
                    className="text-[11px] font-medium px-3 py-1 rounded-full"
                    style={{
                      background: "rgba(197,247,232,0.15)",
                      color: "var(--color-candy-mint)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Free Plan
                  </span>
                  <Link
                    href="/upgrade"
                    className="text-[11px] font-medium px-3 py-1 rounded-full transition-all hover:scale-105"
                    style={{
                      background: "rgba(247,197,216,0.12)",
                      color: "var(--color-candy-rose)",
                      border: "0.5px solid var(--color-candy-rose)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Upgrade →
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Streak */}
          <StreakWidget 
            streak={userProfile?.streak || 0} 
            completedToday={userProfile?.lastActiveDate === new Date().toISOString().split('T')[0]} 
          />

          {/* Referral */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{
              background: "linear-gradient(145deg, rgba(216,197,247,0.08), rgba(247,197,216,0.06))",
              border: "0.5px solid rgba(216,197,247,0.15)",
            }}
          >
            <p className="label" style={{ color: "var(--color-candy-lavender)" }}>
              Referral
            </p>
            <p className="text-[13px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
              Share your code and earn free premium days!
            </p>

            {/* Code display */}
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg"
              style={{
                background: "rgba(26,31,60,0.04)",
                border: "1px dashed rgba(26,31,60,0.15)",
              }}
            >
              <span
                className="flex-1 text-[18px] font-bold tracking-widest text-center"
                style={{ fontFamily: "var(--font-mono)", color: "var(--color-navy)" }}
              >
                {referralCode}
              </span>
              <button
                onClick={handleCopy}
                className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: copied ? "rgba(197,247,232,0.2)" : "rgba(26,31,60,0.06)",
                  color: copied ? "var(--color-badge-mint-text)" : "var(--color-mid)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <button
              onClick={handleShare}
              className="btn btn-primary w-full justify-center text-[12px] py-2.5"
            >
              Share Referral Link
            </button>
          </div>
        </div>

        {/* Account actions */}
        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="text-[13px] font-medium text-center py-3 rounded-xl transition-all hover:bg-[rgba(239,68,68,0.04)]"
            style={{
              color: "#dc2626",
              fontFamily: "var(--font-body)",
              border: "0.5px solid rgba(239,68,68,0.15)",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}
