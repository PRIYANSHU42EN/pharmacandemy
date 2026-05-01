"use client";

import { cn } from "@/lib/utils";

interface StreakWidgetProps {
  streak: number;
  completedToday?: boolean;
  /** Compact variant for navbar; full variant for homepage/profile */
  variant?: "compact" | "full";
  className?: string;
}

export default function StreakWidget({
  streak,
  completedToday = false,
  variant = "full",
  className,
}: StreakWidgetProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium",
          className
        )}
        style={{
          background: completedToday
            ? "rgba(197, 247, 232, 0.15)"
            : "rgba(247, 197, 216, 0.12)",
          color: completedToday
            ? "var(--color-badge-mint-text)"
            : "var(--color-candy-rose)",
          fontFamily: "var(--font-body)",
        }}
      >
        <span className="text-[14px]">🔥</span>
        {streak}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl p-5 flex flex-col items-center gap-3",
        className
      )}
      style={{
        background:
          "linear-gradient(145deg, rgba(247,197,216,0.08), rgba(247,223,197,0.06))",
        border: "0.5px solid rgba(247, 197, 216, 0.15)",
      }}
    >
      {/* Flame + count */}
      <div className="flex items-center gap-2">
        <span className="text-[36px]">🔥</span>
        <span
          className="text-[42px] font-bold leading-none"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-navy)",
          }}
        >
          {streak}
        </span>
      </div>

      <p
        className="text-[13px] font-medium"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-mid)",
        }}
      >
        Day Streak
      </p>

      {/* Daily status */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
        style={{
          background: completedToday
            ? "rgba(197, 247, 232, 0.2)"
            : "rgba(247, 197, 216, 0.15)",
          color: completedToday
            ? "var(--color-badge-mint-text)"
            : "var(--color-badge-rose-text)",
          fontFamily: "var(--font-body)",
        }}
      >
        {completedToday ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6l2.5 2.5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Done today
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            Complete today&apos;s question
          </>
        )}
      </div>

      {/* Milestone dots */}
      <div className="flex gap-2 mt-1">
        {[7, 30, 100].map((milestone) => (
          <div
            key={milestone}
            className="flex flex-col items-center gap-0.5"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{
                background:
                  streak >= milestone
                    ? "var(--color-candy-mint)"
                    : "rgba(26, 31, 60, 0.06)",
                color:
                  streak >= milestone
                    ? "var(--color-badge-mint-text)"
                    : "var(--color-slate)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {milestone}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
