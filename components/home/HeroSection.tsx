"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

export default function HeroSection() {
  const words = ["All", "Your", "Pharmacy", "Study", "Resources", "in", "One", "Place"];
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleStartLearning = () => {
    if (loading) return;
    if (user) router.push("/dashboard");
    else router.push("/login");
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{ 
        minHeight: "min(85vh, 800px)",
        background: "#000000",
        color: "#ffffff",
        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif"
      }}
    >
      {/* Asymmetrical Decorative Elements */}
      <div
        className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0, 0, 238, 0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div className="container-main relative z-10 h-full flex items-center py-16 lg:py-0" style={{ minHeight: "inherit" }}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-[25.6px] items-center w-full">
          {/* Left — 60% */}
          <div className="lg:col-span-3 flex flex-col gap-[25.6px]">
            <h1 
              className="text-[36px] sm:text-[41.6px] leading-[1.1] flex flex-wrap gap-x-[14px] gap-y-1"
              style={{ fontWeight: 700, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
            >
              {words.map((word, i) => (
                <span
                  key={i}
                  className="hero-word inline-block"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    color: i % 4 === 2 ? "#0000ee" : "#ffffff", // Subtle accent on "Pharmacy" if i matches
                  }}
                >
                  {word}
                </span>
              ))}
            </h1>

            <p
              className="text-[16px] max-w-[500px] leading-[1.6] hero-word opacity-80"
              style={{
                color: "#ffffff",
                animationDelay: `${words.length * 80 + 100}ms`,
              }}
            >
              Access PYQs, important questions, PDFs, and video lectures in a
              structured way to prepare faster. Sophisticated tools for modern students.
            </p>

            <div
              className="flex flex-wrap gap-[16px] pt-4 hero-word"
              style={{ animationDelay: `${words.length * 80 + 250}ms` }}
            >
              <button 
                onClick={handleStartLearning} 
                disabled={loading}
                className="text-[14px] px-8 py-4 font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  borderRadius: "25px",
                  border: "none",
                }}
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {loading ? "Checking Session..." : "Start Learning"}
              </button>
              <Link 
                href="/#features" 
                className="text-[14px] px-8 py-4 font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                style={{ 
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  borderRadius: "25px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.15)",
                }}
              >
                Explore Features
              </Link>
            </div>

            {/* Social proof mini-stats */}
            <div
              className="flex flex-wrap gap-[40px] pt-8 hero-word"
              style={{ animationDelay: `${words.length * 80 + 400}ms` }}
            >
              {[
                { num: "5,000+", label: "Students" },
                { num: "50+", label: "Subjects" },
                { num: "₹40", label: "/ month" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <span
                    className="text-[28px] font-bold"
                    style={{
                      fontFamily: "'SF Pro Display', sans-serif",
                      color: "#ffffff",
                    }}
                  >
                    {stat.num}
                  </span>
                  <span
                    className="text-[12px] uppercase tracking-[0.1em]"
                    style={{
                      color: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — 40% */}
          <div className="lg:col-span-2 hidden lg:flex items-center justify-center">
            <div
              className="relative w-full max-w-[380px] aspect-[4/5] rounded-[25px] flex items-center justify-center overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(20px)",
                boxShadow: "inset 0 0 40px rgba(255, 255, 255, 0.02)",
              }}
            >
              {/* Floating inner elements */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] right-[15%] w-24 h-24 rounded-full bg-blue-600/10 blur-2xl animate-pulse" />
                <div className="absolute bottom-[20%] left-[15%] w-32 h-32 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
              </div>

              <div className="relative text-center z-10 p-8">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-inner">
                  <span className="text-[40px]">🎓</span>
                </div>
                <h3 className="text-[24px] font-bold mb-2" style={{ color: "#ffffff" }}>Premium Access</h3>
                <p className="text-[14px] opacity-60 leading-relaxed">
                  Join thousands of pharmacy students mastering their curriculum with structured resources.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 w-3/4 rounded-full" />
                   </div>
                   <div className="flex justify-between text-[11px] opacity-40 uppercase tracking-widest">
                     <span>Progress</span>
                     <span>75%</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
