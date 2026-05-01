"use client";

import Breadcrumb from "@/components/shared/Breadcrumb";

export default function TermsPage() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-4xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Terms of Use" },
          ]}
        />

        <div className="mt-8 p-8 lg:p-12 rounded-2xl" style={{ background: "white", border: "0.5px solid #e0e0e0" }}>
          <h1 className="text-[32px] mb-6" style={{ fontFamily: "var(--font-display)" }}>Terms of Use</h1>
          
          <div className="space-y-6 text-[15px] leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}>
            <p style={{ color: "var(--color-mid)" }}>Effective Date: April 20, 2026</p>
            
            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>1. Usage of Platform</h2>
              <p>Cubepharm provides educational materials for pharmacy students. By using our platform, you agree to use the content for personal, non-commercial study purposes only. Unauthorized distribution or copying of materials is strictly prohibited.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>2. Subscription & Payments</h2>
              <p>Premium access is provided on a subscription basis. Subscriptions are processed via Razorpay. We offer Monthly (₹40) and Biannual (₹60) plans. Donations to the platform do not grant premium access and are non-refundable.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>3. Account Termination</h2>
              <p>We reserve the right to suspend or terminate accounts that violate our terms, engage in fraudulent activities, or use automated systems to scrape our content.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>4. Disclaimer</h2>
              <p>The materials on Cubepharm are provided for educational purposes. While we strive for accuracy, students should siempre consult official textbooks and guidelines for medical information.</p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>5. Limitation of Liability</h2>
              <p>Cubepharm and its creators are not liable for any academic results or consequences arising from the use of our study materials.</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
