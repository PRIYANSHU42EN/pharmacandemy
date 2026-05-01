"use client";

export default function TrustBadges() {
  const badges = [
    { icon: "🔬", label: "Cubecist Reviewed" },
    { icon: "📋", label: "Structured Content" },
    { icon: "💰", label: "Affordable Premium" },
    { icon: "🔒", label: "Secure Payments" },
  ];

  return (
    <section className="py-10" style={{ background: "var(--color-cream)" }}>
      <div className="container-main flex flex-wrap justify-center gap-4">
        {badges.map((b) => (
          <div key={b.label} className="trust-badge">
            <span className="text-[14px]">{b.icon}</span>
            {b.label}
          </div>
        ))}
      </div>
    </section>
  );
}
