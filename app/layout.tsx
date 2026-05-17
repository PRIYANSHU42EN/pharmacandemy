import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/components/providers/AuthProvider";
import AblyChatProvider from "@/components/providers/AblyChatProvider";
import CookieConsent from "@/components/shared/CookieConsent";
import JsonLd from "@/components/shared/JsonLd";
import EmailVerificationBanner from "@/components/layout/EmailVerificationBanner";
import "./globals.css";

// Premium Pharmacy Study Platform - Metadata and Fonts


const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1A1F3C",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://cubepharm.com"),
  title: {
    default: "Cubepharm — All Your Pharmacy Study Resources in One Place",
    template: "%s | Cubepharm",
  },
  description:
    "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster. Built for B.Pharm, M.Pharm, and D.Pharm students.",
  keywords: [
    "pharmacy study material",
    "B.Pharm PYQ",
    "M.Pharm notes",
    "D.Pharm question papers",
    "pharmacology lectures",
    "pharmacy exam preparation",
    "cubepharm",
  ],
  authors: [{ name: "Cubepharm Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/apple-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cubepharm — Pharmacy Student Learning Platform",
    description:
      "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster.",
    url: "https://cubepharm.com",
    siteName: "Cubepharm",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cubepharm — Premium Pharmacy Study Platform",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cubepharm — Pharmacy Student Learning Platform",
    description:
      "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationData = {
    "@type": "Organization",
    "name": "Cubepharm",
    "url": "https://cubepharm.com",
    "logo": "https://cubepharm.com/logo.png",
    "description": "Premium pharmacy study platform for B.Pharm, M.Pharm, and D.Pharm students. Providing PYQs, notes, and AI-powered study assistance.",
    "sameAs": [
      "https://twitter.com/cubepharm",
      "https://linkedin.com/company/cubepharm"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": "support@cubepharm.com"
    }
  };

  const websiteData = {
    "@type": "WebSite",
    "name": "Cubepharm",
    "url": "https://cubepharm.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://cubepharm.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <JsonLd data={organizationData} />
        <JsonLd data={websiteData} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <AblyChatProvider>
            <Navbar />
            <main className="flex-1 pt-[64px]">
              <EmailVerificationBanner />
              {children}
            </main>
            <Footer />
            <CookieConsent />
          </AblyChatProvider>
        </AuthProvider>
        </body>
    </html>
  );
}
