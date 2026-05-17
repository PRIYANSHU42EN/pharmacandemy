import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Breadcrumb from "@/components/shared/Breadcrumb";
import Badge from "@/components/ui/Badge";
import AIStudyAssistant from "@/components/shared/AIStudyAssistant";
import JsonLd from "@/components/shared/JsonLd";
import SubjectClient from "./SubjectClient";

interface Params {
  id: string;
}

async function getSubjectData(id: string) {
  const [{ data: subject }, { data: resources }] = await Promise.all([
    supabaseServer.from("subjects").select("*").eq("id", id).single(),
    supabaseServer.from("resources").select("*").eq("subject_id", id),
  ]);

  return { subject, resources: resources || [] };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const { subject } = await getSubjectData(id);

  if (!subject) {
    return {
      title: "Subject Not Found | Cubepharm",
    };
  }

  return {
    title: `${subject.name} | Study Resources | Cubepharm`,
    description: subject.description || `Access comprehensive study resources for ${subject.name}. Includes PYQs, notes, and video lectures.`,
    openGraph: {
      title: `${subject.name} | Cubepharm`,
      description: subject.description,
      type: "article",
    },
  };
}

export default async function SubjectPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const { subject, resources } = await getSubjectData(id);

  if (!subject) {
    notFound();
  }

  const subjectName = subject.name;

  const subjectJsonLd = {
    "@type": "Course",
    "name": subjectName,
    "description": subject.description || `Comprehensive study resources for ${subjectName}.`,
    "provider": {
      "@type": "Organization",
      "name": "Cubepharm",
      "url": "https://cubepharm.com"
    },
    "courseCode": id,
  };

  // Smart sections
  const examBoosters = resources.filter((r) => (r.tags || []).includes("exam-booster"));
  const mostAsked = resources.filter((r) => (r.tags || []).includes("most-asked"));
  const lastFiveYears = resources.filter((r) => (r.tags || []).includes("last-5-years"));

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <JsonLd data={subjectJsonLd} />
      <div className="container-main">
        <header>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Courses", href: "/courses" },
              { label: subjectName },
            ]}
          />

          {/* Header Info */}
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
        </header>

        {/* === Exam Booster Section === */}
        {examBoosters.length > 0 && (
          <section className="mb-10" aria-labelledby="exam-booster-title">
            <h2 id="exam-booster-title" className="text-[20px] font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Exam Booster
            </h2>
            <div
              className="rounded-2xl p-5 mb-2"
              style={{
                background: "linear-gradient(145deg, rgba(197,247,232,0.12), rgba(216,197,247,0.08))",
                border: "0.5px solid rgba(197,247,232,0.2)",
              }}
            >
              <SubjectClient resources={examBoosters} subjectId={id} />
            </div>
          </section>
        )}

        {/* === Most Asked === */}
        {mostAsked.length > 0 && (
          <section className="mb-10" aria-labelledby="most-asked-title">
            <div className="flex items-center gap-2 mb-4">
              <h2 id="most-asked-title" className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Most Asked
              </h2>
              <Badge variant="rose">🔴 Frequently Asked</Badge>
            </div>
            <SubjectClient resources={mostAsked} subjectId={id} />
          </section>
        )}

        {/* === Last 5 Years PYQs === */}
        {lastFiveYears.length > 0 && (
          <section className="mb-10" aria-labelledby="pyq-title">
            <div className="flex items-center gap-2 mb-4">
              <h2 id="pyq-title" className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Last 5 Years PYQs
              </h2>
              <Badge variant="peach">📋 Past Papers</Badge>
            </div>
            <SubjectClient resources={lastFiveYears} subjectId={id} />
          </section>
        )}

        {/* === All Resources with Tabs === */}
        <section aria-labelledby="all-resources-title">
          <div className="flex items-center gap-2 mb-4">
            <h2 id="all-resources-title" className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
              All Resources
            </h2>
          </div>
          <SubjectClient resources={resources} subjectId={id} />
        </section>
      </div>
      <AIStudyAssistant />
    </section>
  );
}
