"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchBar from "@/components/shared/SearchBar";
import Badge from "@/components/ui/Badge";
import { useAllSubjects, useCourses } from "@/hooks/useFirestore";
import type { Subject } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [filter, setFilter] = useState("all");

  const { subjects: allSubjects, loading: subjectsLoading } = useAllSubjects();
  const { courses: allCourses } = useCourses();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const courseMap = new Map(allCourses.map(c => [c.id, c.name]));
    
    return allSubjects.filter(sub => 
      sub.name.toLowerCase().includes(q) ||
      sub.description?.toLowerCase().includes(q)
    ).map(sub => ({
      ...sub,
      courseName: courseMap.get(sub.courseId) || "Unknown Course"
    }));
  }, [query, allSubjects, allCourses]);

  const filtered = results;

  return (
    <>
      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <SearchBar placeholder="Search subjects, PYQs, topics…" />
      </div>

      {query ? subjectsLoading ? (
        <div className="text-center py-12 text-gray-400">Loading results...</div>
      ) : (
        <>
          <p className="text-[15px] mb-6" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;<span style={{ color: "var(--color-navy)", fontWeight: 500 }}>{query}</span>&quot;
          </p>

          {/* Results */}
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filtered.map((result) => (
                <Link
                  key={result.id}
                  href={`/subjects/${result.id}`}
                  className="group rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-md"
                  style={{
                    background: "var(--color-cream)",
                    border: "0.5px solid #e5e5e5",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-[24px] shrink-0"
                    style={{
                      background: "rgba(197,247,232,0.15)",
                    }}
                  >
                    📚
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-[15px] font-medium group-hover:text-[var(--color-candy-rose)] transition-colors"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {result.name}
                    </h3>
                    <p className="text-[12px] truncate" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                      {result.courseName} · {result.resourceCount} resources
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-40 group-hover:opacity-100 transition-opacity">
                      <path d="M5 3l4 4-4 4" stroke="var(--color-navy)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-[40px] block mb-3">🔍</span>
              <p className="text-[15px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                No results found for &quot;{query}&quot;. Try a different search term.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <span className="text-[48px] block mb-4">🔍</span>
          <h2 className="text-[24px] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Search Cubepharm
          </h2>
          <p className="text-[15px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
            Find subjects, PYQs, and study resources across all courses.
          </p>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main">
        <Suspense fallback={
          <div className="text-center py-16">
            <span className="text-[24px] block mb-2 animate-pulse">🔍</span>
            <p style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Loading search…</p>
          </div>
        }>
          <SearchContent />
        </Suspense>
      </div>
    </section>
  );
}
