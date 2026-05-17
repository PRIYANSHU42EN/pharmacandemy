import JsonLd from "@/components/shared/JsonLd";
import dynamic from "next/dynamic";
import HeroSection from "@/components/home/HeroSection";
import FadeIn from "@/components/shared/FadeIn";

// Lazy load below-the-fold sections for better performance
const AboutSection = dynamic(() => import("@/components/home/AboutSection"));
const FeaturesSection = dynamic(() => import("@/components/home/FeaturesSection"));
const CreatorSection = dynamic(() => import("@/components/home/CreatorSection"));
const VisionSection = dynamic(() => import("@/components/home/VisionSection"));
const TrustBadges = dynamic(() => import("@/components/home/TrustBadges"));

/* ==========================================================================
   Landing Page — Cubepharm (Performance Optimized)
   ========================================================================== */

export default function LandingPage() {
  const homeData = {
    "@type": "WebPage",
    "name": "Cubepharm Home — Pharmacy Learning Platform",
    "description": "Premium pharmacy study platform providing access to PYQs, PDF notes, and video lectures for B.Pharm and D.Pharm students.",
    "mainEntity": {
      "@type": "ItemList",
      "name": "Core Features",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Previous Year Questions (PYQs)" },
        { "@type": "ListItem", "position": 2, "name": "Curated Important Questions" },
        { "@type": "ListItem", "position": 3, "name": "In-App PDF Notes Viewer" },
        { "@type": "ListItem", "position": 4, "name": "Embedded Video Lectures" },
        { "@type": "ListItem", "position": 5, "name": "Interactive Practice Mode" }
      ]
    }
  };

  return (
    <>
      <JsonLd data={homeData} />
      <HeroSection />
      
      <FadeIn delay={100}>
        <AboutSection />
      </FadeIn>
      
      <FadeIn delay={200}>
        <FeaturesSection />
      </FadeIn>
      
      <FadeIn delay={100}>
        <CreatorSection />
      </FadeIn>
      
      <FadeIn delay={100}>
        <VisionSection />
      </FadeIn>
      
      <FadeIn delay={100}>
        <TrustBadges />
      </FadeIn>
    </>
  );
}
