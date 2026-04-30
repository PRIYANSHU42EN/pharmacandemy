"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy Supabase Auth callback.
 * Now simply redirects to dashboard as we use Firebase.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[rgba(26,31,60,0.05)] border-t-[#FB6F92] rounded-full animate-spin"></div>
        <p className="text-[12px] text-[#6B70A0] font-medium uppercase tracking-widest animate-pulse">
          Redirecting to dashboard...
        </p>
      </div>
    </div>
  );
}
