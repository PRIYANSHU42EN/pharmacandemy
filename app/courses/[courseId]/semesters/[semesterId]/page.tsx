"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Params {
  courseId: string;
  semesterId: string;
}

export default function SemesterRedirect({ params }: { params: Promise<Params> }) {
  const { courseId } = use(params);
  const router = useRouter();

  useEffect(() => {
    // Redirect to the parent course page since semesters are now merged
    router.replace(`/courses/${courseId}`);
  }, [courseId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F8F7]">
      <div className="text-center">
        <span className="text-[32px] block mb-4 animate-bounce">📚</span>
        <p className="text-[14px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
          Redirecting to course subjects...
        </p>
      </div>
    </div>
  );
}
