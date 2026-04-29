"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error.message);
          router.push("/login?error=" + encodeURIComponent(error.message));
          return;
        }

        router.push("/dashboard");
      } catch (err) {
        console.error("Unexpected auth callback error:", err);
        router.push("/login?error=callback_failed");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[rgba(26,31,60,0.05)] border-t-[#FB6F92] rounded-full animate-spin"></div>
        <p className="text-[12px] text-[#6B70A0] font-medium uppercase tracking-widest animate-pulse">
          Finalizing secure sign-in...
        </p>
      </div>
    </div>
  );
}
