"use client";

import { use, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/shared/Breadcrumb";
import PremiumGate from "@/components/shared/PremiumGate";
import Badge from "@/components/ui/Badge";
import SkeletonPulse from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { useResource } from "@/hooks/useFirestore";
import { useAuth } from "@/components/providers/AuthProvider";
import { TAG_TO_BADGE, TAG_LABELS, RESOURCE_TYPE_LABELS } from "@/types";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/ui/PdfViewer"), { ssr: false, loading: () => <SkeletonPulse className="w-full rounded-2xl shadow-sm" style={{ height: "80vh", minHeight: "500px" }} /> });
const VideoPlayer = dynamic(() => import("@/components/ui/VideoPlayer"), { ssr: false, loading: () => <SkeletonPulse className="w-full rounded-2xl shadow-sm" style={{ paddingBottom: "56.25%" }} /> });

interface Params {
  id: string;
}

export default function ResourceViewerPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);

  const { resource, loading, error } = useResource(id);
  const { user, isPremium, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Track resource view
  useEffect(() => {
    if (resource && !loading) {
      const trackView = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.track({ 
          eventType: "view", 
          resourceId: id,
          metadata: { title: resource.title, type: resource.type }
        });
      };
      trackView();
    }
  }, [resource, loading, id]);

  if (error) {
    return (
      <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
        <div className="container-main max-w-3xl pt-20">
          <ErrorState message={error.message || "Failed to load resource"} onRetry={() => window.location.reload()} />
        </div>
      </section>
    );
  }

  if (loading || authLoading || (!user && !authLoading)) {
    return (
      <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
        <div className="container-main max-w-5xl">
          <SkeletonPulse className="h-4 w-1/3 mb-6" />
          <div className="mt-6">
            <div className="mb-6 flex gap-2">
              <SkeletonPulse className="h-6 w-16 rounded-full" />
              <SkeletonPulse className="h-6 w-20 rounded-full" />
            </div>
            <SkeletonPulse className="h-8 w-1/2 mb-6" />
            <SkeletonPulse className="w-full rounded-2xl" style={{ height: "60vh", minHeight: "400px" }} />
          </div>
        </div>
      </section>
    );
  }

  if (!resource) {
    return (
      <section className="py-20 text-center" style={{ minHeight: "calc(100vh - 64px)" }}>
        <span className="text-[48px] block mb-4">📭</span>
        <h1 className="text-[28px]" style={{ fontFamily: "var(--font-display)" }}>Resource Not Found</h1>
        <p className="text-[15px] mt-2" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
          This resource doesn&apos;t exist or has been removed.
        </p>
        <Link href="/courses" className="btn btn-accent mt-6 text-[13px]">Browse Courses</Link>
      </section>
    );
  }

  const isVideo = resource.type === "video";
  const isPdf = resource.type === "pdf" || resource.type === "pyq";
  const typeName = RESOURCE_TYPE_LABELS[resource.type];

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-5xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: resource.title },
          ]}
        />

        <div className="mt-6">
          {/* Resource metadata */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Badge variant={resource.type === "pyq" ? "rose" : resource.type === "pdf" ? "lavender" : resource.type === "video" ? "peach" : "mint"}>
              {typeName}
            </Badge>
            {resource.tags.map((tag) => (
              <Badge key={tag} variant={TAG_TO_BADGE[tag]}>
                {TAG_LABELS[tag]}
              </Badge>
            ))}
            {resource.year && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(26,31,60,0.06)",
                  color: "var(--color-mid)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {resource.year}
              </span>
            )}
            {resource.isPremium && (
              <span
                className="text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{
                  background: "rgba(247,197,216,0.15)",
                  color: "var(--color-badge-rose-text)",
                  fontFamily: "var(--font-body)",
                }}
              >
                👑 Premium
              </span>
            )}
          </div>

          <h1 className="text-[24px] sm:text-[28px] mb-6" style={{ fontFamily: "var(--font-display)" }}>
            {resource.title}
          </h1>

          {/* Content area */}
          <PremiumGate isPremium={resource.isPremium} userHasPremium={isPremium}>
            {isVideo && (
              <VideoPlayer url={resource.url || ""} title={resource.title} />
            )}

            {isPdf && (
              <PdfViewer url={resource.url || ""} title={resource.title} />
            )}

            {!isVideo && !isPdf && (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: "rgba(26,31,60,0.02)", border: "0.5px solid #e0e0e0" }}
              >
                <span className="text-[48px] block mb-4">
                  {resource.type === "important" ? "⭐" : "🧠"}
                </span>
                <h3 className="text-[18px] font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {resource.type === "important" ? "Important Questions" : "Practice Questions"}
                </h3>
                <p className="text-[14px] max-w-md mx-auto mb-6" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
                  {resource.type === "important"
                    ? "Curated high-yield questions marked by frequency analysis."
                    : "Answer questions in flashcard format with reveal and bookmark features."}
                </p>
                {resource.type === "practice" && (
                  <Link
                    href={`/subjects/${resource.subjectId}/practice`}
                    className="btn btn-accent text-[13px]"
                  >
                    Start Practice →
                  </Link>
                )}
              </div>
            )}
          </PremiumGate>

          {/* Back link */}
          <div className="mt-8">
            <Link
              href={`/subjects/${resource.subjectId}`}
              className="text-[13px] font-medium flex items-center gap-1.5 transition-all hover:gap-2.5"
              style={{ color: "var(--color-candy-rose)", fontFamily: "var(--font-body)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Subject
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
