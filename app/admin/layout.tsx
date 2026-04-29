"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_LINKS } from "@/constants";

const ICON_MAP: Record<string, React.ReactNode> = {
  BarChart3: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="8" width="3" height="8" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="7.5" y="4" width="3" height="12" rx="1" fill="currentColor" />
      <rect x="13" y="6" width="3" height="10" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  BookOpen: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h5.5a2.5 2.5 0 012.5 2.5V16a1.5 1.5 0 00-1.5-1.5H1V3z" />
      <path d="M17 3h-5.5A2.5 2.5 0 009 5.5V16a1.5 1.5 0 011.5-1.5H17V3z" />
    </svg>
  ),
  Users: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3" />
      <path d="M1 16v-1a4 4 0 018 0v1" />
      <circle cx="13" cy="6" r="2" />
      <path d="M17 16v-1a3 3 0 00-4-2.8" />
    </svg>
  ),
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading, userProfile } = useAuth();

  useEffect(() => {
    // PHASE 5: DEBUG
    console.log("USER:", user);
    console.log("ROLE:", userProfile?.role);
    console.log("LOADING:", loading);

    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!isAdmin) {
        router.replace("/courses");
      }
    }
  }, [user, isAdmin, loading, router, userProfile]);

  // Block UI rendering completely until auth state is resolved
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <p className="text-[14px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
          Checking authorization...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // The useEffect handles redirection
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar — Desktop */}
      <aside
        className="hidden lg:flex flex-col w-[240px] shrink-0 py-6 px-4"
        style={{
          background: "var(--color-navy)",
          borderRight: "0.5px solid rgba(253,252,251,0.06)",
        }}
      >
        <div className="mb-6 px-2">
          <p className="label" style={{ color: "var(--color-candy-rose)" }}>
            Admin Panel
          </p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {ADMIN_NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all",
                )}
                style={{
                  fontFamily: "var(--font-body)",
                  color: isActive ? "var(--color-cream)" : "var(--color-slate)",
                  background: isActive ? "rgba(247,197,216,0.1)" : "transparent",
                }}
              >
                <span style={{ color: isActive ? "var(--color-candy-rose)" : "var(--color-slate)" }}>
                  {ICON_MAP[link.icon]}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg transition-colors"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-slate)",
          }}
        >
          ← Back to Site
        </Link>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2"
        style={{
          background: "var(--color-navy)",
          borderTop: "0.5px solid rgba(253,252,251,0.06)",
        }}
      >
        {ADMIN_NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
              style={{
                color: isActive ? "var(--color-candy-rose)" : "var(--color-slate)",
              }}
            >
              {ICON_MAP[link.icon]}
              <span className="text-[9px] font-medium" style={{ fontFamily: "var(--font-body)" }}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
