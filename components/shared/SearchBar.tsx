"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchBarProps {
  /** Placeholder text */
  placeholder?: string;
  /** Compact variant for mobile nav */
  variant?: "default" | "compact";
  className?: string;
}

export default function SearchBar({
  placeholder = "Search subjects, PYQs, topics…",
  variant = "default",
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPushedQuery = useRef(query);
  const router = useRouter();

  useEffect(() => {
    // Only automatically push if the user is actively focused AND the query actually changed
    if (isFocused && debouncedQuery !== lastPushedQuery.current) {
      router.push(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      lastPushedQuery.current = debouncedQuery;
    }
  }, [debouncedQuery, isFocused, router]);

  // Ctrl+K shortcut
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl transition-all duration-200",
          variant === "compact" ? "px-3 py-2" : "px-4 py-3"
        )}
        style={{
          background: isFocused
            ? "rgba(26, 31, 60, 0.04)"
            : "rgba(26, 31, 60, 0.02)",
          border: isFocused
            ? "1px solid var(--color-candy-rose)"
            : "1px solid rgba(26, 31, 60, 0.08)",
          boxShadow: isFocused
            ? "0 0 0 3px rgba(247, 197, 216, 0.15)"
            : "none",
        }}
      >
        {/* Search icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0"
        >
          <circle
            cx="7"
            cy="7"
            r="4.5"
            stroke={isFocused ? "var(--color-candy-rose)" : "var(--color-slate)"}
            strokeWidth="1.3"
          />
          <path
            d="M10.5 10.5l3 3"
            stroke={isFocused ? "var(--color-candy-rose)" : "var(--color-slate)"}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-navy)",
          }}
          aria-label="Search"
        />

        {/* Keyboard shortcut hint */}
        {variant === "default" && !query && (
          <kbd
            className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              background: "rgba(26, 31, 60, 0.06)",
              color: "var(--color-slate)",
              fontFamily: "var(--font-mono)",
              border: "0.5px solid rgba(26, 31, 60, 0.1)",
            }}
          >
            Ctrl+K
          </kbd>
        )}

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[rgba(26,31,60,0.06)]"
            aria-label="Clear search"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 2l6 6M8 2l-6 6"
                stroke="var(--color-slate)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
