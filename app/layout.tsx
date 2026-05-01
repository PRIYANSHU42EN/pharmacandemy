import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/components/providers/AuthProvider";
import CookieConsent from "@/components/shared/CookieConsent";
import "./globals.css";

/* ==========================================================================
   Typography (§04) — Cube Candy Design System
   Playfair Display: Display / H1–H3 (400, 700)
   DM Sans: Body & UI (300, 400, 500)
   JetBrains Mono: Monospace — codes, SKUs (400)
   ========================================================================== */

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

/* ==========================================================================
   Metadata / SEO
   ========================================================================== */

export const metadata: Metadata = {
  title: {
    default: "Cubepharm — All Your Pharmacy Study Resources in One Place",
    template: "%s | Cubepharm",
  },
  description:
    "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster. Built for B.Pharm, M.Pharm, and D.Pharm students.",
  keywords: [
    "pharmacy",
    "B.Pharm",
    "M.Pharm",
    "D.Pharm",
    "PYQ",
    "study material",
    "pharmacology",
    "exam preparation",
  ],
  authors: [{ name: "Priyanshu" }],
  openGraph: {
    title: "Cubepharm — Pharmacy Student Learning Platform",
    description:
      "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster.",
    type: "website",
    locale: "en_IN",
    siteName: "Cubepharm",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cubepharm — Pharmacy Student Learning Platform",
    description:
      "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/* ==========================================================================
   Root Layout
   ========================================================================== */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pt-[64px]">{children}</main>
          <Footer />
          <CookieConsent />
        </AuthProvider>
        </body>
    </html>
  );
}
