import dynamic from "next/dynamic";
import HeroSection from "@/components/home/HeroSection";

// Lazy load below-the-fold sections for better performance
const AboutSection = dynamic(() => import("@/components/home/AboutSection"));
const FeaturesSection = dynamic(() => import("@/components/home/FeaturesSection"));
const PremiumSection = dynamic(() => import("@/components/home/PremiumSection"));
const CreatorSection = dynamic(() => import("@/components/home/CreatorSection"));
const VisionSection = dynamic(() => import("@/components/home/VisionSection"));
const TrustBadges = dynamic(() => import("@/components/home/TrustBadges"));

/* ==========================================================================
   Landing Page — PharmaCademy (Performance Optimized)
   ========================================================================== */

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <PremiumSection />
      <CreatorSection />
      <VisionSection />
      <TrustBadges />
    </>
  );
}
