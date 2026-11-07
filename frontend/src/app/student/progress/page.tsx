"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentNav from "@/components/StudentNav";
import { apiRequest } from "@/lib/api";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Video,
  FileCheck,
  FileText,
  HelpCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ProgressData {
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

export default function StudentAcademicProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgress() {
      try {
        setLoading(true);
        const res = await apiRequest<ProgressData>("/api/progress/me");
        setData(res);
      } catch (err: any) {
        setError(err?.message || "Failed to load academic progress records.");
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <StudentNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> Shared Progress Management Module
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-[#0D1445]" />
              Academic Progress & Revision Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D] max-w-3xl">
              Transparent, data-backed insights on topic-level mastery. Scores and recommendations are computed exclusively from verified video completion and graded objective assessment submissions.
            </p>
          </div>

          {loading ? (
            <div className="py-24 flex justify-center text-[#686A7D]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633] text-xs font-medium">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs">
                  <div className="text-xs text-[#686A7D] mb-1 font-medium">Curriculum Video Completion</div>
                  <div className="text-2xl font-bold text-[#0D1445]">
                    {data.completed_videos} / {data.total_assigned_videos}
                  </div>
                  <div className="text-xs text-[#0D1445] mt-1.5 font-bold">
                    {data.completion_rate_percentage}% Overall Completion
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs">
                  <div className="text-xs text-[#686A7D] mb-1 font-medium">Assessment Performance</div>
                  <div className="text-2xl font-bold text-[#0D1445]">
                    {data.average_assessment_score !== null ? (
                      `${data.average_assessment_score}%`
                    ) : (
                      <span className="text-sm font-normal text-[#686A7D]">No attempts yet</span>
                    )}
                  </div>
                  <div className="text-xs text-[#1E4E3F] mt-1.5 font-bold">
                    {data.total_assessments_attempted} attempts recorded
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs">
                  <div className="text-xs text-[#686A7D] mb-1 font-medium">RAG Document Grounding</div>
                  <div className="text-2xl font-bold text-[#0D1445]">
                    {data.total_documents_uploaded} Files
                  </div>
                  <div className="text-xs text-[#58587A] mt-1.5 font-bold">
                    {data.total_rag_queries} Questions Explored
                  </div>
                </div>
              </div>

              {/* Revision Advice */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-sm font-bold text-[#0D1445] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#7A2633]" />
                    Transparent Rule-Based Revision Recommendations
                  </h2>
                  <span className="text-[10px] text-[#686A7D] font-bold uppercase">Non-Predictive Heuristic Rules</span>
                </div>

                {data.revision_recommendations.length === 0 ? (
                  <div className="p-8 text-center text-[#686A7D] text-xs">
                    <CheckCircle2 className="w-8 h-8 text-[#1E4E3F] mx-auto mb-2" />
                    No urgent revision needed. All completed curriculum lessons and assessment scores satisfy target mastery.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.revision_recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
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
                          </div>
                          <span className="text-[11px] text-[#0D1445] font-semibold">{rec.subject}</span>
                          <p className="mt-1 text-xs text-[#686A7D] leading-relaxed">{rec.reason}</p>
                        </div>

                        <div className="pt-2 border-t border-[#E4E3EC] flex justify-end">
                          {rec.action_type === "complete_video" ? (
                            <Link
                              href="/student/videos"
                              className="inline-flex items-center gap-1.5 text-xs text-[#0D1445] hover:underline font-bold"
                            >
                              Resume Video Lesson <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <Link
                              href="/student/assessments"
                              className="inline-flex items-center gap-1.5 text-xs text-[#0D1445] hover:underline font-bold"
                            >
                              Review Topic Assessments <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic Mastery Table */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
                <h2 className="text-sm font-bold text-[#0D1445] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0D1445]" />
                  Topic Mastery & Performance Records
                </h2>

                {data.topic_performance.length === 0 ? (
                  <div className="p-8 text-center text-[#686A7D] text-xs">
                    No curriculum topics currently recorded.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F7FA] text-[#686A7D] uppercase tracking-wider font-bold border-b border-[#E4E3EC]">
                        <tr>
                          <th className="py-3 px-4">Curriculum Topic</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Graded Attempts</th>
                          <th className="py-3 px-4">Average Score</th>
                          <th className="py-3 px-4">Mastery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E3EC]">
                        {data.topic_performance.map((tp, idx) => (
                          <tr key={idx} className="hover:bg-[#F7F7FA] transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[#17172B]">{tp.topic}</td>
                            <td className="py-3.5 px-4 text-[#686A7D]">{tp.subject}</td>
                            <td className="py-3.5 px-4 text-[#17172B]">
                              {tp.assessment_count} {tp.assessment_count === 1 ? "attempt" : "attempts"}
                            </td>
                            <td className="py-3.5 px-4">
                              {tp.average_score !== null ? (
                                <span className="font-bold text-[#0D1445]">{tp.average_score}%</span>
                              ) : (
                                <span className="text-[#686A7D] italic">Insufficient data</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-block ${
                                  tp.status === "Mastered"
                                    ? "bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]"
                                    : tp.status === "Needs Revision"
                                    ? "bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]"
                                    : "bg-[#F7F7FA] text-[#686A7D] border border-[#E4E3EC]"
                                }`}
                              >
                                {tp.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Complete Learning Activity Timeline */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
                <h2 className="text-sm font-bold text-[#0D1445] mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#686A7D]" />
                  Chronological Learning Activity Log
                </h2>

                {data.recent_activities.length === 0 ? (
                  <div className="p-8 text-center text-[#686A7D] text-xs">
                    No activities recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E4E3EC]">
                    {data.recent_activities.map((act) => (
                      <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-center text-[#0D1445] shrink-0 font-bold">
                            {act.type === "rag_query" && <HelpCircle className="w-4 h-4 text-[#58587A]" />}
                            {act.type === "document_upload" && <FileText className="w-4 h-4 text-[#0D1445]" />}
                            {act.type === "video_completion" && <Video className="w-4 h-4 text-[#1E4E3F]" />}
                            {act.type === "assessment_attempt" && <FileCheck className="w-4 h-4 text-[#7A2633]" />}
                          </div>
                          <div>
                            <span className="font-bold text-[#17172B]">{act.title}</span>
                            <span className="text-[11px] text-[#686A7D] block">
                              {act.subject} • {new Date(act.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {act.score !== undefined && act.score !== null && (
                          <span className="font-bold text-[#0D1445] bg-[#F2F2F9] px-2.5 py-1 rounded-md border border-[#BFBFDB]">
                            {act.score}%
                          </span>
                        )}
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
