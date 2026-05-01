import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Standard performance optimizations */
  experimental: {
    optimizePackageImports: [
      "firebase",
      "firebase-admin",
      "lucide-react",
      "@/components/ui"
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;

