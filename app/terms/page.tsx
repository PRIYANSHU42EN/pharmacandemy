import Breadcrumb from "@/components/shared/Breadcrumb";

export default function TermsPage() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-3xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]} />
        <div className="mt-8 p-8 lg:p-12 rounded-2xl bg-white border border-gray-200">
          <h1 className="text-[32px] mb-8" style={{ fontFamily: "var(--font-display)" }}>Terms of Service</h1>
          <div className="prose prose-sm max-w-none" style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}>
            <p>Last updated: April 29, 2026</p>
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing PharmaCademy, you agree to be bound by these terms of service and all applicable laws and regulations.</p>
            <h3>2. User Accounts</h3>
            <p>You are responsible for maintaining the confidentiality of your account and password. Premium accounts are for individual use only and cannot be shared.</p>
            <h3>3. Refunds</h3>
            <p>Due to the digital nature of our content, subscriptions are generally non-refundable once content has been accessed. Please contact support for exceptional cases.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
