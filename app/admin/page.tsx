"use client";

import dynamic from "next/dynamic";
import { useAdminStats, useAdminUsers, useRealtimeAnalytics } from "@/hooks/useFirestore";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";

const ActivityFeed = dynamic(() => import("@/components/admin/ActivityFeed"), {
  ssr: false,
  loading: () => <div className="lg:col-span-2 h-[400px] bg-cream animate-pulse rounded-xl" />
});


export default function AdminDashboardPage() {
  const { stats, loading } = useAdminStats();
  const { users, loading: usersLoading } = useAdminUsers();
  const { events, metrics: analytics, loading: analyticsLoading } = useRealtimeAnalytics();
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
      label: "Marketplace Sales",
      value: stats.totalMarketplaceSales.toString(),
      icon: "🏪",
      bg: "rgba(216,197,247,0.12)",
      color: "var(--color-badge-lavender-text)",
    },
    {
      label: "Active Tickets",
      value: stats.pendingUrgentTickets.toString(),
      icon: "⚡",
      bg: "rgba(197,247,232,0.15)",
      color: "#059669", // Emerald
      isRealtime: true,
    },
    {
      label: "Total Resources",
      value: stats.totalResources.toString(),
      icon: "📚",
      bg: "rgba(247,223,197,0.12)",
      color: "var(--color-badge-peach-text)",
    },
    {
      label: "Views Today",
      value: analytics.viewsToday.toString(),
      icon: "👁️",
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
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Dashboard
          </h1>
          <p className="text-[14px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
            Real-time overview of Cubepharm platform metrics
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint/10 text-[11px] font-bold text-mint-text animate-pulse">
           <span className="w-2 h-2 rounded-full bg-mint-text"></span>
           LIVE ANALYTICS ACTIVE
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-5 flex items-start gap-4 transition-all hover:shadow-md group"
            style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}
          >
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center text-[20px] shrink-0 transition-transform ${m.isRealtime ? 'group-hover:scale-110' : ''}`}
              style={{ background: m.bg }}
            >
              {m.icon}
            </div>
            <div>
              <p className="text-[12px] font-medium mb-0.5" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                {m.label}
              </p>
              <p className="text-[24px] font-bold" style={{ fontFamily: "var(--font-display)", color: m.color }}>
                {loading || (m.isRealtime && analyticsLoading) ? "..." : m.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Feed */}
        <ActivityFeed events={events} loading={analyticsLoading} />


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
                    <button 
                      onClick={async () => {
                        const token = await (window as any).firebaseAuth.currentUser.getIdToken();
                        const res = await fetch("/api/chat/rooms", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            contextType: "direct_support",
                            contextId: u.uid,
                            metadata: {
                              title: `Support: ${u.displayName || u.email.split('@')[0]}`,
                            }
                          })
                        });
                        if (res.ok) router.push("/my-chat");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-all"
                    >
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div
        className="mt-6 rounded-xl p-6"
        style={{ background: "var(--color-navy)", color: "white" }}
      >
        <h2 className="text-[18px] font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--color-candy-rose)" }}>
          Admin Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-[13px] font-bold mb-1">Marketplace</p>
              <p className="text-[11px] opacity-70 mb-3">Manage PPT listings and sales.</p>
              <button
                onClick={() => router.push("/admin/marketplace")}
                className="text-[11px] font-bold uppercase tracking-wider text-candy-rose hover:opacity-80 transition-opacity"
              >
                Manage Shop →
              </button>
           </div>
           <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[13px] font-bold mb-1">Support Hub</p>
              <p className="text-[11px] opacity-70 mb-3">Live chat with students in real-time.</p>
              <button
                onClick={() => router.push("/my-chat")}
                className="text-[11px] font-bold uppercase tracking-wider text-candy-rose hover:opacity-80 transition-opacity"
              >
                Open Chat →
              </button>
           </div>
           <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[13px] font-bold mb-1">Urgent Deals</p>
              <p className="text-[11px] opacity-70 mb-3">Reply to AI-negotiated tickets.</p>
              <button
                onClick={() => router.push("/admin/deals")}
                className="text-[11px] font-bold uppercase tracking-wider text-candy-rose hover:opacity-80 transition-opacity"
              >
                Check Tickets →
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
