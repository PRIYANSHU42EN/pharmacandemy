/* ==========================================================================
   Utility Functions
   ========================================================================== */

import { type ClassValue, clsx } from "clsx";

/**
 * Merge class names with clsx (Tailwind-safe)
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Generate a 6-character alphanumeric referral code
 */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Format currency in INR (₹)
 */
export function formatINR(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString("en-IN")}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Check if a date string (YYYY-MM-DD) is today
 */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return dateStr === `${y}-${m}-${d}`;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayStr(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
