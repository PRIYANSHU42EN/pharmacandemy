import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-[120px] font-bold leading-none mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}>
        404
      </h1>
      <h2 className="text-[24px] font-bold mb-4" style={{ color: "var(--color-navy)" }}>
        Page Not Found
      </h2>
      <p className="max-w-[400px] text-[15px] opacity-60 mb-8 leading-relaxed">
        Oops! The study material you're looking for seems to have been misplaced. 
        Let's get you back on track.
      </p>
      <Link 
        href="/" 
        className="btn btn-primary px-8 py-4 text-[14px] font-bold transition-all hover:scale-105"
      >
        Go Home
      </Link>
    </div>
  );
}
