"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import PracticeCard from "@/components/shared/PracticeCard";
import PremiumGate from "@/components/shared/PremiumGate";
import { useSubject } from "@/hooks/useFirestore";
import { useAuth } from "@/components/providers/AuthProvider";
import { MOCK_PRACTICE_QUESTIONS } from "@/lib/mock-data";

interface Params {
  id: string;
}

export default function PracticeModePage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { subject, loading: subjectLoading } = useSubject(id);
  const { isPremium: userHasPremium, loading: authLoading } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);

  const loading = subjectLoading || authLoading;

  const [questions, setQuestions] = useState(MOCK_PRACTICE_QUESTIONS);

  useEffect(() => {
    // Shuffle questions for session only on client
    setQuestions([...MOCK_PRACTICE_QUESTIONS].sort(() => Math.random() - 0.5));
  }, []);

  const subjectName = id.replace(/^sub-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const handleNext = () => {
    setAnsweredCount((c) => c + 1);
    if (currentIndex + 1 >= questions.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const toggleBookmark = () => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <section className="py-20 text-center" style={{ minHeight: "calc(100vh - 64px)" }}>
        <span className="text-[24px] block mb-2 animate-pulse">🎯</span>
        <p style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Loading session…</p>
      </section>
    );
  }

  if (sessionComplete) {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4" style={{ background: "#F9F8F7" }}>
        <div className="text-center max-w-md">
          <span className="text-[56px] block mb-4">🎯</span>
          <h1 className="text-[28px] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Session Complete!
          </h1>

          {/* Stats */}
          <div
            className="rounded-xl p-6 mb-6 text-left"
            style={{ background: "var(--color-cream)", border: "0.5px solid #e0e0e0" }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <span className="text-[32px] font-bold block" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}>
                  {answeredCount}
                </span>
                <span className="text-[12px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                  Questions Answered
                </span>
              </div>
              <div className="text-center">
                <span className="text-[32px] font-bold block" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-lavender)" }}>
                  {bookmarked.size}
                </span>
                <span className="text-[12px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                  Bookmarked
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setAnsweredCount(0);
                setBookmarked(new Set());
                setSessionComplete(false);
              }}
              className="btn btn-accent text-[13px]"
            >
              Practice Again
            </button>
            <Link href={`/subjects/${id}`} className="btn btn-ghost text-[13px]">
              Back to Subject
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href={`/subjects/${id}`}
              className="text-[12px] font-medium flex items-center gap-1 mb-2 transition-colors"
              style={{ color: "var(--color-candy-rose)", fontFamily: "var(--font-body)" }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to {subjectName}
            </Link>
            <h1 className="text-[24px] sm:text-[28px]" style={{ fontFamily: "var(--font-display)" }}>
              Practice Mode
            </h1>
          </div>

          <div className="text-right">
            <span className="text-[11px] block mb-0.5" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
              Bookmarked
            </span>
            <span className="text-[18px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-lavender)" }}>
              {bookmarked.size}
            </span>
          </div>
        </div>

        <PremiumGate isPremium={subject?.isPremium ?? false} userHasPremium={userHasPremium}>
          <PracticeCard
            question={questions[currentIndex].question}
            answer={questions[currentIndex].answer}
            index={currentIndex}
            total={questions.length}
            isBookmarked={bookmarked.has(currentIndex)}
            onBookmark={toggleBookmark}
            onNext={handleNext}
          />
        </PremiumGate>
      </div>
    </section>
  );
}
