"use client";

import Breadcrumb from "@/components/shared/Breadcrumb";
import Link from "next/link";

export default function AboutPage() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-4xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "About Us" },
          ]}
        />

        <div className="mt-8 p-8 lg:p-12 rounded-3xl overflow-hidden" style={{ background: "white", border: "0.5px solid #e0e0e0" }}>
          <div className="flex flex-col md:flex-row gap-12 items-center mb-12">
            <div className="flex-1">
              <h1 className="text-[36px] sm:text-[44px] leading-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Revolutionizing Pharmacy Study in <span style={{ color: "var(--color-candy-rose)" }}>India</span>
              </h1>
              <p className="text-[17px] leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}>
                PharmaCademy was born out of a simple observation: pharmacy students struggle with scattered resources, outdated notes, and expensive study materials.
              </p>
            </div>
            <div className="w-full md:w-[300px] h-[300px] rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center relative shadow-xl">
               <span className="text-[120px]">💊</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="p-6 rounded-2xl" style={{ background: "rgba(26,31,60,0.02)", border: "1px solid rgba(26,31,60,0.05)" }}>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Our Purpose</h2>
              <p className="text-[15px]" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid)" }}>
                We aim to provide a high-performance, structured platform where students can find everything from PYQs to expert-curated boosters, all in one place, for less than the cost of a cup of tea.
              </p>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: "rgba(247,197,216,0.05)", border: "1px solid rgba(247,197,216,0.1)" }}>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>The Creator</h2>
              <p className="text-[15px]" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid)" }}>
                PharmaCademy is created and maintained by <strong>Priyanshu</strong>, a passionate developer committed to making quality education accessible to every pharmacy student in India.
              </p>
            </div>
          </div>

          <div className="text-center p-12 rounded-3xl" style={{ background: "var(--color-navy)", color: "white" }}>
            <h2 className="text-[28px] mb-4" style={{ fontFamily: "var(--font-display)" }}>Join the Community</h2>
            <p className="text-[16px] mb-8 opacity-80 max-w-lg mx-auto" style={{ fontFamily: "var(--font-body)" }}>
              Experience a smarter way to study. Start exploring our collections of PYQs and premium notes today.
            </p>
            <Link href="/courses" className="btn btn-accent px-10 py-4 text-[16px]">
               Get Started Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
