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
    { label: "D.Pharm Docs", href: "/courses" },
  ],
  Legal: [
    { label: "About Cubepharm", href: "/about" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Contact Support", href: "/contact" },
  ]
};

export default function Footer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer
      className="py-12 lg:py-16 mt-auto"
      style={{
        backgroundColor: "var(--color-navy)",
        borderTop: "0.5px solid rgba(253,252,251,0.05)",
      }}
    >
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-0 mb-6">
              <span
                className="text-[24px] font-medium"
                style={{ fontFamily: "var(--font-body)", color: "var(--color-cream)" }}
              >
                Cube
              </span>
              <span
                className="text-[24px] font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}
              >
                pharm
              </span>
            </div>
            <p className="text-[14px] max-w-sm" style={{ color: "rgba(253,252,251,0.5)", fontFamily: "var(--font-body)" }}>
               The ultimate learning platform for Pharmacy students in India. Access structured resources, PYQs, and premium notes anytime, anywhere.
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
            © {mounted ? new Date().getFullYear() : "2024"} Cubepharm. All rights reserved.
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
