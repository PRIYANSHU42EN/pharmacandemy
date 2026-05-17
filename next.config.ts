import type { NextConfig } from "next";
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  /* Standard performance optimizations */
  experimental: {
    optimizePackageImports: [
      "firebase",
      "firebase-admin",
      "lucide-react",
      "@/components/ui",
      "ably",
      "@ably/chat"
    ],
  },
  devIndicators: {
    // @ts-ignore
    buildActivity: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/creator/dashboard',
        destination: '/admin',
        permanent: true,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'ibrfcnfreoputaqpzagu.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'ibb.co' },
      { protocol: 'https', hostname: 'i.ibb.co' },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default withBundleAnalyzer(nextConfig);

