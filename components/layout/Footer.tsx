"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const footerLinks = {
  Platform: [
    { label: "Courses", href: "/courses" },
    { label: "Practice Mode", href: "/courses" },
    { label: "Premium Access", href: "/upgrade" },
  ],
  Categories: [
    { label: "B.Pharm Resources", href: "/courses" },
    { label: "M.Pharm Notes", href: "/courses" },
    { label: "GPAT Prep", href: "/courses" },
    { label: "D.Pharm Docs", href: "/courses" },
  ],
  Support: [
    { label: "About PharmaCademy", href: "/about" },
    { label: "Get in Touch", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
  ],
};

export default function Footer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer
      className="mt-auto"
      style={{ backgroundColor: "var(--color-charcoal)" }}
    >
      <div className="container-main py-12">
        {/* Top — Logo + Link Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center">
              <span
                className="text-[16px] font-medium tracking-tight"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-cream)",
                }}
              >
                Pharma
              </span>
              <span
                className="text-[16px] font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-candy-rose)",
                }}
              >
                Cademy
              </span>
            </div>
            <p
              className="text-[13px] leading-relaxed max-w-[260px]"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-slate)",
              }}
            >
              Built to solve the problem of scattered study material and help
              pharmacy students prepare efficiently.
            </p>
            <p
              className="text-[11px] mt-2"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-slate)",
              }}
            >
              Created by{" "}
              <span style={{ color: "var(--color-candy-rose)" }}>
                Priyanshu
              </span>
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="flex flex-col gap-3">
              <h4
                className="text-[12px] font-medium uppercase tracking-[0.12em]"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-candy-rose)",
                }}
              >
                {title}
              </h4>
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[13px] transition-colors duration-150"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "rgba(253, 252, 251, 0.45)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--color-cream)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color =
                      "rgba(253, 252, 251, 0.45)")
                  }
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          className="mt-10 mb-6"
          style={{
            height: "0.5px",
            background: "rgba(253, 252, 251, 0.08)",
          }}
        />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-[11px]"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-slate)",
            }}
          >
            © {mounted ? new Date().getFullYear() : "2024"} PharmaCademy. All rights reserved.
          </p>
          <p
            className="text-[11px]"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-slate)",
            }}
          >
            Pharmacy, refined. 💊
          </p>
        </div>
      </div>
    </footer>
  );
}
