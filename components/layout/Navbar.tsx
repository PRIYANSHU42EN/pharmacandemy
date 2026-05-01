"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, userProfile, loading } = useAuth();
  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change / resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setIsMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-250 ease-out touch-none lg:touch-auto",
        isScrolled
          ? "h-[48px] shadow-[var(--shadow-nav)]"
          : "h-[64px]"
      )}
      style={{ backgroundColor: "var(--color-navy)" }}
    >
      <div className="container-main h-full flex items-center justify-between">
        {/* Logo — Design Doc §06: "Pharma" DM Sans + "Candy" Candy Rose Playfair 700 */}
        <Link href="/" className="flex items-center gap-0 shrink-0" aria-label="PharmaCademy Home">
          <span
            className="text-[16px] font-medium tracking-tight logo-reset"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-cream)",
            }}
          >
            Pharma
          </span>
          <span
            className="text-[16px] font-bold logo-reset"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-candy-rose)",
            }}
          >
            Cademy
          </span>
        </Link>

        {/* Desktop Nav Links — DM Sans 400 13px */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] transition-colors duration-150"
              style={{
                fontFamily: "var(--font-body)",
                color: "rgba(253, 252, 251, 0.55)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-cream)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(253, 252, 251, 0.55)")
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Section */}
        <div className="hidden lg:flex items-center gap-4">
          {!loading && !user && (
            <>
              <Link
                href="/login"
                className="text-[13px] transition-colors duration-150"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "rgba(253, 252, 251, 0.55)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-cream)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253, 252, 251, 0.55)")}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-[12px] font-medium px-5 py-[7px] rounded-[20px] transition-all duration-150 hover:scale-[1.03]"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-candy-rose)",
                  background: "rgba(247, 197, 216, 0.10)",
                  border: "0.5px solid var(--color-candy-rose)",
                }}
              >
                Sign Up
              </Link>
            </>
          )}

          {!loading && user && (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-[12px] font-bold px-4 py-[7px] rounded-[20px] transition-all duration-150 hover:scale-[1.03] border border-white/20 text-white/80 hover:text-white hover:bg-white/5"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/profile"
                className="text-[12px] font-medium px-5 py-[7px] rounded-[20px] transition-all duration-150 hover:scale-[1.03]"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-candy-mint)",
                  background: "rgba(197, 247, 232, 0.10)",
                  border: "0.5px solid var(--color-candy-mint)",
                }}
              >
                {userProfile?.displayName?.split(" ")[0] || user.displayName?.split(" ")[0] || "Profile"}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden flex flex-col gap-[5px] p-2 -mr-2"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileOpen}
        >
          <span
            className={cn(
              "block w-5 h-[1.5px] transition-all duration-200",
              isMobileOpen && "rotate-45 translate-y-[6.5px]"
            )}
            style={{ background: "var(--color-cream)" }}
          />
          <span
            className={cn(
              "block w-5 h-[1.5px] transition-all duration-200",
              isMobileOpen && "opacity-0"
            )}
            style={{ background: "var(--color-cream)" }}
          />
          <span
            className={cn(
              "block w-5 h-[1.5px] transition-all duration-200",
              isMobileOpen && "-rotate-45 -translate-y-[6.5px]"
            )}
            style={{ background: "var(--color-cream)" }}
          />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={cn(
          "lg:hidden overflow-hidden transition-all duration-300 ease-in-out",
          isMobileOpen ? "max-h-[85vh] opacity-100 overflow-y-auto" : "max-h-0 opacity-0"
        )}
        style={{ backgroundColor: "var(--color-charcoal)" }}
      >
        <nav className="container-main py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] py-3 px-3 rounded-lg transition-colors duration-150"
              style={{
                fontFamily: "var(--font-body)",
                color: "rgba(253, 252, 251, 0.7)",
              }}
              onClick={() => setIsMobileOpen(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-cream)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(253, 252, 251, 0.7)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {link.label}
            </Link>
          ))}
          {!loading && !user ? (
            <>
              <Link
                href="/login"
                className="btn-ghost mt-2 text-center text-[12px] font-medium"
                style={{ fontFamily: "var(--font-body)", color: "var(--color-cream)", borderColor: "rgba(255,255,255,0.1)" }}
                onClick={() => setIsMobileOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="btn-accent mt-2 text-center text-[12px] font-medium"
                style={{ fontFamily: "var(--font-body)" }}
                onClick={() => setIsMobileOpen(false)}
              >
                Sign Up
              </Link>
            </>
          ) : !loading && user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="btn-ghost mt-2 text-center text-[12px] font-bold"
                  style={{ fontFamily: "var(--font-body)", color: "var(--color-candy-rose)", borderColor: "var(--color-candy-rose)" }}
                  onClick={() => setIsMobileOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/profile"
                className="btn-accent mt-3 text-center text-[12px] font-medium"
                style={{ fontFamily: "var(--font-body)", background: "var(--color-candy-mint)", color: "var(--color-navy)" }}
                onClick={() => setIsMobileOpen(false)}
              >
                {userProfile?.displayName?.split(" ")[0] || user.displayName?.split(" ")[0] || "Profile"}
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
