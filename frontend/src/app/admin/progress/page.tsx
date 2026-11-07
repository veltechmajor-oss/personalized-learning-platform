"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminNav from "@/components/AdminNav";
import { apiRequest } from "@/lib/api";
import {
  TrendingUp,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Video,
  Loader2,
  Clock,
  ArrowRight,
  Folder,
  Layers,
  Award,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface UserItem {
  uid: string;
  email: string;
  name: string;
  role: string;
}

interface AcademicVideoRecordItem {
  student_id: string;
  student_name: string;
  student_email: string;
  folder_id?: string;
  folder_name?: string;
  video_id: string;
  video_title: string;
  subject: string;
  completion_percentage: number;
  is_completed: boolean;
  last_watched_at?: string;
  assessment_id?: string;
  assessment_title?: string;
  has_attempted: boolean;
  attempt_count: number;
  highest_score_percentage?: number;
  passed?: boolean;
  latest_attempt_at?: string;
}

interface StudentProgressData {
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
  }>;
  recent_activities: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: string;
    score?: number | null;
  }>;
}

export default function AdminAcademicRecordsPage() {
  const [activeTab, setActiveTab] = useState<"records" | "dossier">("records");

  // Records Table State
  const [records, setRecords] = useState<AcademicVideoRecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [recordSearch, setRecordSearch] = useState("");

  // Individual Student Dossier State
  const [students, setStudents] = useState<UserItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);

  // Load Records
  const loadRecords = async () => {
    try {
      setLoadingRecords(true);
      const data = await apiRequest<AcademicVideoRecordItem[]>("/api/progress/records");
      setRecords(data);
    } catch {
      // Ignore
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Load Students
  useEffect(() => {
    async function loadStudents() {
      try {
        setLoadingStudents(true);
        const data = await apiRequest<UserItem[]>("/api/users?role=student");
        setStudents(data);
        if (data.length > 0 && !selectedStudentId) {
          setSelectedStudentId(data[0].uid);
        }
      } catch {
        // Ignore
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, []);

  // Load Selected Student Dossier
  useEffect(() => {
    async function fetchStudentProgress() {
      if (!selectedStudentId) return;
      try {
        setProgressLoading(true);
        const data = await apiRequest<StudentProgressData>(`/api/progress/student/${selectedStudentId}`);
        setProgress(data);
      } catch {
        // Fallback
      } finally {
        setProgressLoading(false);
      }
    }
    fetchStudentProgress();
  }, [selectedStudentId]);

  const filteredRecords = records.filter((r) => {
    const q = recordSearch.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(q) ||
      r.student_email.toLowerCase().includes(q) ||
      r.video_title.toLowerCase().includes(q) ||
      (r.folder_name && r.folder_name.toLowerCase().includes(q)) ||
      r.subject.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <AdminNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> Model 2: Academic Progress & Assessment Scores
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-[#0D1445]" />
              Student Academic Records & Video Tracking
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D]">
              Review real student video watch progress across course folders, completion statuses, anti-tamper gate compliance, and objective assessment scores.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#E4E3EC] space-x-6">
            <button
              onClick={() => setActiveTab("records")}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "records"
                  ? "border-[#0D1445] text-[#0D1445]"
                  : "border-transparent text-[#686A7D] hover:text-[#17172B]"
              }`}
            >
              <Layers className="w-4 h-4" />
              Curriculum Video & Assessment Records ({records.length})
            </button>
            <button
              onClick={() => setActiveTab("dossier")}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "dossier"
                  ? "border-[#0D1445] text-[#0D1445]"
                  : "border-transparent text-[#686A7D] hover:text-[#17172B]"
              }`}
            >
              <Users className="w-4 h-4" />
              Individual Student Dossiers
            </button>
          </div>

          {/* TAB 1: Curriculum Video & Assessment Records Table */}
          {activeTab === "records" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#686A7D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-progress-search"
                    name="recordSearch"
                    type="text"
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    placeholder="Search by student, course folder, or lesson title..."
                    aria-label="Search by student, course folder, or lesson title"
                    className="w-full bg-white border border-[#E4E3EC] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] shadow-2xs"
                  />
                </div>
                <button
                  onClick={loadRecords}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E4E3EC] hover:bg-[#F7F7FA] text-[#0D1445] text-xs font-bold cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Records
                </button>
              </div>

              {loadingRecords ? (
                <div className="py-24 flex justify-center text-[#686A7D]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-12 text-center text-[#686A7D] text-xs shadow-xs">
                  <Video className="w-10 h-10 text-[#BFBFDB] mx-auto mb-3" />
                  <p className="font-bold text-[#17172B] text-sm">No Student Video Records Available</p>
                  <p className="mt-1 text-xs text-[#686A7D]">
                    Records will populate as enrolled students watch video lessons and take assessments.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-[#E4E3EC] rounded-2xl shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F7FA] text-[#686A7D] uppercase tracking-wider font-bold border-b border-[#E4E3EC]">
                        <tr>
                          <th className="py-3.5 px-4">Student</th>
                          <th className="py-3.5 px-4">Course Folder</th>
                          <th className="py-3.5 px-4">Video Lesson</th>
                          <th className="py-3.5 px-4">Watch Progress</th>
                          <th className="py-3.5 px-4">Assessment</th>
                          <th className="py-3.5 px-4">Attempts</th>
                          <th className="py-3.5 px-4">Score</th>
                          <th className="py-3.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E3EC]">
                        {filteredRecords.map((r, idx) => (
                          <tr key={idx} className="hover:bg-[#F7F7FA] transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#17172B] block">{r.student_name}</span>
                              <span className="text-[11px] text-[#686A7D]">{r.student_email}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#0D1445] flex items-center gap-1">
                                <Folder className="w-3.5 h-3.5" />
                                {r.folder_name || "General Curriculum"}
                              </span>
                              <span className="text-[10px] text-[#686A7D] block">{r.subject}</span>
                            </td>
                            <td className="py-3.5 px-4 text-[#17172B] font-semibold">
                              {r.video_title}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-[#F7F7FA] rounded-full h-1.5 overflow-hidden border border-[#E4E3EC]">
                                  <div
                                    className={`h-1.5 rounded-full ${r.is_completed ? "bg-[#1E4E3F]" : "bg-[#0D1445]"}`}
                                    style={{ width: `${Math.min(r.completion_percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-[#17172B]">{r.completion_percentage}%</span>
                              </div>
                              <span className="text-[10px] text-[#686A7D] block mt-0.5">
                                {r.is_completed ? "Threshold Satisfied" : "In Progress"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {r.assessment_title ? (
                                <span className="text-[#17172B] font-medium">{r.assessment_title}</span>
                              ) : (
                                <span className="text-[#686A7D] italic">Not Generated</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[#17172B]">
                              {r.attempt_count > 0 ? (
                                <span className="font-bold text-[#0D1445]">{r.attempt_count}</span>
                              ) : (
                                <span className="text-[#686A7D]">0</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#0D1445]">
                              {r.highest_score_percentage !== undefined && r.highest_score_percentage !== null ? (
                                `${r.highest_score_percentage}%`
                              ) : (
                                <span className="text-[#686A7D] font-normal">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {r.passed === true ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]">
                                  <CheckCircle2 className="w-3 h-3" /> Passed
                                </span>
                              ) : r.has_attempted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]">
                                  Needs Revision
                                </span>
                              ) : r.is_completed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB]">
                                  Test Unlocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F7] text-[#58587A] border border-[#E0D0D9]">
                                  Video Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Individual Student Dossiers */}
          {activeTab === "dossier" && (
            <div>
              {loadingStudents ? (
                <div className="py-24 flex justify-center text-[#686A7D]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
                </div>
              ) : students.length === 0 ? (
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-12 text-center text-[#686A7D] text-xs shadow-xs">
                  <Users className="w-10 h-10 text-[#BFBFDB] mx-auto mb-3" />
                  <p className="font-bold text-[#17172B] text-sm">No Registered Students Found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Left Col: Students Selector */}
                  <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs space-y-3">
                    <h2 className="text-xs font-bold text-[#0D1445] uppercase tracking-wider mb-2">
                      Enrolled Students ({students.length})
                    </h2>
                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                      {students.map((st) => (
                        <button
                          key={st.uid}
                          type="button"
                          onClick={() => setSelectedStudentId(st.uid)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                            selectedStudentId === st.uid
                              ? "bg-[#F2F2F9] border-[#0D1445] text-[#0D1445] shadow-xs font-bold"
                              : "bg-[#F7F7FA] border-[#E4E3EC] text-[#17172B] hover:border-[#BFBFDB]"
                          }`}
                        >
                          <div className="font-bold truncate">{st.name}</div>
                          <div className="text-[11px] text-[#686A7D] truncate">{st.email}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right 3 Cols: Selected Student Academic Record */}
                  <div className="lg:col-span-3 space-y-6">
                    {progressLoading ? (
                      <div className="py-24 flex justify-center text-[#686A7D]">
                        <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
                      </div>
                    ) : progress ? (
                      <>
                        <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
                          <div className="flex items-center justify-between pb-4 border-b border-[#E4E3EC] mb-4">
                            <div>
                              <span className="text-[10px] font-bold text-[#58587A] uppercase tracking-wider bg-[#F2F2F9] px-2.5 py-0.5 rounded-full border border-[#BFBFDB]">
                                Individual Academic Profile
                              </span>
                              <h2 className="text-xl font-bold text-[#0D1445] mt-1.5">{progress.student_name}</h2>
                              <span className="text-xs text-[#686A7D]">ID: {progress.student_id}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-[#686A7D] font-medium">Overall Average Score</div>
                              <div className="text-2xl font-bold text-[#0D1445]">
                                {progress.average_assessment_score !== null ? (
                                  `${progress.average_assessment_score}%`
                                ) : (
                                  <span className="text-sm font-normal text-[#686A7D]">No attempts</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC]">
                              <div className="text-xs text-[#686A7D] font-medium">Completed Videos</div>
                              <div className="text-lg font-bold text-[#0D1445] mt-1">
                                {progress.completed_videos} / {progress.total_assigned_videos}
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC]">
                              <div className="text-xs text-[#686A7D] font-medium">Assessments Taken</div>
                              <div className="text-lg font-bold text-[#0D1445] mt-1">
                                {progress.total_assessments_attempted} / {progress.total_assessments_available}
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC]">
                              <div className="text-xs text-[#686A7D] font-medium">Indexed Files</div>
                              <div className="text-lg font-bold text-[#0D1445] mt-1">
                                {progress.total_documents_uploaded}
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC]">
                              <div className="text-xs text-[#686A7D] font-medium">RAG Inquiries</div>
                              <div className="text-lg font-bold text-[#0D1445] mt-1">
                                {progress.total_rag_queries}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Topic Mastery Records */}
                        <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
                          <h3 className="text-sm font-bold text-[#0D1445] mb-3">Topic-Level Performance</h3>
                          {progress.topic_performance.length === 0 ? (
                            <p className="text-xs text-[#686A7D]">No graded topics recorded.</p>
                          ) : (
                            <div className="divide-y divide-[#E4E3EC]">
                              {progress.topic_performance.map((tp, idx) => (
                                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-[#17172B]">{tp.topic}</span>
                                    <span className="text-[11px] text-[#686A7D] block">{tp.subject}</span>
                                  </div>
                                  <div className="text-right">
                                    {tp.average_score !== null ? (
                                      <span className="font-bold text-[#0D1445]">{tp.average_score}%</span>
                                    ) : (
                                      <span className="text-[#686A7D] italic">Insufficient data</span>
                                    )}
                                    <span
                                      className={`text-[10px] ml-2 px-2 py-0.5 rounded-full font-bold ${
                                        tp.status === "Mastered"
                                          ? "bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]"
                                          : tp.status === "Needs Revision"
                                          ? "bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]"
                                          : "bg-[#F7F7FA] text-[#686A7D] border border-[#E4E3EC]"
                                      }`}
                                    >
                                      {tp.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
