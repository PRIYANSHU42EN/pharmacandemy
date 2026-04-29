"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const { user, loading: authLoading, loginWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const checkRateLimit = () => {
    if (typeof window === "undefined") return true;
    const attemptsStr = localStorage.getItem("loginAttempts");
    if (!attemptsStr) return true;
    const attempts = JSON.parse(attemptsStr);
    const now = Date.now();
    const fifteenMins = 15 * 60 * 1000;
    
    const recentAttempts = attempts.filter((time: number) => now - time < fifteenMins);
    localStorage.setItem("loginAttempts", JSON.stringify(recentAttempts));
    
    if (recentAttempts.length >= 5) {
      const oldest = recentAttempts[0];
      const waitTime = Math.ceil((fifteenMins - (now - oldest)) / 60000);
      return `Too many login attempts. Please try again in ${waitTime} minute${waitTime !== 1 ? 's' : ''}.`;
    }
    return true;
  };

  const recordFailedAttempt = () => {
    if (typeof window === "undefined") return;
    const attemptsStr = localStorage.getItem("loginAttempts");
    const attempts = attemptsStr ? JSON.parse(attemptsStr) : [];
    const now = Date.now();
    const fifteenMins = 15 * 60 * 1000;
    const recentAttempts = attempts.filter((time: number) => now - time < fifteenMins);
    recentAttempts.push(now);
    localStorage.setItem("loginAttempts", JSON.stringify(recentAttempts));
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateLimitCheck = checkRateLimit();
    if (rateLimitCheck !== true) {
      setError(rateLimitCheck);
      setIsLockedOut(true);
      return;
    }

    if (loading) return; 
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      if (typeof window !== "undefined") localStorage.removeItem("loginAttempts");
      router.push("/dashboard");
    } catch (err: unknown) {
      recordFailedAttempt();
      const newCheck = checkRateLimit();
      if (newCheck !== true) {
        setError(newCheck);
        setIsLockedOut(true);
      } else {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <div
        className="w-full max-w-[420px] rounded-2xl p-8"
        style={{
          background: "var(--color-cream)",
          border: "0.5px solid #e0e0e0",
          boxShadow: "0 4px 24px rgba(26,31,60,0.06)",
        }}
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="text-[20px] font-medium" style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}>Pharma</span>
            <span className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}>Cademy</span>
          </div>
          <h1 className="text-[24px] mb-1" style={{ fontFamily: "var(--font-display)" }}>Welcome Back</h1>
          <p className="text-[14px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Sign in to continue learning</p>
        </div>

        {error && (
          <div className="rounded-lg px-4 py-3 mb-4 text-[13px]" style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626", fontFamily: "var(--font-body)" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading || isLockedOut}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[14px] font-medium mb-4 transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: "rgba(26,31,60,0.03)", border: "1px solid rgba(26,31,60,0.1)", fontFamily: "var(--font-body)", color: "var(--color-navy)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(26,31,60,0.08)" }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(26,31,60,0.08)" }} />
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <div>
            <label htmlFor="login-email" className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Email</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg outline-none text-[14px] transition-all" style={{ background: "rgba(26,31,60,0.02)", border: "1px solid rgba(26,31,60,0.1)", fontFamily: "var(--font-body)" }} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 rounded-lg outline-none text-[14px] transition-all" style={{ background: "rgba(26,31,60,0.02)", border: "1px solid rgba(26,31,60,0.1)", fontFamily: "var(--font-body)" }} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading || isLockedOut} className="btn btn-accent w-full justify-center text-[14px] py-3 mt-2" style={{ opacity: loading || isLockedOut ? 0.7 : 1, cursor: isLockedOut ? "not-allowed" : undefined }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6 text-[13px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
          Don&apos;t have an account? <Link href="/signup" className="font-medium transition-colors hover:underline" style={{ color: "var(--color-candy-rose)" }}>Sign up</Link>
        </p>
      </div>
    </section>
  );
}
