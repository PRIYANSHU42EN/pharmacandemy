"use client";

export default function CreatorSection() {
  return (
    <section className="py-16 lg:py-20" style={{ background: "var(--color-cream)" }}>
      <div className="container-main text-center max-w-[600px] mx-auto">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center text-[28px]"
          style={{
            background: "var(--color-badge-rose-bg)",
          }}
        >
          P
        </div>
        <p className="label mb-2" style={{ color: "var(--color-candy-rose)" }}>
          Created by Priyanshu
        </p>
        <h2
          className="text-[24px] sm:text-[28px] mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Founder & Developer
        </h2>
        <p
          className="text-[15px] leading-[1.65]"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-mid)",
          }}
        >
          Built to solve the problem of scattered study material and help
          students prepare efficiently. Every pharmacy student deserves
          organized, affordable, and accessible study resources.
        </p>
      </div>
    </section>
  );
}
