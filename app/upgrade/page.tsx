"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpgradePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/marketplace");
  }, [router]);

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-white font-display text-xl animate-pulse">
        Transitioning to the new CubePharma experience...
      </div>
    </div>
  );
}
