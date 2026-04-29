import Breadcrumb from "@/components/shared/Breadcrumb";

export default function PrivacyPage() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-3xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
        <div className="mt-8 p-8 lg:p-12 rounded-2xl bg-white border border-gray-200">
          <h1 className="text-[32px] mb-8" style={{ fontFamily: "var(--font-display)" }}>Privacy Policy</h1>
          <div className="prose prose-sm max-w-none" style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}>
            <p>Last updated: April 29, 2026</p>
            <h3>1. Information We Collect</h3>
            <p>We collect information you provide directly to us when you create an account, such as your name, email address, and profile picture from Google if you use social login.</p>
            <h3>2. How We Use Your Information</h3>
            <p>We use the information we collect to provide, maintain, and improve our services, including personalization of content and processing payments.</p>
            <h3>3. Data Security</h3>
            <p>We use Firebase Authentication for secure sign-in and Razorpay for secure payment processing. Your financial details are never stored on our servers.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
