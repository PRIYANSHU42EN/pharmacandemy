"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Max width class e.g. "max-w-md" */
  size?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "max-w-lg",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(26,31,60,0.5)] backdrop-blur-sm animate-[fadeIn_150ms_ease]" />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full rounded-2xl p-6 shadow-xl animate-[slideUp_200ms_ease]",
          size,
          className
        )}
        style={{
          background: "var(--color-cream)",
          border: "0.5px solid #e5e5e5",
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-[18px] font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(26,31,60,0.06)]"
              aria-label="Close modal"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="var(--color-mid)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
