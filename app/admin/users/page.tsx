"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { useAdminUsers } from "@/hooks/useFirestore";

export default function AdminUsersPage() {
  const { users, loading, error } = useAdminUsers();
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const matchesSearch = !search || 
      u.email.toLowerCase().includes(search.toLowerCase()) || 
      (u.displayName && u.displayName.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  }).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Users
        </h1>
        <p className="text-[14px]" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>
          Manage real-time user accounts and community engagement
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
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-cream)", border: "0.5px solid #e5e5e5" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "rgba(26,31,60,0.02)" }}>
                {["User", "Streak", "Joined"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium uppercase tracking-wider px-4 py-3" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {error ? (
                 <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-red-500 text-[14px]">Error loading users: {error.message}</td>
                 </tr>
              ) : loading && users.length === 0 ? (
                 <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-gray-400 text-[14px]">Loading user data...</td>
                 </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-gray-400 text-[14px]">No users found matching your search.</td>
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
                    <td className="px-4 py-4 text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                      🔥 {user.streak || 0}
                    </td>
                    <td className="px-4 py-4 text-[12px]" style={{ color: "var(--color-slate)", fontFamily: "var(--font-body)" }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
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
