"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OAuthConsentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <section className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-2xl font-bold mb-3">Authenticating...</h1>
        <p className="text-gray-500 mb-8">Please wait while we securely sign you in to PharmaCademy.</p>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full animate-[progress_2s_infinite_linear]" style={{ width: "30%" }}></div>
        </div>
      </div>
      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </section>
  );
}
