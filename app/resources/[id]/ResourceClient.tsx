"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/shared/Breadcrumb";
import PremiumGate from "@/components/shared/PremiumGate";
import Badge from "@/components/ui/Badge";
import SkeletonPulse from "@/components/ui/Skeleton";
import { useAuth } from "@/components/providers/AuthProvider";
import { TAG_TO_BADGE, TAG_LABELS, RESOURCE_TYPE_LABELS, Resource } from "@/types";
import dynamic from "next/dynamic";

const ProViewer = dynamic(() => import("@/components/pdf/ProViewer"), { 
  ssr: false, 
  loading: () => <SkeletonPulse className="w-full rounded-2xl shadow-sm" style={{ height: "90vh", minHeight: "600px" }} /> 
});
const VideoPlayer = dynamic(() => import("@/components/ui/VideoPlayer"), { ssr: false, loading: () => <SkeletonPulse className="w-full rounded-2xl shadow-sm" style={{ paddingBottom: "56.25%" }} /> });

export default function ResourceClient({ resource, id }: { resource: Resource; id: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const isVideo = resource.type === "video";
  const isPdf = resource.type === "pdf" || resource.type === "pyq";
  const typeName = RESOURCE_TYPE_LABELS[resource.type];

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const trackView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.track({ 
        eventType: "view", 
        resourceId: id,
        metadata: { title: resource.title, type: resource.type }
      });
    };
    trackView();
  }, [id, resource.title, resource.type]);

  useEffect(() => {
    const fetchAccess = async () => {
      if (authLoading) return;
      if (!user) {
        setAccessLoading(false);
        return;
      }

      if (resource.type !== "pdf" && resource.type !== "video" && resource.type !== "pyq") {
        setAccessLoading(false);
        return;
      }

      try {
        setAccessLoading(true);
        const token = await user.getIdToken();
        const res = await fetch("/api/resources/verify-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ resourceId: id })
        });
        
        const data = await res.json();
        
        if (res.ok && data.authorized) {
          let finalUrl = data.url;
          if (isPdf && finalUrl) {
            const token = await user.getIdToken();
            setSecureUrl(`/api/pdf?path=${encodeURIComponent(finalUrl)}&token=${token}`);
          } else {
            setSecureUrl(finalUrl);
          }
          setAccessError(null);
        } else {
          setSecureUrl(null);
          if (res.status !== 403) {
            setAccessError(data.error || "Failed to authorize access");
          }
        }
      } catch (err: any) {
        setAccessError("Network error checking access");
      } finally {
        setAccessLoading(false);
      }
    };

    fetchAccess();
  }, [id, resource, user, authLoading, isPdf]);

  if (accessError) {
    return (
      <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
        <div className="container-main max-w-3xl pt-20">
          <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-red-100">
             <h2 className="text-xl font-bold text-red-600 mb-2">Access Error</h2>
             <p className="text-gray-600 mb-6">{accessError}</p>
             <button onClick={() => window.location.reload()} className="btn btn-primary">Retry</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="relative z-0 mt-8">
      <PremiumGate>
        {isVideo && secureUrl && (
          <VideoPlayer url={secureUrl} title={resource.title} />
        )}

        {isPdf && secureUrl && (
          <ProViewer 
            url={secureUrl} 
            title={resource.title} 
            resourceId={resource.id}
          />
        )}

        {accessLoading && (isVideo || isPdf) && (
          <SkeletonPulse className="w-full rounded-2xl" style={{ height: "60vh", minHeight: "400px" }} />
        )}

        {!isVideo && !isPdf && (
          <div className="rounded-2xl p-8 text-center bg-gray-50 border border-gray-200">
            <span className="text-[48px] block mb-4">
              {resource.type === "important" ? "⭐" : "🧠"}
            </span>
            <h3 className="text-[18px] font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              {resource.type === "important" ? "Important Questions" : "Practice Questions"}
            </h3>
            <p className="text-[14px] max-w-md mx-auto mb-6 text-gray-500 font-body">
              {resource.type === "important"
                ? "Curated high-yield questions marked by frequency analysis."
                : "Answer questions in flashcard format with reveal and bookmark features."}
            </p>
            {resource.type === "practice" && (
              <Link href={`/subjects/${resource.subjectId}/practice`} className="btn btn-accent text-[13px]">
                Start Practice →
              </Link>
            )}
          </div>
        )}
      </PremiumGate>

      <footer className="mt-8">
        <Link
          href={`/subjects/${resource.subjectId}`}
          className="text-[13px] font-medium flex items-center gap-1.5 text-rose-500 hover:gap-2.5 transition-all font-body"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Subject
        </Link>
      </footer>
    </div>
  );
}
