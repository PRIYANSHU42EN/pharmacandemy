import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ResourceClient from "./ResourceClient";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumb from "@/components/shared/Breadcrumb";
import Badge from "@/components/ui/Badge";
import { TAG_TO_BADGE, TAG_LABELS, RESOURCE_TYPE_LABELS } from "@/types";

interface Params {
  id: string;
}

async function getResource(id: string) {
  const { data: resource, error } = await supabaseServer
    .from("resources")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !resource) {
    return null;
  }

  return resource;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResource(id);

  if (!resource) {
    return {
      title: "Resource Not Found | Cubepharm",
    };
  }

  const typeName = (RESOURCE_TYPE_LABELS as any)[resource.type] || "Resource";

  return {
    title: `${resource.title} | ${typeName} | Cubepharm`,
    description: resource.description || `Access pharmacy study material: ${resource.title}. Optimized for exam preparation. Built for B.Pharm, M.Pharm, and D.Pharm students.`,
    openGraph: {
      title: `${resource.title} | Cubepharm`,
      description: resource.description || `Study ${resource.title} on Cubepharm.`,
      type: "article",
      images: [
        {
          url: resource.previewImage || "/og-image.png",
          alt: resource.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${resource.title} | Cubepharm`,
      description: resource.description || `Study ${resource.title} on Cubepharm.`,
      images: [resource.previewImage || "/og-image.png"],
    },
  };
}

export default async function ResourceViewerPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const resource = await getResource(id);

  if (!resource) {
    notFound();
  }

  const isVideo = resource.type === "video";
  const isPdf = resource.type === "pdf" || resource.type === "pyq";
  const typeName = (RESOURCE_TYPE_LABELS as any)[resource.type] || "";

  const jsonLdData = {
    "@type": isVideo ? "VideoObject" : "LearningResource",
    "name": resource.title,
    "description": resource.description || `Academic pharmacy study material: ${resource.title}. Optimized for exam preparation.`,
    "learningResourceType": typeName,
    "educationalLevel": "B.Pharm / M.Pharm",
    "provider": {
      "@type": "Organization",
      "name": "Cubepharm",
      "url": "https://cubepharm.com"
    },
    "inLanguage": "en",
    "author": {
      "@type": "Organization",
      "name": "Cubepharm Content Team"
    }
  };

  return (
    <article className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <JsonLd data={jsonLdData} />
      
      <div className={`container-main ${isPdf ? 'max-w-7xl' : 'max-w-5xl'}`}>
        <header>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Resources", href: "/resources" },
              { label: resource.title },
            ]}
          />

          <div className="mt-8">
            <div className="flex flex-col gap-4 flex-shrink-0 relative z-[1]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={resource.type === "pyq" ? "rose" : resource.type === "pdf" ? "lavender" : resource.type === "video" ? "peach" : "mint"}>
                  {typeName}
                </Badge>
                {(resource.tags || []).map((tag: string) => (
                  <Badge key={tag} variant={(TAG_TO_BADGE as any)[tag] || "slate"}>
                    {(TAG_LABELS as any)[tag] || tag}
                  </Badge>
                ))}
                {resource.year && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-mono">
                    {resource.year}
                  </span>
                )}
              </div>

              <h1 className="text-[24px] sm:text-[32px] m-0" style={{ fontFamily: "var(--font-display)", lineHeight: "1.2" }}>
                {resource.title}
              </h1>
            </div>
          </div>
        </header>

        <ResourceClient resource={resource} id={id} />
      </div>
    </article>
  );
}
