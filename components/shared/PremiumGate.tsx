"use client";

import { type ReactNode } from "react";

interface PremiumGateProps {
  /** The content to gate (now always visible) */
  children: ReactNode;
  /** Unused but kept for compatibility */
  isPremium?: boolean;
  /** Unused but kept for compatibility */
  userHasPremium?: boolean;
}

/**
 * PremiumGate - Previously used to gate premium content.
 * Now acts as a pass-through component as all content is free.
 */
export default function PremiumGate({
  children,
}: PremiumGateProps) {
  return <>{children}</>;
}
