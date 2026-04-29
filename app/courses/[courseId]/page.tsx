"use client";

import { use } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/shared/Breadcrumb";
import Badge from "@/components/ui/Badge";
import { useCourse, useSubjects } from "@/hooks/useFirestore";
import SkeletonPulse, { SkeletonText } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";

interface Params {
  courseId: string;
}

export default function CourseDetailPage({ params }: { params: Promise<Params> }) {
  const { courseId } = use(params);
  const { course, loading: courseLoading, error: courseError, refresh: refreshCourse } = useCourse(courseId);
  const { subjects, loading: subsLoading, error: subsError, refresh: refreshSubjects } = useSubjects(courseId);

  const loading = courseLoading || subsLoading;
  const error = courseError || subsError;

  if (error) {
    return (
      <div className="container-main py-20 max-w-3xl">
        <ErrorState 
          message={error.message || "Failed to load course details."} 
          onRetry={() => {
            refreshCourse();
            refreshSubjects();
          }} 
        />
      </div>
    );
  }

  if (loading) {
    return (
      <section className="py-20 text-center" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="container-main max-w-4xl">
          <SkeletonPulse className="h-10 w-1/2 mx-auto mb-4" />
          <SkeletonPulse className="h-4 w-3/4 mx-auto mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card flex flex-col h-full" style={{ border: "0.5px solid #e5e5e5" }}>
                <SkeletonPulse className="h-[120px] rounded-none" />
                <div className="p-4 flex flex-col gap-3">
                  <SkeletonPulse className="h-4 w-20" />
                  <SkeletonPulse className="h-6 w-3/4" />
                  <SkeletonText count={2} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!course) {
    return (
      <section className="py-20 text-center" style={{ minHeight: "calc(100vh - 64px)" }}>
        <h1 className="text-[28px]" style={{ fontFamily: "var(--font-display)" }}>Course Not Found</h1>
        <Link href="/courses" className="btn btn-accent mt-6 text-[13px]">
          Browse Courses
        </Link>
      </section>
    );
  }

  // Group subjects by semesterNumber if available
  const subjectsBySem = subjects.reduce((acc, sub) => {
    const sem = sub.semesterNumber || 0;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(sub);
    return acc;
  }, {} as Record<number, typeof subjects>);

  const semesters = Object.keys(subjectsBySem).map(Number).sort((a, b) => a - b);

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: course.name },
          ]}
        />

        {/* Header */}
        <div className="mt-6 mb-10">
          <h1 className="text-[32px] sm:text-[36px] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            {course.name}
          </h1>
          <p className="text-[16px] max-w-xl" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
            {course.description || "Access all study resources and subjects for this course."}
          </p>
        </div>

        {/* Subjects List */}
        <div className="space-y-12">
          {semesters.length > 0 ? (
            semesters.map((semNum) => (
              <div key={semNum}>
                {semNum > 0 && (
                  <h2 className="text-[20px] font-bold mb-6 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                    <span className="w-8 h-8 rounded-full bg-navy text-candy-rose flex items-center justify-center text-[14px]">
                      {semNum}
                    </span>
                    Semester {semNum}
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjectsBySem[semNum].map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/subjects/${subject.id}`}
                      className="card group flex flex-col"
                    >
                      <div
                        className="h-[120px] flex items-center justify-center relative"
                        style={{
                          background: subject.isPremium
                            ? "linear-gradient(145deg, rgba(247,197,216,0.2), rgba(216,197,247,0.15))"
                            : "linear-gradient(145deg, rgba(197,247,232,0.15), rgba(197,232,247,0.1))",
                        }}
                      >
                        <span className="text-[40px] group-hover:scale-110 transition-transform">📚</span>
                        {subject.isPremium && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center bg-navy/80">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="var(--color-candy-rose)" strokeWidth="1.2" />
                              <path d="M4 5V3.5a2 2 0 114 0V5" stroke="var(--color-candy-rose)" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                           <Badge variant={subject.isPremium ? "rose" : "mint"}>
                            {subject.isPremium ? "Premium" : "Free"}
                          </Badge>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {subject.resourceCount || 0} items
                          </span>
                        </div>
                        <h3 className="text-[17px] font-bold group-hover:text-candy-rose transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                          {subject.name}
                        </h3>
                        {subject.description && (
                          <p className="text-[13px] text-gray-500 line-clamp-2" style={{ fontFamily: "var(--font-body)" }}>
                            {subject.description}
                          </p>
                        )}
                        <div className="mt-auto pt-3">
                           <span className="text-[11px] font-bold text-candy-rose flex items-center gap-1 group-hover:gap-2 transition-all">
                              View Resources →
                           </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
               <p className="text-gray-400 text-[15px]">No subjects found for this course yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
