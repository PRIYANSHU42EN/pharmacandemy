"use client";

import React from "react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Failed to load data", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-2xl border w-full min-h-[300px]" style={{ borderColor: 'rgba(239,68,68,0.1)', background: 'rgba(239,68,68,0.02)' }}>
      <span className="text-[32px] mb-4">⚠️</span>
      <h3 className="text-[18px] font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-navy)" }}>
        Something went wrong
      </h3>
      <p className="text-[14px] text-center max-w-sm mb-6" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          style={{ background: "var(--color-navy)", color: "var(--color-cream)", fontFamily: "var(--font-body)" }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
