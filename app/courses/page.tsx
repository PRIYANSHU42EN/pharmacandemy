"use client";

import Link from "next/link";
import SearchBar from "@/components/shared/SearchBar";
import { useCourses } from "@/hooks/useFirestore";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SkeletonPulse, { SkeletonText } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";

const COURSE_EMOJI: Record<string, string> = {
  bpharm: "💊",
  mpharm: "🔬",
  dpharm: "📋",
  pharmd: "🏥",
};

const COURSE_GRADIENT: Record<string, string> = {
  bpharm: "linear-gradient(145deg, rgba(247,197,216,0.25), rgba(216,197,247,0.1))",
  mpharm: "linear-gradient(145deg, rgba(216,197,247,0.25), rgba(197,247,232,0.1))",
  dpharm: "linear-gradient(145deg, rgba(197,247,232,0.25), rgba(247,223,197,0.1))",
  pharmd: "linear-gradient(145deg, rgba(247,223,197,0.25), rgba(197,232,247,0.1))",
};

export default function CoursesPage() {
  const { courses, loading, error, refresh } = useCourses();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F9F8F7]">
        <p style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Please log in to continue...</p>
      </div>
    );
  }

  return (
    <section className="py-12 lg:py-16" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="label mb-3" style={{ color: "var(--color-candy-rose)" }}>
            Browse Courses
          </p>
          <h1 className="text-[32px] sm:text-[36px] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Choose Your Course
          </h1>
          <p className="text-[16px] max-w-lg mx-auto" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
            Select your pharmacy program to access semester-wise study resources.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto mb-10">
          <SearchBar placeholder="Search courses, subjects, topics…" />
        </div>

        {/* Course Grid */}
        {error ? (
          <div className="max-w-3xl mx-auto">
             <ErrorState message={error.message || "Failed to load courses. Please try again."} onRetry={refresh} />
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card flex flex-col" style={{ border: "0.5px solid #e5e5e5", overflow: "hidden" }}>
                <SkeletonPulse className="h-[160px] rounded-none" />
                <div className="p-5 flex flex-col gap-3">
                  <SkeletonPulse className="h-6 w-1/2" />
                  <SkeletonText count={2} />
                  <div className="mt-auto pt-3">
                     <SkeletonPulse className="h-4 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {courses.map((course) => {
            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="card group flex flex-col"
                id={`course-card-${course.id}`}
              >
                {/* Header gradient */}
                <div
                  className="h-[160px] flex items-center justify-center relative"
                  style={{ background: COURSE_GRADIENT[course.code] || COURSE_GRADIENT.bpharm }}
                >
                  <span className="text-[56px] group-hover:scale-110 transition-transform duration-200">
                    {COURSE_EMOJI[course.code] || "📚"}
                  </span>

                  {/* Course identifier */}
                  <span
                    className="absolute top-4 right-4 text-[11px] font-medium px-2.5 py-1 rounded-full capitalize"
                    style={{
                      background: "rgba(26,31,60,0.06)",
                      color: "var(--color-mid)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {course.code}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-2 flex-1">
                  <h2
                    className="text-[20px] font-bold group-hover:text-[var(--color-candy-rose)] transition-colors"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {course.name}
                  </h2>
                  <p
                    className="text-[14px] leading-relaxed line-clamp-2"
                    style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}
                  >
                    {course.description}
                  </p>

                  {/* CTA */}
                  <div className="mt-auto pt-3">
                    <span
                      className="text-[12px] font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                      style={{ color: "var(--color-candy-rose)", fontFamily: "var(--font-body)" }}
                    >
                      View Subjects
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
