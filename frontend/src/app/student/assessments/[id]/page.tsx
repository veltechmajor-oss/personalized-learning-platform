"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentNav from "@/components/StudentNav";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Trophy,
} from "lucide-react";

interface StudentQuestion {
  id: string;
  prompt: string;
  question_type: string;
  options: string[];
  marks: number;
}

interface AssessmentView {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  passing_percentage: number;
  total_marks: number;
  question_count: number;
  questions: StudentQuestion[];
  is_eligible: boolean;
  has_attempted: boolean;
  student_score?: number | null;
  passed?: boolean | null;
}

interface GradedFeedback {
  question_id: string;
  prompt: string;
  selected_answer: string;
  is_correct: boolean;
  marks_awarded: number;
  max_marks: number;
  correct_answer?: string;
  explanation?: string;
}

interface SubmitResult {
  attempt_id: string;
  assessment_id: string;
  student_id: string;
  marks_obtained: number;
  total_marks: number;
  score_percentage: number;
  passed: boolean;
  submitted_at: string;
  breakdown: GradedFeedback[];
}

function TakeAssessmentContent() {
  const { profile, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id as string;

  const [assessment, setAssessment] = useState<AssessmentView | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !profile || !assessmentId) return;
    async function loadAssessment() {
      try {
        setLoading(true);
        const data = await apiRequest<AssessmentView>(`/api/assessments/${assessmentId}`);
        setAssessment(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    }
    loadAssessment();
  }, [authLoading, profile, assessmentId]);

  const handleSelectOption = (questionId: string, option: string) => {
    if (result) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;

    const unanswered = assessment.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!confirm(`You have left ${unanswered.length} question(s) unanswered. Are you sure you want to submit?`)) {
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const payloadAnswers = Object.entries(answers).map(([question_id, selected_answer]) => ({
        question_id,
        selected_answer,
      }));

      const res = await apiRequest<SubmitResult>(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: payloadAnswers }),
      });

      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <StudentNav />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Link
            href="/student/assessments"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D1445] hover:underline transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
          </Link>

          {loading ? (
            <div className="py-24 flex justify-center text-[#686A7D]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633] text-xs font-medium">
              {error}
            </div>
          ) : assessment ? (
            <>
              {/* Header Box */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB]">
                    {assessment.subject} • {assessment.topic}
                  </span>
                  <span className="text-xs text-[#686A7D] font-medium">
                    {assessment.question_count} Questions • {assessment.total_marks} Marks
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-[#0D1445]">{assessment.title}</h1>
                <p className="mt-1 text-xs text-[#686A7D]">
                  {assessment.description || "Objective Assessment evaluating lesson concepts."}
                </p>
                <div className="mt-3 text-xs text-[#686A7D] flex items-center gap-4">
                  <span>Passing Score: <strong className="text-[#0D1445]">{assessment.passing_percentage}%</strong></span>
                  <span>•</span>
                  <span>Policy: Single Attempt Only</span>
                </div>
              </div>

              {/* Already Attempted Banner */}
              {assessment.has_attempted && !result && (
                <div className="p-4 rounded-xl bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1E4E3F]" />
                    <span>
                      You have already completed this assessment with a score of <strong>{assessment.student_score}%</strong>.
                    </span>
                  </div>
                  <Link
                    href="/student/progress"
                    className="underline text-[#0D1445] font-bold"
                  >
                    View Academic Progress
                  </Link>
                </div>
              )}

              {/* Result Summary Banner (After Submission) */}
              {result && (
                <div
                  className={`p-6 rounded-2xl border shadow-xs ${
                    result.passed
                      ? "bg-[#EEF6F3] border-[#C2D9D1] text-[#1E4E3F]"
                      : "bg-[#FBF1F2] border-[#AD525E] text-[#7A2633]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-[#E4E3EC] flex items-center justify-center shrink-0">
                        <Trophy className={`w-6 h-6 ${result.passed ? "text-[#1E4E3F]" : "text-[#7A2633]"}`} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">
                          Assessment Graded: {result.score_percentage}%
                        </h2>
                        <p className="text-xs mt-0.5 opacity-90">
                          Awarded {result.marks_obtained} out of {result.total_marks} marks.{" "}
                          Status: <strong>{result.passed ? "Passed" : "Did Not Meet Target"}</strong>.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/student/progress"
                      className="px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold text-center transition-colors cursor-pointer shrink-0"
                    >
                      Update Academic Records <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Questions List Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {assessment.questions.map((q, idx) => {
                  const feedback = result?.breakdown.find((b) => b.question_id === q.id);
                  const selected = answers[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`bg-white border rounded-2xl p-6 shadow-xs space-y-4 transition-colors ${
                        feedback
                          ? feedback.is_correct
                            ? "border-[#C2D9D1]"
                            : "border-[#AD525E]"
                          : "border-[#E4E3EC]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-[#686A7D]">
                        <span className="font-bold text-[#0D1445]">Question {idx + 1}</span>
                        <span>{q.marks} Mark</span>
                      </div>

                      <div className="text-sm font-bold text-[#17172B] leading-relaxed">
                        {q.prompt}
                      </div>

                      {/* Options */}
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = selected === opt;
                          return (
                            <label
                              key={optIdx}
                              onClick={() => handleSelectOption(q.id, opt)}
                              className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                                result ? "cursor-default" : "cursor-pointer"
                              } ${
                                isOptionSelected
                                  ? "bg-[#F2F2F9] border-[#0D1445] text-[#0D1445] font-bold"
                                  : "bg-[#F7F7FA] border-[#E4E3EC] text-[#17172B] hover:border-[#BFBFDB]"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isOptionSelected
                                    ? "border-[#0D1445] bg-[#0D1445]"
                                    : "border-[#BFBFDB]"
                                }`}
                              >
                                {isOptionSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="flex-1">{opt}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Immediate Feedback Breakdown */}
                      {feedback && (
                        <div
                          className={`mt-3 p-4 rounded-xl text-xs space-y-2 ${
                            feedback.is_correct
                              ? "bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]"
                              : "bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {feedback.is_correct ? (
                                <CheckCircle2 className="w-4 h-4 text-[#1E4E3F] shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-[#7A2633] shrink-0" />
                              )}
                              <span className="font-bold">
                                {feedback.is_correct
                                  ? "Correct Answer"
                                  : `Incorrect. Your choice: '${feedback.selected_answer}'`}
                              </span>
                            </div>
                            <span className="font-bold">
                              {feedback.marks_awarded} / {feedback.max_marks} Mark
                            </span>
                          </div>

                          {!feedback.is_correct && feedback.correct_answer && (
                            <div className="text-[11px] pl-6 text-[#17172B]">
                              Correct Key: <strong className="text-[#1E4E3F]">{feedback.correct_answer}</strong>
                            </div>
                          )}

                          {feedback.explanation && (
                            <div className="text-[11px] text-[#17172B] bg-white p-3 rounded-lg border border-[#E4E3EC] leading-relaxed mt-1">
                              <span className="font-bold text-[#0D1445] block mb-0.5">Explanation:</span>
                              {feedback.explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!assessment.has_attempted && !result && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Evaluating & Grading...
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4 text-[#BFBFDB]" />
                          Submit Final Answers
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function TakeAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7FA] flex flex-col items-center justify-center text-[#686A7D]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0D1445] mb-3" />
          <p className="text-xs font-semibold">Loading assessment module...</p>
        </div>
      }
    >
      <TakeAssessmentContent />
    </Suspense>
  );
}
