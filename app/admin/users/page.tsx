"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { useAdminUsers } from "@/hooks/useFirestore";

export default function AdminUsersPage() {
  const { users, loading, error, togglePremium } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "premium" | "free">("all");
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchesSearch = !search || 
      u.email.toLowerCase().includes(search.toLowerCase()) || 
      (u.displayName && u.displayName.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === "all" || (filter === "premium" ? u.isPremium : !u.isPremium);
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const handleTogglePremium = async (uid: string, currentStatus: boolean) => {
    setProcessingUid(uid);
    try {
      await togglePremium(uid, !currentStatus);
    } catch (err) {
      alert("Failed to update user status.");
    } finally {
      setProcessingUid(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Users
        </h1>
        <p className="text-[14px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
          Manage real-time user accounts and access
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 px-4 py-2.5 rounded-xl outline-none text-[14px]"
          style={{ background: "rgba(26,31,60,0.02)", border: "1px solid rgba(26,31,60,0.1)", fontFamily: "var(--font-body)" }}
        />
        <div className="flex gap-2">
          {(["all", "premium", "free"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-[12px] font-medium px-4 py-2 rounded-full capitalize transition-colors"
              style={{
                background: filter === f ? "var(--color-navy)" : "rgba(26,31,60,0.04)",
                color: filter === f ? "var(--color-candy-rose)" : "var(--color-mid)",
                fontFamily: "var(--font-body)",
                border: filter === f ? "none" : "0.5px solid rgba(26,31,60,0.08)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "rgba(26,31,60,0.02)" }}>
                {["User", "Status", "Streak", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium uppercase tracking-wider px-4 py-3" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {error ? (
                 <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-red-500 text-[14px]">Error loading users: {error.message}</td>
                 </tr>
              ) : loading && users.length === 0 ? (
                 <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-[14px]">Loading user data...</td>
                 </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-[14px]">No users found matching your filters.</td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-[14px] font-medium" style={{ fontFamily: "var(--font-body)" }}>{user.displayName || "Anonymous"}</p>
                        <p className="text-[12px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={user.isPremium ? "rose" : "navy"}>
                        {user.isPremium ? "👑 Premium" : "Free"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                      🔥 {user.streak || 0}
                    </td>
                    <td className="px-4 py-4 text-[12px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleTogglePremium(user.uid, user.isPremium)}
                        disabled={processingUid === user.uid}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        style={{
                          background: user.isPremium ? "rgba(239,68,68,0.06)" : "rgba(197,247,232,0.15)",
                          color: user.isPremium ? "#dc2626" : "var(--color-badge-mint-text)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {processingUid === user.uid ? "..." : user.isPremium ? "Revoke" : "Grant Premium"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
