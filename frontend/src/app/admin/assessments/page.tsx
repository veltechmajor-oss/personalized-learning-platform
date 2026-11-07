"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminNav from "@/components/AdminNav";
import { apiRequest } from "@/lib/api";
import {
  FileCheck,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Loader2,
  Video,
  Layers,
  HelpCircle,
  Plus,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Folder,
  X,
  Award,
  Users,
} from "lucide-react";

interface VideoLesson {
  id: string;
  title: string;
  subject: string;
  topic: string;
  has_assessment?: boolean;
  assessment_id?: string;
}

interface QuestionForm {
  id: string;
  prompt: string;
  question_type: "multiple_choice" | "true_false";
  options: string[];
  correct_answer: string;
  marks: number;
  explanation?: string;
}

interface AssessmentItem {
  id: string;
  title: string;
  video_id: string;
  subject: string;
  topic: string;
  total_marks: number;
  question_count: number;
  passing_percentage: number;
  is_published: boolean;
}

interface AdminAssessmentDetails {
  id: string;
  title: string;
  description: string;
  video_id: string;
  subject: string;
  topic: string;
  passing_percentage: number;
  total_marks: number;
  question_count: number;
  is_published: boolean;
  questions: Array<{
    id: string;
    prompt: string;
    question_type: string;
    options: string[];
    correct_answer: string;
    marks: number;
    explanation: string;
  }>;
  attempts_summary: {
    total_attempts: number;
    average_score: number | null;
  };
}

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // AI Generator State
  const [aiSelectedVideoId, setAiSelectedVideoId] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Inspector Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectDetails, setInspectDetails] = useState<AdminAssessmentDetails | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Manual Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      id: "q1",
      prompt: "What is the primary role of an embedding model in semantic retrieval?",
      question_type: "multiple_choice",
      options: [
        "To project text tokens into high-dimensional vector space",
        "To compile binary files into machine instructions",
        "To execute SQL database joins",
        "To compress network packets",
      ],
      correct_answer: "To project text tokens into high-dimensional vector space",
      marks: 1.0,
      explanation: "Embedding models map unstructured tokens into dense vectors preserving semantic proximity.",
    },
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assData, vidData] = await Promise.all([
        apiRequest<AssessmentItem[]>("/api/assessments"),
        apiRequest<VideoLesson[]>("/api/videos"),
      ]);
      setAssessments(assData);
      setVideos(vidData);
      if (vidData.length > 0) {
        if (!aiSelectedVideoId) setAiSelectedVideoId(vidData[0].id);
        if (!selectedVideoId) setSelectedVideoId(vidData[0].id);
      }
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle AI Assessment Generation via Gemini
  const handleGenerateAiAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSelectedVideoId) {
      setMessage({ text: "Please select a video lesson.", type: "error" });
      return;
    }

    setIsAiGenerating(true);
    setMessage(null);

    try {
      const res = await apiRequest<any>(`/api/videos/${aiSelectedVideoId}/generate-assessment`, {
        method: "POST",
      });

      setMessage({
        text: `Success! ${res.question_count || 10}-question objective assessment generated via Gemini for '${res.title}'.`,
        type: "success",
      });
      loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to generate AI assessment.", type: "error" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Inspect Assessment Questions & Answer Keys
  const handleInspectAssessment = async (id: string) => {
    setInspectModalOpen(true);
    setInspectLoading(true);
    try {
      const data = await apiRequest<AdminAssessmentDetails>(`/api/assessments/${id}/admin`);
      setInspectDetails(data);
    } catch (err: any) {
      alert(err?.message || "Failed to load assessment details.");
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    try {
      await apiRequest(`/api/assessments/${id}/publish`, {
        method: "PUT",
        body: JSON.stringify({ is_published: !currentPublished }),
      });
      setAssessments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_published: !currentPublished } : a))
      );
      setMessage({
        text: `Assessment publication status updated to ${!currentPublished ? "Published" : "Draft"}.`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to update publication status.", type: "error" });
    }
  };

  // Delete Assessment
  const handleDelete = async (id: string, aTitle: string) => {
    if (!confirm(`Are you sure you want to delete assessment '${aTitle}'?`)) {
      return;
    }

    try {
      await apiRequest(`/api/assessments/${id}`, { method: "DELETE" });
      setAssessments(assessments.filter((a) => a.id !== id));
      setMessage({ text: `Deleted assessment '${aTitle}'.`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to delete assessment", type: "error" });
    }
  };

  // Manual Question Management
  const addQuestion = () => {
    const newId = `q_${Date.now()}`;
    setQuestions([
      ...questions,
      {
        id: newId,
        prompt: "",
        question_type: "multiple_choice",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_answer: "Option A",
        marks: 1.0,
        explanation: "",
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert("Assessments must contain at least one question.");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestionPrompt = (idx: number, p: string) => {
    const updated = [...questions];
    updated[idx].prompt = p;
    setQuestions(updated);
  };

  const updateQuestionOption = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...questions];
    const prevOption = updated[qIdx].options[optIdx];
    updated[qIdx].options[optIdx] = val;
    if (updated[qIdx].correct_answer === prevOption) {
      updated[qIdx].correct_answer = val;
    }
    setQuestions(updated);
  };

  const setQuestionCorrectAnswer = (qIdx: number, ans: string) => {
    const updated = [...questions];
    updated[qIdx].correct_answer = ans;
    setQuestions(updated);
  };

  const updateQuestionExplanation = (qIdx: number, exp: string) => {
    const updated = [...questions];
    updated[qIdx].explanation = exp;
    setQuestions(updated);
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoId) {
      setMessage({ text: "Please select an associated video lesson.", type: "error" });
      return;
    }

    const linkedVideo = videos.find((v) => v.id === selectedVideoId);
    if (!linkedVideo) {
      setMessage({ text: "Selected video lesson not found.", type: "error" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await apiRequest("/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          video_id: selectedVideoId,
          subject: linkedVideo.subject,
          topic: linkedVideo.topic,
          passing_percentage: Number(passingPercentage),
          is_published: true,
          questions,
        }),
      });

      setMessage({ text: `Objective Assessment '${title}' created successfully!`, type: "success" });
      setTitle("");
      setDescription("");
      setShowManualForm(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to create assessment", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <AdminNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> Model 2: AI Objective Assessments
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <FileCheck className="w-6 h-6 text-[#0D1445]" />
              Video Lesson Objective Assessments
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D]">
              Generate 10 rigorous multiple-choice questions per video lesson using the Gemini API. Inspect questions, answer keys, explanations, and student attempt performance.
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

          {/* AI Assessment Generator Card */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#0D1445] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#58587A]" />
                  Generate AI Assessment via Gemini
                </h2>
                <p className="text-xs text-[#686A7D] mt-1">
                  Gemini synthesizes 10 objective MCQs with 4 options each, answer keys, and clear educational explanations based on lesson metadata and learning objectives.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualForm(!showManualForm)}
                className="text-xs text-[#0D1445] font-bold hover:underline cursor-pointer"
              >
                {showManualForm ? "Hide Manual Form" : "Or Author Manually"}
              </button>
            </div>

            <form onSubmit={handleGenerateAiAssessment} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <select
                id="ai-select-video"
                name="aiSelectedVideoId"
                aria-label="Choose Video Lesson for AI generation"
                value={aiSelectedVideoId}
                onChange={(e) => setAiSelectedVideoId(e.target.value)}
                className="flex-1 bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-4 py-2.5 text-xs text-[#17172B] font-semibold focus:outline-none focus:border-[#0D1445]"
              >
                <option value="">-- Choose Video Lesson --</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.subject} - {v.topic})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isAiGenerating || !aiSelectedVideoId}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating 10 MCQs...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#BFBFDB]" />
                    Generate 10-Question Test
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Manual Assessment Authoring (Collapsible) */}
          {showManualForm && (
            <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
              <h2 className="text-sm font-bold text-[#0D1445] mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#0D1445]" /> Manually Author Assessment
              </h2>

              <form onSubmit={handleCreateAssessment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="manual-title" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                      Assessment Title
                    </label>
                    <input
                      id="manual-title"
                      name="title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Module 1: Vector Space & Search Evaluation"
                      className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-video-select" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                      Associated Video Lesson
                    </label>
                    <select
                      id="manual-video-select"
                      name="selectedVideoId"
                      required
                      value={selectedVideoId}
                      onChange={(e) => setSelectedVideoId(e.target.value)}
                      className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] font-semibold focus:outline-none focus:border-[#0D1445]"
                    >
                      <option value="">-- Select Prerequisite Lesson --</option>
                      {videos.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title} ({v.topic})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="manual-description" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                      Description & Objectives
                    </label>
                    <input
                      id="manual-description"
                      name="description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Evaluates core concepts of high-dimensional vector search"
                      className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-passing-percentage" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                      Passing Mastery Threshold (%)
                    </label>
                    <input
                      id="manual-passing-percentage"
                      name="passingPercentage"
                      type="number"
                      min="10"
                      max="100"
                      required
                      value={passingPercentage}
                      onChange={(e) => setPassingPercentage(Number(e.target.value))}
                      className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                    />
                  </div>
                </div>

                {/* Questions Section */}
                <div className="pt-4 border-t border-[#E4E3EC] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#0D1445] flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#58587A]" />
                      Questions ({questions.length})
                    </h3>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F7FA] hover:bg-[#EBEBF5] text-[#0D1445] text-xs font-bold border border-[#E4E3EC] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="p-5 rounded-2xl bg-[#F7F7FA] border border-[#E4E3EC] space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs text-[#686A7D]">
                          <span className="font-bold text-[#0D1445]">Question {qIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIdx)}
                            className="text-[#7A2633] hover:underline font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>

                        <div>
                          <label htmlFor={`q_prompt_${q.id}`} className="block text-[11px] font-semibold text-[#17172B] mb-1">
                            Question Prompt
                          </label>
                          <input
                            id={`q_prompt_${q.id}`}
                            name={`q_prompt_${q.id}`}
                            type="text"
                            required
                            value={q.prompt}
                            onChange={(e) => updateQuestionPrompt(qIdx, e.target.value)}
                            placeholder="Enter question prompt..."
                            className="w-full bg-white border border-[#E4E3EC] rounded-xl px-3.5 py-2 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#17172B] mb-1">
                            Options (Select radio for correct answer)
                          </label>
                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  id={`q_opt_radio_${q.id}_${optIdx}`}
                                  type="radio"
                                  name={`correct_${q.id}`}
                                  checked={q.correct_answer === opt}
                                  onChange={() => setQuestionCorrectAnswer(qIdx, opt)}
                                  className="text-[#0D1445] focus:ring-0 cursor-pointer"
                                  title="Mark as correct"
                                />
                                <input
                                  id={`q_opt_val_${q.id}_${optIdx}`}
                                  name={`q_opt_val_${q.id}_${optIdx}`}
                                  type="text"
                                  required
                                  value={opt}
                                  onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                                  className="flex-1 bg-white border border-[#E4E3EC] rounded-xl px-3 py-1.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label htmlFor={`q_exp_${q.id}`} className="block text-[11px] font-semibold text-[#17172B] mb-1">
                            Explanation
                          </label>
                          <input
                            id={`q_exp_${q.id}`}
                            name={`q_exp_${q.id}`}
                            type="text"
                            value={q.explanation || ""}
                            onChange={(e) => updateQuestionExplanation(qIdx, e.target.value)}
                            placeholder="Why is this answer correct?"
                            className="w-full bg-white border border-[#E4E3EC] rounded-xl px-3 py-1.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Assessment...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4 text-[#BFBFDB]" />
                        Save Assessment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Existing Assessments List */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
            <h2 className="text-sm font-bold text-[#0D1445] mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0D1445]" />
                Curriculum Assessments ({assessments.length})
              </span>
              <button
                type="button"
                onClick={loadData}
                className="text-xs font-bold text-[#0D1445] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </h2>

            {loading ? (
              <div className="py-12 flex justify-center text-[#686A7D]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0D1445]" />
              </div>
            ) : assessments.length === 0 ? (
              <div className="py-12 text-center text-[#686A7D] text-xs">
                No assessments found. Use the Gemini AI Generator above to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F7FA] text-[#686A7D] uppercase tracking-wider font-bold border-b border-[#E4E3EC]">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Subject & Topic</th>
                      <th className="py-3 px-4">Questions</th>
                      <th className="py-3 px-4">Total Marks</th>
                      <th className="py-3 px-4">Passing Rate</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E3EC]">
                    {assessments.map((a) => (
                      <tr key={a.id} className="hover:bg-[#F7F7FA] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#17172B]">{a.title}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-[#17172B]">{a.subject}</span>
                          <span className="block text-[11px] text-[#686A7D]">{a.topic}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#17172B]">{a.question_count} MCQs</td>
                        <td className="py-3.5 px-4 font-bold text-[#0D1445]">{a.total_marks}</td>
                        <td className="py-3.5 px-4 font-bold text-[#1E4E3F]">
                          {a.passing_percentage}%
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(a.id, a.is_published)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border transition-colors ${
                              a.is_published
                                ? "bg-[#EEF6F3] text-[#1E4E3F] border-[#C2D9D1] hover:bg-[#C2D9D1]/30"
                                : "bg-[#FAF5F7] text-[#58587A] border-[#E0D0D9] hover:bg-[#E0D0D9]/40"
                            }`}
                            title="Click to toggle publish"
                          >
                            {a.is_published ? "Published" : "Draft"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleInspectAssessment(a.id)}
                            className="p-1.5 text-[#0D1445] hover:bg-[#F2F2F9] rounded-lg transition-colors cursor-pointer"
                            title="Inspect Questions & Answer Keys"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(a.id, a.title)}
                            className="p-1.5 text-[#7A2633] hover:bg-[#FBF1F2] rounded-lg transition-colors cursor-pointer"
                            title="Delete Assessment"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Inspector Modal */}
        {inspectModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-[#E4E3EC] rounded-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E3EC]">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#0D1445]" />
                  <h3 className="font-bold text-[#0D1445] text-base">Assessment Details & Answer Keys</h3>
                </div>
                <button
                  onClick={() => setInspectModalOpen(false)}
                  className="p-1 text-[#686A7D] hover:text-[#17172B] rounded-lg cursor-pointer font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inspectLoading ? (
                <div className="py-16 flex justify-center text-[#686A7D]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
                </div>
              ) : inspectDetails ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-[#F7F7FA] p-4 rounded-xl border border-[#E4E3EC] flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-[#0D1445] text-sm">{inspectDetails.title}</h4>
                      <p className="text-xs text-[#686A7D] mt-0.5">
                        {inspectDetails.subject} • {inspectDetails.topic}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-[#686A7D]">
                        Total Questions: <strong className="text-[#0D1445]">{inspectDetails.question_count}</strong>
                      </span>
                      <span className="text-[#686A7D]">
                        Student Attempts: <strong className="text-[#1E4E3F]">{inspectDetails.attempts_summary?.total_attempts || 0}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {inspectDetails.questions?.map((q, idx) => (
                      <div key={q.id || idx} className="bg-[#F7F7FA] p-4 rounded-xl border border-[#E4E3EC] space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#0D1445]">Question {idx + 1} ({q.marks} Mark)</span>
                          <span className="text-[10px] uppercase font-bold text-[#58587A]">{q.question_type}</span>
                        </div>
                        <p className="text-xs text-[#17172B] font-semibold">{q.prompt}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options?.map((opt, oIdx) => {
                            const isCorrect = opt === q.correct_answer;
                            return (
                              <div
                                key={oIdx}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-[#EEF6F3] border-[#C2D9D1] text-[#1E4E3F] font-bold"
                                    : "bg-white border-[#E4E3EC] text-[#17172B]"
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F] shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="text-[11px] text-[#17172B] bg-white p-2.5 rounded-lg border border-[#E4E3EC] leading-relaxed">
                            <span className="font-bold text-[#0D1445] block">Explanation:</span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
