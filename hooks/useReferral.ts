"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * useReferral hook
 * Captures the 'ref' query parameter from the URL and persists it to localStorage.
 */
export function useReferral() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  useEffect(() => {
    if (refCode) {
      console.log(`[Referral] 🎯 Captured referral code from URL: ${refCode}`);
      // Store in localStorage for later use during signup
      localStorage.setItem("refCode", refCode.toUpperCase());
    }
  }, [refCode]);

  return refCode;
}
