"use client";

import { useEffect, useRef } from "react";

const features = [
  {
    emoji: "📝",
    title: "Previous Year Questions",
    description:
      "Access 10+ years of PYQs organized by subject. Smart tags show most-asked and last-5-year patterns.",
    badge: "PYQs",
    badgeClass: "badge-rose",
    gradient: "linear-gradient(135deg, rgba(247,197,216,0.25), rgba(247,197,216,0.05))",
  },
  {
    emoji: "⭐",
    title: "Important Questions",
    description:
      "Curated high-yield questions marked by frequency analysis. Know exactly what to focus on before exams.",
    badge: "Smart",
    badgeClass: "badge-mint",
    gradient: "linear-gradient(135deg, rgba(197,247,232,0.25), rgba(197,247,232,0.05))",
  },
  {
    emoji: "📄",
    title: "PDF Notes",
    description:
      "In-app PDF viewer — no downloads, no app-switching. Pinch to zoom on mobile. Premium notes with blur gate.",
    badge: "In-App",
    badgeClass: "badge-lavender",
    gradient: "linear-gradient(135deg, rgba(216,197,247,0.25), rgba(216,197,247,0.05))",
  },
  {
    emoji: "🎬",
    title: "Video Lectures",
    description:
      "Embedded YouTube lectures with auto-resume. Pick up right where you left off. Theater mode on desktop.",
    badge: "Video",
    badgeClass: "badge-peach",
    gradient: "linear-gradient(135deg, rgba(247,223,197,0.25), rgba(247,223,197,0.05))",
  },
  {
    emoji: "🧠",
    title: "Practice Mode",
    description:
      "Flashcard-style practice sessions. Reveal answers, bookmark hard questions, track your progress per subject.",
    badge: "Practice",
    badgeClass: "badge-navy",
    gradient: "linear-gradient(135deg, rgba(26,31,60,0.08), rgba(26,31,60,0.02))",
  },
  {
    emoji: "🔥",
    title: "Daily Questions & Streaks",
    description:
      "One curated question per day keeps your streak alive. Hit milestones at 7, 30, and 100 days for badges.",
    badge: "Streaks",
    badgeClass: "badge-rose",
    gradient: "linear-gradient(135deg, rgba(247,197,216,0.2), rgba(247,223,197,0.1))",
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    const cards = sectionRef.current?.querySelectorAll(".fade-in-up");
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-16 lg:py-24"
      style={{ background: "#F9F8F7" }}
    >
      <div className="container-main">
        <div className="text-center mb-12">
          <p
            className="label mb-3"
            style={{ color: "var(--color-candy-rose)" }}
          >
            Features
          </p>
          <h2
            className="text-[28px] sm:text-[32px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Everything You Need to Ace Your Exams
          </h2>
        </div>

        <div className="content-grid" style={{ gap: "24px" }}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card fade-in-up flex flex-col"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div
                className="h-[140px] flex items-center justify-center"
                style={{ background: f.gradient }}
              >
                <span className="text-[48px]">{f.emoji}</span>
              </div>
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`badge ${f.badgeClass}`}>{f.badge}</span>
                </div>
                <h3
                  className="text-[18px] font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-[14px] leading-[1.6] flex-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-mid)",
                  }}
                >
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
