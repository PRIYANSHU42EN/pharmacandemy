"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import StreakWidget from "@/components/shared/StreakWidget";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function ProfilePage() {
  const { user, userProfile, loading, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Username editing state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Route protection
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingUsername && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [isEditingUsername]);

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

  const handleStartEditUsername = () => {
    setNewUsername(userProfile?.username || "");
    setUsernameError("");
    setUsernameSuccess(false);
    setIsEditingUsername(true);
  };

  const handleCancelEditUsername = () => {
    setIsEditingUsername(false);
    setNewUsername("");
    setUsernameError("");
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase();

    // Client-side validation
    if (!USERNAME_REGEX.test(trimmed)) {
      setUsernameError("3-20 characters, letters, numbers & underscores only.");
      return;
    }

    // Skip if unchanged
    if (trimmed === userProfile?.username) {
      setIsEditingUsername(false);
      return;
    }

    setUsernameSaving(true);
    setUsernameError("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUsernameError(data.error || "Failed to update username.");
        return;
      }

      // Refresh profile from server to get latest data
      await refreshProfile();
      setIsEditingUsername(false);
      setUsernameSuccess(true);
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (err) {
      setUsernameError("Network error. Please try again.");
    } finally {
      setUsernameSaving(false);
    }
  };

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
      // console.("[Profile] Logout failed:", err);
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

            {/* Username Display / Edit */}
            <div className="mt-1.5 flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              {!isEditingUsername ? (
                <>
                  <span
                    className="text-[13px] font-semibold px-2.5 py-0.5 rounded-lg"
                    style={{
                      background: "rgba(247,197,216,0.12)",
                      color: "var(--color-candy-rose)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    @{userProfile?.username || "unassigned"}
                  </span>
                  <button
                    onClick={handleStartEditUsername}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    title="Change username"
                  >
                    ✏️ Edit
                  </button>
                  {usernameSuccess && (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md animate-in fade-in slide-in-from-left-2"
                      style={{ background: "rgba(197,247,232,0.15)", color: "var(--color-candy-mint)" }}
                    >
                      ✓ Saved!
                    </span>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.5)" }}>@</span>
                    <input
                      ref={usernameInputRef}
                      type="text"
                      value={newUsername}
                      onChange={(e) => {
                        setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
                        setUsernameError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveUsername();
                        if (e.key === "Escape") handleCancelEditUsername();
                      }}
                      maxLength={20}
                      placeholder="new_username"
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[var(--color-candy-rose)] focus:ring-1 focus:ring-[var(--color-candy-rose)]/30 transition-all"
                      style={{ fontFamily: "var(--font-mono)" }}
                      disabled={usernameSaving}
                    />
                    <button
                      onClick={handleSaveUsername}
                      disabled={usernameSaving || !newUsername.trim()}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      style={{
                        background: "var(--color-candy-rose)",
                        color: "var(--color-navy)",
                      }}
                    >
                      {usernameSaving ? "..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEditUsername}
                      disabled={usernameSaving}
                      className="text-[11px] font-medium px-2 py-1.5 rounded-lg transition-all hover:bg-white/10"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      ✕
                    </button>
                  </div>
                  {usernameError && (
                    <p className="text-[11px] font-medium px-1 animate-in fade-in slide-in-from-top-1" style={{ color: "#f87171" }}>
                      ⚠ {usernameError}
                    </p>
                  )}
                  <p className="text-[10px] px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                    3-20 chars • letters, numbers, underscores
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <span
                className="text-[11px] font-medium px-3 py-1 rounded-full"
                style={{
                  background: "rgba(197,247,232,0.15)",
                  color: "var(--color-candy-mint)",
                  fontFamily: "var(--font-body)",
                }}
              >
                🎓 Academic Account
              </span>
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
              Share your code with friends and grow the community!
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

