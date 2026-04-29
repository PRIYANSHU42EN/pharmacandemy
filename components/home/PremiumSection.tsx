"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function PremiumSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const premiumFeatures = [
    "All PYQs — last 10 years, every subject",
    "Premium PDF notes & fast revision material",
    "Exam Booster — high-yield expected questions",
    "Streak freeze — protect your streak once/month",
    "Ad-free, distraction-free study experience",
  ];

  return (
    <section className="dark-surface py-16 lg:py-24">
      <div
        ref={ref}
        className="container-main fade-in-up"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p
              className="label mb-4"
              style={{ color: "var(--color-candy-rose)" }}
            >
              Premium Access
            </p>
            <h2
              className="text-[28px] sm:text-[32px] mb-6"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-cream)",
              }}
            >
              Unlock Exam Booster Content
            </h2>
            <ul className="flex flex-col gap-3 mb-8">
              {premiumFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-[15px]"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "rgba(253,252,251,0.75)",
                  }}
                >
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] mt-[2px]"
                    style={{
                      background: "rgba(197,247,232,0.15)",
                      color: "var(--color-candy-mint)",
                    }}
                  >
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/upgrade" className="btn btn-accent text-[14px] px-8 py-3">
              Upgrade to Premium
            </Link>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div
              className="rounded-[16px] p-8 text-center w-full max-w-[320px]"
              style={{
                background: "rgba(253,252,251,0.04)",
                border: "0.5px solid rgba(253,252,251,0.1)",
              }}
            >
              <p
                className="text-[12px] uppercase tracking-[0.12em] mb-2"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-slate)",
                }}
              >
                Monthly Plan
              </p>
              <div className="flex items-baseline justify-center gap-1 mb-4">
                <span
                  className="text-[56px] font-bold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-candy-rose)",
                  }}
                >
                  ₹40
                </span>
                <span
                  className="text-[14px]"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-slate)",
                  }}
                >
                  /month
                </span>
              </div>
              <p
                className="text-[13px] mb-6"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-slate)",
                }}
              >
                Less than a cup of chai per day
              </p>
              <Link
                href="/upgrade"
                className="btn btn-accent text-[13px] w-full justify-center py-3"
              >
                Get Started Now
              </Link>
              <div className="flex justify-center gap-3 mt-4">
                {["UPI", "Cards", "Net Banking"].map((m) => (
                  <span
                    key={m}
                    className="text-[10px] uppercase tracking-[0.1em]"
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-slate)",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
