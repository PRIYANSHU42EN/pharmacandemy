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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'ibrfcnfreoputaqpzagu.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;

