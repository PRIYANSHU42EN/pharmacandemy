"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

function ConfettiPiece({ delay, left }: { delay: number; left: number }) {
  const colors = ["var(--color-candy-rose)", "var(--color-candy-lavender)", "var(--color-candy-mint)", "var(--color-candy-peach)"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <div
      className="absolute w-2 h-2 rounded-full"
      style={{
        left: `${left}%`,
        top: "-10px",
        background: color,
        animation: `confettiFall 2.5s ease-in ${delay}ms forwards`,
      }}
    />
  );
}

export default function PaymentSuccessPage() {
  const [showConfetti, setShowConfetti] = useState(false);

  const { refreshProfile } = useAuth();

  useEffect(() => {
    setShowConfetti(true);
    refreshProfile(); // Ensure UI reflects premium status immediately
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [refreshProfile]);

  return (
    <section
      className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 relative overflow-hidden"
      style={{ background: "#F9F8F7" }}
    >
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiPiece key={i} delay={i * 80} left={Math.random() * 100} />
          ))}
        </div>
      )}

      <div className="text-center max-w-md mx-auto">
        {/* Success badge */}
        <div
          className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, rgba(197,247,232,0.3), rgba(247,197,216,0.2))",
            animation: "scaleIn 500ms ease-out",
          }}
        >
          <span className="text-[48px]">🎉</span>
        </div>

        <h1
          className="text-[28px] sm:text-[32px] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Welcome to Premium!
        </h1>

        <p
          className="text-[16px] mb-2 leading-relaxed"
          style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}
        >
          Your payment was successful. Full access to all content is now unlocked.
        </p>

        {/* Premium badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: "rgba(247,197,216,0.15)",
            border: "0.5px solid var(--color-candy-rose)",
          }}
        >
          <span className="text-[14px]">👑</span>
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--color-badge-rose-text)", fontFamily: "var(--font-body)" }}
          >
            Premium Active
          </span>
        </div>

        {/* What you get */}
        <div
          className="rounded-xl p-5 mb-8 text-left"
          style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}
        >
          <p className="label mb-3" style={{ color: "var(--color-candy-rose)" }}>
            What&apos;s Unlocked
          </p>
          <ul className="flex flex-col gap-2">
            {[
              "All PYQs — 10+ years, every subject",
              "Premium PDF notes & revision material",
              "Exam Booster content",
              "Streak freeze (1/month)",
              "Ad-free experience",
            ].map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 text-[13px]"
                style={{ color: "var(--color-navy)", fontFamily: "var(--font-body)" }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0"
                  style={{ background: "rgba(197,247,232,0.2)", color: "var(--color-badge-mint-text)" }}
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Link href="/courses" className="btn btn-accent text-[14px] px-8 py-3">
          Start Exploring →
        </Link>
      </div>

      <style jsx>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes scaleIn {
          0% { transform: scale(0); }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </section>
  );
}
