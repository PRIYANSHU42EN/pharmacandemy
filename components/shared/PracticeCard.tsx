"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PracticeCardProps {
  question: string;
  answer: string;
  index: number;
  total: number;
  isBookmarked?: boolean;
  onBookmark?: () => void;
  onNext?: () => void;
}

export default function PracticeCard({
  question,
  answer,
  index,
  total,
  isBookmarked = false,
  onBookmark,
  onNext,
}: PracticeCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden w-full max-w-2xl mx-auto"
      style={{
        background: "var(--color-cream)",
        border: "0.5px solid #e0e0e0",
      }}
    >
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "rgba(26,31,60,0.04)" }}>
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${((index + 1) / total) * 100}%`,
            background:
              "linear-gradient(90deg, var(--color-candy-rose), var(--color-candy-lavender))",
          }}
        />
      </div>

      <div className="p-6 sm:p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <span
            className="text-[12px] font-medium px-3 py-1 rounded-full"
            style={{
              background: "rgba(216, 197, 247, 0.15)",
              color: "var(--color-badge-lavender-text)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {index + 1} / {total}
          </span>

          <button
            onClick={onBookmark}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(247,197,216,0.1)]"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark question"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill={isBookmarked ? "var(--color-candy-rose)" : "none"}
              stroke={isBookmarked ? "var(--color-candy-rose)" : "var(--color-slate)"}
              strokeWidth="1.5"
            >
              <path d="M3 2h10v12.5l-5-3.5-5 3.5V2z" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Question */}
        <div className="mb-6">
          <p
            className="label mb-2"
            style={{ color: "var(--color-candy-rose)" }}
          >
            Question
          </p>
          <p
            className="text-[16px] sm:text-[17px] leading-[1.65]"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-navy)",
            }}
          >
            {question}
          </p>
        </div>

        {/* Answer area */}
        <div
          className={cn(
            "rounded-xl p-5 transition-all duration-300",
            revealed ? "opacity-100" : "opacity-0 h-0 p-0 overflow-hidden"
          )}
          style={{
            background: "rgba(197, 247, 232, 0.1)",
            border: revealed ? "0.5px solid rgba(197, 247, 232, 0.3)" : "none",
          }}
        >
          <p
            className="label mb-2"
            style={{ color: "var(--color-badge-mint-text)" }}
          >
            Answer
          </p>
          <p
            className="text-[15px] leading-[1.65]"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-navy)",
            }}
          >
            {answer}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="btn btn-accent w-full justify-center text-[13px] py-3"
            >
              Reveal Answer
            </button>
          ) : (
            <button
              onClick={() => {
                setRevealed(false);
                onNext?.();
              }}
              className="btn btn-primary w-full justify-center text-[13px] py-3"
            >
              Next Question →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
