"use client";

import { cn } from "@/lib/utils";
import type { BadgeVariant } from "@/types";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  rose: "badge-rose",
  lavender: "badge-lavender",
  mint: "badge-mint",
  peach: "badge-peach",
  navy: "badge-navy",
};

export default function Badge({ variant = "rose", children, className }: BadgeProps) {
  return (
    <span className={cn("badge", variantMap[variant], className)}>
      {children}
    </span>
  );
}
