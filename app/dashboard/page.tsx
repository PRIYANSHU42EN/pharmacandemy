"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import SkeletonPulse, { SkeletonText } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { user, userProfile, loading, isPremium } = useAuth();
  const router = useRouter();

  // Route Protection
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <section className="py-12 lg:py-16" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
        <div className="container-main max-w-4xl">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 p-8 rounded-2xl" style={{ background: "var(--color-cream)", border: "0.5px solid rgba(26,31,60,0.05)" }}>
            <div className="w-full md:w-1/2">
              <SkeletonPulse className="h-8 w-3/4 mb-4" />
              <SkeletonPulse className="h-4 w-1/2" />
            </div>
            <div className="mt-6 md:mt-0 flex gap-4 w-full md:w-auto">
              <SkeletonPulse className="h-12 w-24 rounded-lg" />
              <SkeletonPulse className="h-10 w-32 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="col-span-1 md:col-span-2 h-full p-8 rounded-2xl" style={{ border: "0.5px solid #e5e5e5" }}>
               <SkeletonPulse className="h-6 w-1/3 mb-4" />
               <SkeletonText count={3} />
               <SkeletonPulse className="h-8 w-32 mt-6 rounded-full" />
             </div>
             <div className="col-span-1 h-full p-8 rounded-2xl" style={{ border: "0.5px solid #e5e5e5" }}>
               <SkeletonPulse className="h-6 w-1/2 mb-4" />
               <SkeletonText count={2} />
               <SkeletonPulse className="h-4 w-24 mt-6" />
             </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-16" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-4xl">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 p-8 rounded-2xl" style={{ background: "var(--color-cream)", border: "0.5px solid rgba(26,31,60,0.05)" }}>
          <div>
            <h1 className="text-[28px] sm:text-[32px] mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Welcome back, {userProfile?.displayName?.split(" ")[0] || "Student"}!
            </h1>
            <p className="text-[15px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
              Ready to crush your next pharmacy exam?
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-4">
            <div className="text-center">
              <span className="block text-[24px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}>
                 {userProfile?.streak || 0} 🔥
              </span>
              <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                 Day Streak
              </span>
            </div>
            {!isPremium && (
              <Link href="/upgrade" className="flex items-center">
                <Badge variant="rose">Upgrade to Premium</Badge>
              </Link>
            )}
            {isPremium && (
              <div className="flex items-center">
                <Badge variant="mint">Premium Active</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/courses" className="col-span-1 md:col-span-2 group">
            <div className="h-full p-8 rounded-2xl transition-all hover:-translate-y-1" style={{ background: "var(--color-navy)", color: "var(--color-cream)" }}>
               <h2 className="text-[24px] mb-3" style={{ fontFamily: "var(--font-display)" }}>Study Library</h2>
               <p className="text-[14px] leading-relaxed mb-6 opacity-80" style={{ fontFamily: "var(--font-body)" }}>
                 Access all your PYQs, organized PDF notes, and chapter-wise video lectures for your active semester.
               </p>
               <span className="text-[12px] font-medium px-4 py-2 rounded-full" style={{ background: "var(--color-candy-rose)", color: "var(--color-cream)", fontFamily: "var(--font-body)" }}>
                 Go to Subject Modules →
               </span>
            </div>
          </Link>

          <Link href="/profile" className="col-span-1 group">
            <div className="h-full p-8 rounded-2xl transition-all hover:-translate-y-1" style={{ background: "var(--color-cream)", border: "0.5px solid rgba(26,31,60,0.1)" }}>
               <h2 className="text-[20px] mb-3 text-black" style={{ fontFamily: "var(--font-display)" }}>Your Profile</h2>
               <p className="text-[13px] leading-relaxed mb-6 text-gray-500" style={{ fontFamily: "var(--font-body)" }}>
                 Manage your subscriptions, check your referral points, and edit account settings.
               </p>
               <span className="text-[12px] font-medium" style={{ color: "var(--color-candy-rose)", fontFamily: "var(--font-body)" }}>
                 Settings & Billings →
               </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
