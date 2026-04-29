"use client";

import Breadcrumb from "@/components/shared/Breadcrumb";
import Link from "next/link";

export default function DonatePage() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-4xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Donate" }]} />
        <div className="mt-8 p-8 lg:p-12 rounded-3xl text-center" style={{ background: "white", border: "0.5px solid #e0e0e0" }}>
          <span className="text-[64px] block mb-6">☕</span>
          <h1 className="text-[32px] sm:text-[40px] mb-4" style={{ fontFamily: "var(--font-display)" }}>Support Our Work</h1>
          <p className="text-[17px] leading-relaxed max-w-2xl mx-auto mb-10" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid)" }}>
            PharmaCademy is a community-driven project. Your donations help us cover server costs, API fees, and add more free resources for students who can&apos;t afford premium access.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
            {[
              { amount: "₹50", label: "Buy a Chai" },
              { amount: "₹100", label: "Monthly Server" },
              { amount: "₹500", label: "New Content Batch" },
            ].map((d) => (
              <div key={d.amount} className="p-6 rounded-2xl" style={{ border: "1px solid #eee", background: "#fafafa" }}>
                <h3 className="text-[24px] font-bold mb-1">{d.amount}</h3>
                <p className="text-[12px] uppercase opacity-60 tracking-wider font-bold">{d.label}</p>
                <button className="btn btn-ghost w-full justify-center mt-6 text-[12px]">Donate</button>
              </div>
            ))}
          </div>
          <p className="text-[13px]" style={{ color: "var(--color-slate)" }}>
            Securely processed via Razorpay. Thank you for your support!
          </p>
        </div>
      </div>
    </section>
  );
}
