"use client";

export default function VisionSection() {
  return (
    <section className="py-12 lg:py-16" style={{ background: "#F9F8F7" }}>
      <div className="container-main text-center max-w-[600px] mx-auto">
        <p className="label mb-3" style={{ color: "var(--color-candy-lavender)" }}>
          Future Vision
        </p>
        <p
          className="text-[16px] leading-[1.65]"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-mid)",
          }}
        >
          Currently focused on pharmacy students. In the future, this platform
          will expand to other subjects and courses — making quality education
          accessible to everyone.
        </p>
      </div>
    </section>
  );
}
