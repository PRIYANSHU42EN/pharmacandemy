import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Breadcrumb from "@/components/shared/Breadcrumb";
import Badge from "@/components/ui/Badge";
import JsonLd from "@/components/shared/JsonLd";

interface Params {
  courseId: string;
}

async function getCourseData(courseId: string) {
  const [{ data: course }, { data: subjects }] = await Promise.all([
    supabaseServer.from("courses").select("*").eq("id", courseId).single(),
    supabaseServer.from("subjects").select("*").eq("course_id", courseId),
  ]);

  return { course, subjects: subjects || [] };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { courseId } = await params;
  const { course } = await getCourseData(courseId);

  if (!course) {
    return {
      title: "Course Not Found | Cubepharm",
    };
  }

  return {
    title: `${course.name} | Pharmacy Course | Cubepharm`,
    description: course.description || `Access all study resources and subjects for ${course.name}. Optimized for B.Pharm, M.Pharm, and D.Pharm students.`,
    openGraph: {
      title: `${course.name} | Cubepharm`,
      description: course.description,
      type: "website",
    },
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<Params> }) {
  const { courseId } = await params;
  const { course, subjects } = await getCourseData(courseId);

  if (!course) {
    notFound();
  }

  // Group subjects by semesterNumber if available
  const subjectsBySem = subjects.reduce((acc, sub) => {
    const sem = sub.semester_number || 0;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(sub);
    return acc;
  }, {} as Record<number, any[]>);

  const semesters = Object.keys(subjectsBySem).map(Number).sort((a, b) => a - b);

  const courseJsonLd = {
    "@type": "Course",
    "name": course.name,
    "description": course.description,
    "provider": {
      "@type": "Organization",
      "name": "Cubepharm",
      "url": "https://cubepharm.com"
    }
  };

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <JsonLd data={courseJsonLd} />
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
                  {subjectsBySem[semNum].map((subject: any) => (
                    <Link
                      key={subject.id}
                      href={`/subjects/${subject.id}`}
                      className="card group flex flex-col"
                    >
                      <div className="h-[120px] flex items-center justify-center relative bg-gradient-to-br from-[#c5f7e8]/15 to-[#c5e8f7]/10">
                        <span className="text-[40px] group-hover:scale-110 transition-transform">📚</span>
                      </div>

                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="mint">
                            Free Content
                          </Badge>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {subject.resource_count || 0} items
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
