"use client";

import { use, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/shared/Breadcrumb";
import ResourceCard from "@/components/shared/ResourceCard";
import Badge from "@/components/ui/Badge";
import { useSubject, useResources } from "@/hooks/useFirestore";
import SkeletonPulse, { SkeletonText } from "@/components/ui/Skeleton";
import type { ResourceType, ContentTag } from "@/types";

interface Params {
  id: string;
}

const TYPE_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pyq", label: "PYQs" },
  { value: "pdf", label: "PDFs" },
  { value: "video", label: "Videos" },
  { value: "important", label: "Important" },
  { value: "practice", label: "Practice" },
];

import ErrorState from "@/components/ui/ErrorState";

export default function SubjectPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("all");

  const { subject, loading: subLoading, error: subError, refresh: refreshSubject } = useSubject(id);
  const { resources, loading: resLoading, error: resError, refresh: refreshResources } = useResources(id);
  
  const loading = subLoading || resLoading;
  const error = subError || resError;

  if (error) {
    return (
      <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
        <div className="container-main max-w-3xl pt-20">
          <ErrorState 
            message={error.message || "Failed to load subject data"} 
            onRetry={() => {
              refreshSubject();
              refreshResources();
            }} 
          />
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
        <div className="container-main pt-10">
          <SkeletonPulse className="h-4 w-40 mb-6" />
          <div className="flex justify-between items-start mb-12">
            <div className="w-full max-w-md">
              <SkeletonPulse className="h-10 w-3/4 mb-3" />
              <SkeletonPulse className="h-4 w-1/2" />
            </div>
            <SkeletonPulse className="hidden sm:block h-10 w-32 rounded-lg" />
          </div>
          <div className="flex gap-2 mb-8 overflow-hidden">
             {[1,2,3,4,5].map(i => <SkeletonPulse key={i} className="h-8 w-20 rounded-full shrink-0" />)}
          </div>
          <div className="content-grid" style={{ gap: "16px" }}>
             {[1,2,3,4,5,6].map(i => (
               <div key={i} className="card h-[280px] p-4 flex flex-col gap-4" style={{ border: "0.5px solid #e5e5e5" }}>
                 <SkeletonPulse className="h-32 w-full rounded-xl" />
                 <SkeletonPulse className="h-6 w-3/4" />
                 <SkeletonText count={2} />
               </div>
             ))}
          </div>
        </div>
      </section>
    );
  }

  const subjectName = subject?.name || id.replace(/^sub-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Smart sections
  const examBoosters = resources.filter((r) => r.tags.includes("exam-booster" as ContentTag));
  const mostAsked = resources.filter((r) => r.tags.includes("most-asked" as ContentTag));
  const lastFiveYears = resources.filter((r) => r.tags.includes("last-5-years" as ContentTag));

  // Filtered resources
  const filtered = activeTab === "all"
    ? resources
    : resources.filter((r) => r.type === (activeTab as ResourceType));

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: subjectName },
          ]}
        />

        {/* Header */}
        <div className="mt-6 mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[28px] sm:text-[32px] mb-2" style={{ fontFamily: "var(--font-display)" }}>
              {subjectName}
            </h1>
            <p className="text-[15px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
              {resources.length} resources available
            </p>
          </div>
          <Link
            href={`/subjects/${id}/practice`}
            className="btn btn-primary text-[12px] px-5 py-2.5 shrink-0"
          >
            🧠 Practice Mode
          </Link>
        </div>

        {/* === Exam Booster Section (PRD §4.3.2) === */}
        {examBoosters.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Exam Booster
              </h2>
              <Badge variant="mint">Premium</Badge>
            </div>
            <div
              className="rounded-2xl p-5 mb-2"
              style={{
                background: "linear-gradient(145deg, rgba(197,247,232,0.12), rgba(216,197,247,0.08))",
                border: "0.5px solid rgba(197,247,232,0.2)",
              }}
            >
              <div className="content-grid" style={{ gap: "16px" }}>
                {examBoosters.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === Most Asked === */}
        {mostAsked.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Most Asked
              </h2>
              <Badge variant="rose">🔴 Frequently Asked</Badge>
            </div>
            <div className="content-grid" style={{ gap: "16px" }}>
              {mostAsked.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </div>
        )}

        {/* === Last 5 Years PYQs === */}
        {lastFiveYears.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Last 5 Years PYQs
              </h2>
              <Badge variant="peach">📋 Past Papers</Badge>
            </div>
            <div className="content-grid" style={{ gap: "16px" }}>
              {lastFiveYears.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </div>
        )}

        {/* === All Resources with Tabs === */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
              All Resources
            </h2>
          </div>

          {/* Type tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="text-[12px] font-medium px-4 py-2 rounded-full whitespace-nowrap transition-all"
                style={{
                  background:
                    activeTab === tab.value
                      ? "var(--color-navy)"
                      : "rgba(26,31,60,0.04)",
                  color:
                    activeTab === tab.value
                      ? "var(--color-candy-rose)"
                      : "var(--color-mid)",
                  fontFamily: "var(--font-body)",
                  border: activeTab === tab.value
                    ? "none"
                    : "0.5px solid rgba(26,31,60,0.08)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Resources grid */}
          {filtered.length > 0 ? (
            <div className="content-grid" style={{ gap: "16px" }}>
              {filtered.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-[40px] block mb-3">📭</span>
              <p className="text-[15px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                No {activeTab === "all" ? "" : activeTab} resources found for this subject.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
