"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentNav from "@/components/StudentNav";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  FileCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";

interface AssessmentItem {
  id: string;
  title: string;
  description: string;
  video_id: string;
  subject: string;
  topic: string;
  total_marks: number;
  question_count: number;
  passing_percentage: number;
  is_eligible: boolean;
  has_attempted: boolean;
  student_score?: number | null;
  passed?: boolean | null;
}

export default function StudentAssessmentsListPage() {
  const { profile, loading: authLoading } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !profile) return;
    async function loadAssessments() {
      try {
        setLoading(true);
        const data = await apiRequest<AssessmentItem[]>("/api/assessments");
        setAssessments(data);
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, [authLoading, profile]);

  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <StudentNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> Model 2: Objective Assessments
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <FileCheck className="w-6 h-6 text-[#0D1445]" />
              Curriculum Objective Assessments
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D] max-w-3xl">
              Take rigorous multiple-choice assessments generated via Google Gemini based on lesson objectives. Each test is locked until you complete the prerequisite video lesson. Results are permanently recorded toward your topic mastery score.
            </p>
          </div>

          {loading ? (
            <div className="py-24 flex justify-center text-[#686A7D]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
            </div>
          ) : assessments.length === 0 ? (
            <div className="bg-white border border-[#E4E3EC] rounded-2xl p-12 text-center text-[#686A7D] text-xs shadow-xs">
              <FileCheck className="w-10 h-10 text-[#BFBFDB] mx-auto mb-3" />
              <p className="font-bold text-[#17172B] text-sm">No Published Assessments Found</p>
              <p className="mt-1 text-xs text-[#686A7D]">
                Instructors have not attached objective assessments yet. Please check back soon or switch to Administrator view to create one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#BFBFDB] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB]">
                        {a.subject}
                      </span>
                      {a.has_attempted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E4E3F] bg-[#EEF6F3] px-2 py-0.5 rounded-full border border-[#C2D9D1]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Score: {a.student_score}%
                        </span>
                      ) : a.is_eligible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0D1445] bg-[#F2F2F9] px-2 py-0.5 rounded-full border border-[#BFBFDB]">
                          Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#58587A] bg-[#FAF5F7] px-2 py-0.5 rounded-full border border-[#E0D0D9]">
                          <Lock className="w-3.5 h-3.5" /> Requires Video
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#0D1445]">{a.title}</h3>
                    <p className="text-xs text-[#686A7D] mt-1 line-clamp-2">
                      {a.description || `Assessment on ${a.topic}`}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#E4E3EC] flex items-center justify-between text-xs text-[#686A7D]">
                      <span>{a.question_count} Questions</span>
                      <span>{a.total_marks} Total Marks</span>
                      <span>Pass: {a.passing_percentage}%</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    {a.has_attempted ? (
                      <Link
                        href={`/student/assessments/${a.id}`}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F7F7FA] hover:bg-[#EBEBF5] text-[#0D1445] text-xs font-bold border border-[#E4E3EC] transition-colors"
                      >
                        Review Graded Submission <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : a.is_eligible ? (
                      <Link
                        href={`/student/assessments/${a.id}`}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        Start Assessment <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href="/student/videos"
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F7F7FA] text-[#686A7D] text-xs font-medium border border-[#E4E3EC] hover:bg-white transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" /> Watch Video to Unlock
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
