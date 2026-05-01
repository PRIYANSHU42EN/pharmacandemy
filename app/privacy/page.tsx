"use client";

import Breadcrumb from "@/components/shared/Breadcrumb";

export default function PrivacyPage() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-4xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Privacy Policy" },
          ]}
        />

        <div className="mt-8 p-8 lg:p-12 rounded-2xl" style={{ background: "white", border: "0.5px solid #e0e0e0" }}>
          <h1 className="text-[32px] mb-6" style={{ fontFamily: "var(--font-display)" }}>Privacy Policy</h1>
          
          <div className="space-y-6 text-[15px] leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}>
            <p style={{ color: "var(--color-mid)" }}>Last updated: April 20, 2026</p>
            
            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>1. Information We Collect</h2>
              <p>We collect information you provide directly to us when you create an account, such as your name and email address. We also collect data related to your learning progress, including subjects studied and streak information.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>2. How We Use Information</h2>
              <p>We use the information we collect to provide, maintain, and improve our services, to personalize your learning experience, and to process payments through our secure partners like Razorpay.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>3. Data Security</h2>
              <p>We use industry-standard security measures to protect your personal information. All payments are processed through Razorpay, and we do not store your credit card or sensitive financial information on our servers.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>4. Cookies</h2>
              <p>We use cookies to keep you logged in and remember your preferences. You can disable cookies in your browser settings, but it may affect your ability to use the site.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>5. Changes to This Policy</h2>
              <p>We may update this policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
