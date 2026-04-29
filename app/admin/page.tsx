"use client";

import { useAdminStats, useAdminUsers } from "@/hooks/useFirestore";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const { stats, loading } = useAdminStats();
  const { users, loading: usersLoading } = useAdminUsers();
  const router = useRouter();

  const recentUsers = users.slice(0, 5);

  const metrics = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: "👥",
      bg: "rgba(247,197,216,0.12)",
      color: "var(--color-badge-rose-text)",
    },
    {
      label: "Premium Users",
      value: stats.premiumUsers.toLocaleString(),
      icon: "👑",
      bg: "rgba(216,197,247,0.12)",
      color: "var(--color-badge-lavender-text)",
    },
    {
      label: "Active Today",
      value: stats.activeToday.toString(),
      icon: "🔥",
      bg: "rgba(197,247,232,0.12)",
      color: "var(--color-badge-mint-text)",
    },
    {
      label: "Total Resources",
      value: stats.totalResources.toString(),
      icon: "📚",
      bg: "rgba(247,223,197,0.12)",
      color: "var(--color-badge-peach-text)",
    },
    {
      label: "Total Payments",
      value: stats.paymentCount.toString(),
      icon: "💳",
      bg: "rgba(197,226,247,0.12)",
      color: "var(--color-badge-blue-text)",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Dashboard
        </h1>
        <p className="text-[14px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
          Real-time overview of PharmaCademy platform metrics
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-5 flex items-start gap-4 transition-all hover:shadow-md"
            style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}
          >
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center text-[20px] shrink-0"
              style={{ background: m.bg }}
            >
              {m.icon}
            </div>
            <div>
              <p className="text-[12px] font-medium mb-0.5" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                {m.label}
              </p>
              <p className="text-[24px] font-bold" style={{ fontFamily: "var(--font-display)", color: m.color }}>
                {loading ? "..." : m.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Tips */}
        <div
          className="lg:col-span-2 rounded-xl p-6"
          style={{ background: "var(--color-navy)", color: "white" }}
        >
          <h2 className="text-[18px] font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}>
            Admin Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-[13px] font-bold mb-1">Upload Content</p>
                <p className="text-[11px] opacity-70 mb-3">Add new PYQs or notes instantly.</p>
                <button
                  onClick={() => router.push("/admin/content")}
                  className="text-[11px] font-bold uppercase tracking-wider text-candy-rose hover:opacity-80 transition-opacity"
                >
                  Go to Content →
                </button>
             </div>
             <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-[13px] font-bold mb-1">Verify Users</p>
                <p className="text-[11px] opacity-70 mb-3">Check premium status and streaks.</p>
                <button
                  onClick={() => router.push("/admin/users")}
                  className="text-[11px] font-bold uppercase tracking-wider text-candy-rose hover:opacity-80 transition-opacity"
                >
                  Manage Users →
                </button>
             </div>
             <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-[13px] font-bold mb-1">System Health</p>
                <p className="text-[11px] opacity-70 mb-3">Check for missing subjects/images.</p>
                <button
                  onClick={() => router.push("/admin/content")}
                  className="text-[11px] font-bold uppercase tracking-wider text-candy-rose hover:opacity-80 transition-opacity"
                >
                  Check Content →
                </button>
             </div>
          </div>
        </div>

        {/* Recent Users Card */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl p-6 h-full"
            style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Recent Users
              </h2>
              <button 
                onClick={() => router.push("/admin/users")}
                className="text-[11px] font-bold text-candy-rose uppercase"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {usersLoading ? (
                <div className="text-[12px] opacity-50">Loading users...</div>
              ) : recentUsers.length === 0 ? (
                <div className="text-[12px] opacity-50">No users found.</div>
              ) : (
                recentUsers.map((u) => (
                  <div key={u.uid} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: "var(--color-navy)" }}>{u.displayName || "Anonymous"}</p>
                      <p className="text-[11px] opacity-60">{u.email}</p>
                    </div>
                    {u.isPremium && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lavender/10 text-lavender-text font-bold">
                        PREMIUM
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
