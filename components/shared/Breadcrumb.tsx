"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 flex-wrap text-[13px]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M5 3l4 4-4 4"
                  stroke="var(--color-slate)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {isLast || !item.href ? (
              <span
                className="truncate max-w-[160px]"
                style={{
                  color: isLast ? "var(--color-navy)" : "var(--color-slate)",
                  fontWeight: isLast ? 500 : 400,
                }}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="truncate max-w-[160px] transition-colors hover:text-[var(--color-candy-rose)]"
                style={{ color: "var(--color-slate)" }}
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
