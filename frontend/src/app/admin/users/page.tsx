"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminNav from "@/components/AdminNav";
import { apiRequest } from "@/lib/api";
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface UserItem {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "student";
  status: "active" | "disabled";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let queryUrl = "/api/users";
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (params.toString()) queryUrl += `?${params.toString()}`;

      const data = await apiRequest<UserItem[]>(queryUrl);
      setUsers(data);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load users", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const toggleStatus = async (uid: string, currentStatus: string, email: string) => {
    const nextStatus = currentStatus === "active" ? "disabled" : "active";
    if (!confirm(`Are you sure you want to change account status for ${email} to '${nextStatus}'?`)) {
      return;
    }

    try {
      await apiRequest(`/api/users/${uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setMessage({ text: `Account for ${email} is now ${nextStatus}.`, type: "success" });
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to update status", type: "error" });
    }
  };

  const toggleRole = async (uid: string, currentRole: string, email: string) => {
    const nextRole = currentRole === "admin" ? "student" : "admin";
    if (!confirm(`Are you sure you want to change the role of ${email} to '${nextRole}'?`)) {
      return;
    }

    try {
      await apiRequest(`/api/users/${uid}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      setMessage({ text: `Role for ${email} updated to ${nextRole}.`, type: "success" });
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to update role", type: "error" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <AdminNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#0D1445]" />
              User & Student Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D]">
              Review registered platform users, enforce account status (Active / Disabled), and maintain secure role assignments.
            </p>
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between font-medium ${
                message.type === "success"
                  ? "bg-[#EEF6F3] border border-[#C2D9D1] text-[#1E4E3F]"
                  : "bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633]"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="underline ml-4 font-bold cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Search & Filters */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#686A7D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="user-search"
                  name="search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student name or email..."
                  aria-label="Search by student name or email"
                  className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2">
              <label htmlFor="user-role-filter" className="text-xs text-[#686A7D] font-medium">Filter Role:</label>
              <select
                id="user-role-filter"
                name="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3 py-2 text-xs text-[#17172B] font-semibold focus:outline-none focus:border-[#0D1445]"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-24 flex justify-center text-[#686A7D]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-[#686A7D] text-xs">
                No users found matching query criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F7FA] text-[#686A7D] uppercase tracking-wider font-bold border-b border-[#E4E3EC]">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">User ID (UID)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E3EC]">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-[#F7F7FA] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#17172B]">{u.name || "Unnamed"}</div>
                          <div className="text-[11px] text-[#686A7D]">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "admin"
                                ? "bg-[#0D1445] text-white"
                                : "bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB]"
                            }`}
                          >
                            {u.role === "admin" && <Shield className="w-3 h-3 text-[#BFBFDB]" />}
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === "active"
                                ? "bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]"
                                : "bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]"
                            }`}
                          >
                            {u.status === "active" ? (
                              <CheckCircle2 className="w-3 h-3 text-[#1E4E3F]" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-[#7A2633]" />
                            )}
                            {u.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#686A7D]">
                          {u.uid}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleRole(u.uid, u.role, u.email)}
                            className="text-[11px] font-bold text-[#0D1445] hover:underline cursor-pointer"
                          >
                            Switch to {u.role === "admin" ? "Student" : "Admin"}
                          </button>
                          <span className="text-[#E4E3EC]">|</span>
                          <button
                            type="button"
                            onClick={() => toggleStatus(u.uid, u.status, u.email)}
                            className={`text-[11px] font-bold cursor-pointer hover:underline ${
                              u.status === "active" ? "text-[#7A2633]" : "text-[#1E4E3F]"
                            }`}
                          >
                            {u.status === "active" ? "Disable Account" : "Activate Account"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
