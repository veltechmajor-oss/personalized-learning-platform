"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentNav from "@/components/StudentNav";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  GraduationCap,
  Video,
  FileCheck,
  FileText,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Loader2,
} from "lucide-react";

interface DashboardData {
  student_id: string;
  student_name: string;
  total_assigned_videos: number;
  completed_videos: number;
  completion_rate_percentage: number;
  total_assessments_available: number;
  total_assessments_attempted: number;
  average_assessment_score: number | null;
  total_documents_uploaded: number;
  total_rag_queries: number;
  topic_performance: Array<{
    topic: string;
    subject: string;
    assessment_count: number;
    average_score: number | null;
    status: string;
  }>;
  revision_recommendations: Array<{
    topic: string;
    subject: string;
    priority: string;
    reason: string;
    action_type: string;
    resource_id?: string;
  }>;
  recent_activities: Array<{
    id: string;
    type: string;
    title: string;
    subject: string;
    timestamp: string;
    score?: number | null;
  }>;
}

export default function StudentDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !profile) return;
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await apiRequest<DashboardData>("/api/progress/me");
        setData(res);
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [authLoading, profile]);

  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <StudentNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Welcome Banner */}
          <div className="rounded-3xl bg-[#0D1445] text-white p-7 sm:p-9 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A235F] border border-[#2B357E] text-[#BFBFDB] text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Academic Progress Center
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Welcome back, {profile?.name || "Student"}!
                </h1>
                <p className="text-xs sm:text-sm text-[#BFBFDB] leading-relaxed">
                  Track your personalized RAG research, lecture video completion, objective assessment mastery, and transparent revision advice.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href="/student/important-questions"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#BFBFDB] hover:bg-[#A8A8C8] text-[#0D1445] text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" /> Ask RAG Tutor
                </Link>
                <Link
                  href="/student/videos"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A235F] hover:bg-[#25307A] text-white text-xs font-semibold border border-[#2B357E] transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" /> Watch Lessons
                </Link>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-[#686A7D]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D1445] mb-3" />
              <p className="text-xs font-medium">Calculating verified academic analytics...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633] text-xs font-medium">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>Video Lessons</span>
                    <Video className="w-4 h-4 text-[#0D1445]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">
                    {data.completed_videos} / {data.total_assigned_videos}
                  </div>
                  <div className="mt-2 text-xs text-[#686A7D] flex items-center justify-between">
                    <span>Completion Rate</span>
                    <span className="font-bold text-[#0D1445]">{data.completion_rate_percentage}%</span>
                  </div>
                  <div className="mt-2 w-full bg-[#F7F7FA] rounded-full h-1.5 overflow-hidden border border-[#E4E3EC]">
                    <div
                      className="bg-[#0D1445] h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(data.completion_rate_percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>Average Assessment Score</span>
                    <FileCheck className="w-4 h-4 text-[#1E4E3F]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">
                    {data.average_assessment_score !== null ? (
                      `${data.average_assessment_score}%`
                    ) : (
                      <span className="text-sm font-normal text-[#686A7D]">No attempts yet</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-[#686A7D]">
                    {data.total_assessments_attempted} attempts across {data.total_assessments_available} available tests
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>Uploaded Documents</span>
                    <FileText className="w-4 h-4 text-[#58587A]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">
                    {data.total_documents_uploaded}
                  </div>
                  <div className="mt-2 text-xs text-[#686A7D]">
                    PDF, DOCX, & TXT indexed in Qdrant
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#686A7D] text-xs font-medium mb-2">
                    <span>RAG Questions Explored</span>
                    <HelpCircle className="w-4 h-4 text-[#7A2633]" />
                  </div>
                  <div className="text-2xl font-bold text-[#0D1445]">
                    {data.total_rag_queries}
                  </div>
                  <div className="mt-2 text-xs text-[#686A7D]">
                    Strictly grounded in uploaded curriculum
                  </div>
                </div>
              </div>

              {/* Two Learning Models Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Model 1 Card */}
                <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-6 transition-all shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#F2F2F9] text-[#0D1445] flex items-center justify-center mb-4">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold text-[#58587A] tracking-wider uppercase mb-1">
                      Model 1
                    </div>
                    <h3 className="text-base font-bold text-[#0D1445]">
                      RAG-Based Important Question Explainer
                    </h3>
                    <p className="mt-2 text-xs text-[#686A7D] leading-relaxed">
                      Upload your course syllabus, lecture PDFs, or notes. Ask critical academic questions and receive text-based explanations grounded strictly in your verified notes.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E4E3EC] flex items-center gap-3">
                    <Link
                      href="/student/important-questions"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D1445] hover:underline"
                    >
                      Open Explainer <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[#BFBFDB]">•</span>
                    <Link
                      href="/student/documents"
                      className="inline-flex items-center gap-1.5 text-xs text-[#686A7D] hover:text-[#17172B]"
                    >
                      Manage Uploads ({data.total_documents_uploaded})
                    </Link>
                  </div>
                </div>

                {/* Model 2 Card */}
                <div className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-6 transition-all shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#EEF6F3] text-[#1E4E3F] flex items-center justify-center mb-4">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold text-[#1E4E3F] tracking-wider uppercase mb-1">
                      Model 2
                    </div>
                    <h3 className="text-base font-bold text-[#0D1445]">
                      YouTube Video Learning & Assessments
                    </h3>
                    <p className="mt-2 text-xs text-[#686A7D] leading-relaxed">
                      Engage with administrator-curated video lessons. Reach configured playback completion thresholds to unlock objective multiple-choice assessments.
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E4E3EC] flex items-center gap-3">
                    <Link
                      href="/student/videos"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D1445] hover:underline"
                    >
                      Watch Video Lessons <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[#BFBFDB]">•</span>
                    <Link
                      href="/student/assessments"
                      className="inline-flex items-center gap-1.5 text-xs text-[#686A7D] hover:text-[#17172B]"
                    >
                      Take Tests ({data.total_assessments_available})
                    </Link>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Revision Recommendations & Topic Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revision Recommendations */}
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#7A2633]" />
                      <h3 className="text-sm font-bold text-[#0D1445]">
                        Transparent Revision Advice
                      </h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#686A7D]">Rule-Based</span>
                  </div>

                  {data.revision_recommendations.length === 0 ? (
                    <div className="py-8 text-center text-[#686A7D] text-xs">
                      <CheckCircle2 className="w-8 h-8 text-[#1E4E3F] mx-auto mb-2" />
                      All current topics and assigned video lessons meet academic mastery criteria.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.revision_recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-bold text-[#17172B]">{rec.topic}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  rec.priority === "High"
                                    ? "bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]"
                                    : "bg-[#FAF5F7] text-[#58587A] border border-[#E0D0D9]"
                                }`}
                              >
                                {rec.priority} Priority
                              </span>
                              <span className="text-[11px] text-[#686A7D]">{rec.subject}</span>
                            </div>
                            <p className="text-xs text-[#686A7D]">{rec.reason}</p>
                          </div>
                          {rec.action_type === "complete_video" ? (
                            <Link
                              href="/student/videos"
                              className="px-3 py-1.5 text-xs rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white shrink-0 font-bold transition-colors"
                            >
                              Resume
                            </Link>
                          ) : (
                            <Link
                              href="/student/assessments"
                              className="px-3 py-1.5 text-xs rounded-xl bg-white hover:bg-[#F2F2F9] text-[#0D1445] border border-[#E4E3EC] shrink-0 font-bold transition-colors"
                            >
                              Review
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Topic Performance Mastery */}
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#0D1445]" />
                      <h3 className="text-sm font-bold text-[#0D1445]">
                        Topic Performance Breakdown
                      </h3>
                    </div>
                    <Link
                      href="/student/progress"
                      className="text-xs font-bold text-[#0D1445] hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  {data.topic_performance.length === 0 ? (
                    <div className="py-8 text-center text-[#686A7D] text-xs">
                      No published curriculum topics found. Check back once administrator creates lessons.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E4E3EC]">
                      {data.topic_performance.slice(0, 5).map((t, i) => (
                        <div key={i} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-[#17172B]">{t.topic}</div>
                            <div className="text-[11px] text-[#686A7D]">
                              {t.subject} • {t.assessment_count} {t.assessment_count === 1 ? "attempt" : "attempts"}
                            </div>
                          </div>
                          <div className="text-right">
                            {t.average_score !== null ? (
                              <div className="text-xs font-bold text-[#0D1445]">{t.average_score}%</div>
                            ) : (
                              <div className="text-[11px] text-[#686A7D] italic">No score recorded</div>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                                t.status === "Mastered"
                                  ? "bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]"
                                  : t.status === "Needs Revision"
                                  ? "bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]"
                                  : "bg-[#F7F7FA] text-[#686A7D] border border-[#E4E3EC]"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Learning Activity Timeline */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#686A7D]" />
                    <h3 className="text-sm font-bold text-[#0D1445]">Recent Learning Activities</h3>
                  </div>
                  <span className="text-xs text-[#686A7D]">Actual Firestore Records</span>
                </div>

                {data.recent_activities.length === 0 ? (
                  <div className="py-8 text-center text-[#686A7D] text-xs">
                    No learning activity recorded yet. Start by exploring Model 1 (RAG Explainer) or Model 2 (Video Lessons).
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.recent_activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white border border-[#E4E3EC] flex items-center justify-center text-[#0D1445] shrink-0 font-bold">
                            {act.type === "rag_query" && <HelpCircle className="w-4 h-4 text-[#58587A]" />}
                            {act.type === "document_upload" && <FileText className="w-4 h-4 text-[#0D1445]" />}
                            {act.type === "video_completion" && <Video className="w-4 h-4 text-[#1E4E3F]" />}
                            {act.type === "assessment_attempt" && <FileCheck className="w-4 h-4 text-[#7A2633]" />}
                          </div>
                          <div>
                            <span className="font-bold text-[#17172B]">{act.title}</span>
                            <span className="text-[11px] text-[#686A7D] block">{act.subject}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-[#686A7D] font-medium">
                          {act.timestamp ? new Date(act.timestamp).toLocaleDateString() : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}
