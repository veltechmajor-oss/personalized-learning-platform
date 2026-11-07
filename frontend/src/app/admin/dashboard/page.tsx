"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminNav from "@/components/AdminNav";
import { apiRequest } from "@/lib/api";
import {
  Users,
  Video,
  FileCheck,
  TrendingUp,
  ShieldAlert,
  PlusCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Folder,
  AlertTriangle,
} from "lucide-react";

interface AdminOverviewData {
  total_users: number;
  total_videos: number;
  total_assessments: number;
  total_attempts: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminOverviewData>({
    total_users: 0,
    total_videos: 0,
    total_assessments: 0,
    total_attempts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);
        const [users, videos, assessments] = await Promise.all([
          apiRequest<any[]>("/api/users"),
          apiRequest<any[]>("/api/videos"),
          apiRequest<any[]>("/api/assessments"),
        ]);

        setStats({
          total_users: users.length,
          total_videos: videos.length,
          total_assessments: assessments.length,
          total_attempts: 0,
        });
      } catch (err: any) {
        setError(err?.message || "Failed to connect to backend service");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <AdminNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header Banner */}
          <div className="rounded-3xl bg-[#0D1445] text-white p-7 sm:p-9 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A235F] border border-[#2B357E] text-[#C2D9D1] text-xs font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#C2D9D1]" /> Administrator Control Console
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Academic Platform Management
                </h1>
                <p className="text-xs sm:text-sm text-[#BFBFDB] leading-relaxed">
                  Manage student accounts, author objective assessments, publish video curriculum modules, and inspect academic progress records.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href="/admin/videos"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#BFBFDB] hover:bg-[#A8A8C8] text-[#0D1445] text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Manage Videos
                </Link>
                <Link
                  href="/admin/assessments"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A235F] hover:bg-[#25307A] text-white text-xs font-semibold border border-[#2B357E] transition-all cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-[#C2D9D1]" /> Create Assessment
                </Link>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633] text-xs flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#AD525E]" />
                <span>{error}</span>
              </div>
              <button onClick={() => window.location.reload()} className="underline font-bold cursor-pointer ml-3">
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex justify-center text-[#686A7D]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
            </div>
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>Registered Students</span>
                    <Users className="w-4 h-4 text-[#0D1445]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">{stats.total_users}</div>
                  <div className="mt-2 text-xs text-[#686A7D]">
                    Active & enrolled student accounts
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>Curriculum Video Lessons</span>
                    <Video className="w-4 h-4 text-[#58587A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">{stats.total_videos}</div>
                  <div className="mt-2 text-xs text-[#686A7D]">
                    In published course folders
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>Objective Assessments</span>
                    <FileCheck className="w-4 h-4 text-[#1E4E3F]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">{stats.total_assessments}</div>
                  <div className="mt-2 text-xs text-[#686A7D]">
                    AI & instructor-authored tests
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>Academic Records</span>
                    <TrendingUp className="w-4 h-4 text-[#7A2633]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">Active</div>
                  <div className="mt-2 text-xs text-[#686A7D]">
                    Live Firestore dossier tracking
                  </div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-[#BFBFDB] transition-all">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#F2F2F9] text-[#0D1445] flex items-center justify-center mb-3 font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#0D1445]">Manage Student Accounts</h3>
                    <p className="text-xs text-[#686A7D] mt-1.5 leading-relaxed">
                      View all registered learners, manage account status, and inspect individual academic engagement.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E4E3EC]">
                    <Link
                      href="/admin/users"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D1445] hover:underline"
                    >
                      Open User Management <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-[#BFBFDB] transition-all">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#EEF6F3] text-[#1E4E3F] flex items-center justify-center mb-3 font-bold">
                      <Folder className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#0D1445]">Curriculum Video Folders</h3>
                    <p className="text-xs text-[#686A7D] mt-1.5 leading-relaxed">
                      Organize course folders, assign YouTube video lessons, and configure playback watch gates.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E4E3EC]">
                    <Link
                      href="/admin/videos"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D1445] hover:underline"
                    >
                      Manage Video Modules <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-[#BFBFDB] transition-all">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#FAF5F7] text-[#7A2633] flex items-center justify-center mb-3 font-bold">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#0D1445]">Student Academic Dossiers</h3>
                    <p className="text-xs text-[#686A7D] mt-1.5 leading-relaxed">
                      Review verified video playback logs, assessment submission marks, and topic-level mastery.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E4E3EC]">
                    <Link
                      href="/admin/progress"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D1445] hover:underline"
                    >
                      View Academic Records <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
