"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  /** Number of skeleton items to render (for lists) */
  count?: number;
}

function SkeletonPulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg", className)}
      style={{ background: "rgba(26, 31, 60, 0.06)", ...style }}
    />
  );
}

/** Skeleton card placeholder matching ResourceCard dimensions */
export function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "0.5px solid #e5e5e5" }}
    >
      <SkeletonPulse className="h-[140px] rounded-none" />
      <div className="p-5 flex flex-col gap-3">
        <SkeletonPulse className="h-4 w-16 rounded-full" />
        <SkeletonPulse className="h-5 w-3/4" />
        <SkeletonPulse className="h-4 w-full" />
        <SkeletonPulse className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/** Skeleton grid — fills a content-grid with placeholder cards */
export function SkeletonGrid({ count = 6 }: SkeletonProps) {
  return (
    <div className="content-grid" style={{ gap: "24px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Skeleton text lines */
export function SkeletonText({ count = 3, className }: SkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPulse
          key={i}
          className={cn("h-4", i === count - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export default SkeletonPulse;
