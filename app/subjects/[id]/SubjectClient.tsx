"use client";

import { useState } from "react";
import ResourceCard from "@/components/shared/ResourceCard";
import type { ResourceType } from "@/types";

interface SubjectClientProps {
  resources: any[];
  subjectId: string;
}

const TYPE_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pyq", label: "PYQs" },
  { value: "pdf", label: "PDFs" },
  { value: "video", label: "Videos" },
  { value: "important", label: "Important" },
  { value: "practice", label: "Practice" },
];

export default function SubjectClient({ resources, subjectId }: SubjectClientProps) {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = activeTab === "all"
    ? resources
    : resources.filter((r) => r.type === (activeTab as ResourceType));

  return (
    <>
      {/* Type tabs */}
      <nav aria-label="Filter resources by type" className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
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
      </nav>

      {/* Resources grid */}
      {filtered.length > 0 ? (
        <div className="content-grid" style={{ gap: "16px" }}>
          {filtered.map((r, index) => (
            <ResourceCard key={r.id} resource={r} priority={index < 2} />
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
    </>
  );
}
