"use client";

import Link from "next/link";

interface PremiumGateProps {
  /** Whether the content is premium */
  isPremium: boolean;
  /** Whether the current user has premium */
  userHasPremium: boolean;
  /** Whether the current user's email is verified */
  emailVerified?: boolean;
  /** The content to gate */
  children: React.ReactNode;
}

export default function PremiumGate({
  isPremium,
  userHasPremium,
  emailVerified = true, // Default to true if not provided (for simplicity in some contexts)
  children,
}: PremiumGateProps) {
  // If content is not premium AND (verification not required OR user is verified), show content
  if (!isPremium && emailVerified) {
    return <>{children}</>;
  }
  
  // If user has premium AND is verified, show content
  if (userHasPremium && emailVerified) {
    return <>{children}</>;
  }

  // Determine which message to show
  const needsVerification = !emailVerified;

  return (
    <div className="relative">
      {/* Blurred content preview mockup (Strict Security Mode) */}
      <div className="blur-[8px] pointer-events-none select-none opacity-40 bg-gray-200">
        <div className="h-[400px] w-full flex flex-col gap-4 p-8">
           <div className="h-8 bg-gray-300 rounded w-3/4"></div>
           <div className="h-4 bg-gray-300 rounded w-1/2"></div>
           <div className="h-full bg-gray-300 rounded-xl mt-4"></div>
        </div>
      </div>

      {/* Gate overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="text-center px-8 py-10 rounded-2xl max-w-sm mx-4"
          style={{
            background: "rgba(26, 31, 60, 0.92)",
            backdropFilter: "blur(20px)",
            border: "0.5px solid rgba(247, 197, 216, 0.2)",
          }}
        >
          {/* Lock icon */}
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(247, 197, 216, 0.12)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="5"
                y="11"
                width="14"
                height="10"
                rx="2"
                stroke="var(--color-candy-rose)"
                strokeWidth="1.5"
              />
              <path
                d="M8 11V7a4 4 0 118 0v4"
                stroke="var(--color-candy-rose)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h3
            className="text-[18px] font-bold mb-2"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-cream)",
            }}
          >
            {needsVerification ? "Email Verification Required" : "You are not a premium member"}
          </h3>
          <p
            className="text-[13px] mb-5 leading-relaxed"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-slate)",
            }}
          >
            {needsVerification 
              ? "Please verify your email address to access this content. Check your inbox for the verification link."
              : "This content is locked. Upgrade to premium to unlock full access to PYQs, Exam Boosters, and premium PDFs for just ₹40/month."}
          </p>

          {needsVerification ? (
            <button
              onClick={() => window.location.reload()}
              className="btn btn-accent text-[13px] px-6 py-2.5"
            >
              I've Verified →
            </button>
          ) : (
            <Link
              href="/upgrade"
              className="btn btn-accent text-[13px] px-6 py-2.5"
            >
              Unlock Premium →
            </Link>
          )}

          <p
            className="mt-3 text-[11px]"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-slate)",
            }}
          >
            UPI • Cards • Net Banking
          </p>
        </div>
      </div>
    </div>
  );
}
