export default function Loading() {
  return (
    <section className="py-20 text-center" style={{ minHeight: "calc(100vh - 64px)" }}>
      <span className="text-[24px] block mb-2 animate-pulse">🎯</span>
      <p style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Loading session…</p>
    </section>
  );
}
