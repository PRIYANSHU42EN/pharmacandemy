"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { Resource, BadgeVariant, ContentTag } from "@/types";
import { TAG_TO_BADGE, TAG_LABELS, RESOURCE_TYPE_LABELS } from "@/types";

interface ResourceCardProps {
  resource: Resource;
  /** Whether the current user has premium access */
  userHasPremium?: boolean;
  /** Whether the current user's email is verified */
  emailVerified?: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  pyq: "📝",
  pdf: "📄",
  video: "🎬",
  important: "⭐",
  practice: "🧠",
};

const TYPE_GRADIENT: Record<string, string> = {
  pyq: "linear-gradient(135deg, rgba(247,197,216,0.25), rgba(247,197,216,0.05))",
  pdf: "linear-gradient(135deg, rgba(216,197,247,0.25), rgba(216,197,247,0.05))",
  video: "linear-gradient(135deg, rgba(247,223,197,0.25), rgba(247,223,197,0.05))",
  important: "linear-gradient(135deg, rgba(197,247,232,0.25), rgba(197,247,232,0.05))",
  practice: "linear-gradient(135deg, rgba(26,31,60,0.08), rgba(26,31,60,0.02))",
};

const TYPE_BADGE_VARIANT: Record<string, BadgeVariant> = {
  pyq: "rose",
  pdf: "lavender",
  video: "peach",
  important: "mint",
  practice: "navy",
};

export default function ResourceCard({ resource, userHasPremium = false, emailVerified = true }: ResourceCardProps) {
  // Lock if premium AND (not premium user OR not verified)
  const isLocked = resource.isPremium && (!userHasPremium || !emailVerified);

  return (
    <Link
      href={`/resources/${resource.id}`}
      className="card group flex flex-col relative"
      id={`resource-card-${resource.id}`}
    >
      {/* Premium lock overlay */}
      {isLocked && (
        <div
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(26, 31, 60, 0.85)",
            border: "1px solid rgba(247, 197, 216, 0.3)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="var(--color-candy-rose)" strokeWidth="1.2" />
            <path d="M4 5V3.5a2 2 0 114 0V5" stroke="var(--color-candy-rose)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      )}      {/* Card header with preview image or type emoji */}
      <div
        className="h-[140px] flex items-center justify-center relative overflow-hidden"
        style={{ background: resource.previewImage ? 'transparent' : (TYPE_GRADIENT[resource.type] || TYPE_GRADIENT.pyq) }}
      >
        {resource.previewImage ? (
          <img 
            src={resource.previewImage} 
            alt={resource.title} 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <span className="text-[42px] group-hover:scale-110 transition-transform duration-500">{TYPE_EMOJI[resource.type] || "📝"}</span>
        )}
        {/* Year badge for PYQs */}
        {resource.type === "pyq" && resource.year && (
          <span
            className="absolute bottom-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(26, 31, 60, 0.08)",
              color: "var(--color-navy)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {resource.year}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={TYPE_BADGE_VARIANT[resource.type] || "rose"}>
            {RESOURCE_TYPE_LABELS[resource.type]}
          </Badge>
          {resource.tags.map((tag: ContentTag) => (
            <Badge key={tag} variant={TAG_TO_BADGE[tag]}>
              {TAG_LABELS[tag]}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h4
          className="text-[15px] font-medium leading-snug line-clamp-2 group-hover:text-[var(--color-candy-rose)] transition-colors"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {resource.title}
        </h4>
      </div>
    </Link>
  );
}
