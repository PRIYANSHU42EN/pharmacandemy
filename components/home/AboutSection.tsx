"use client";

export default function AboutSection() {
  return (
    <section id="about" className="py-16 lg:py-20" style={{ background: "var(--color-cream)" }}>
      <div className="container-main text-center max-w-[680px] mx-auto">
        <p
          className="label mb-4"
          style={{ color: "var(--color-candy-rose)" }}
        >
          About Cubepharm
        </p>
        <h2
          className="text-[28px] sm:text-[32px] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Designed for Pharmacy Students
        </h2>
        <p
          className="text-[16px] leading-[1.65]"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-mid)",
          }}
        >
          Cubepharm is a dedicated platform that organizes all your study
          materials — PYQs, PDFs, video lectures, and smart question banks —
          into a single, beautifully structured digital campus. No more wasting
          time searching across Telegram groups and scattered websites.
          Everything you need, exactly where you need it.
        </p>
      </div>
    </section>
  );
}
