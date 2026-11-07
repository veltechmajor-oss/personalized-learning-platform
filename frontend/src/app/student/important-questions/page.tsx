"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentNav from "@/components/StudentNav";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  HelpCircle,
  Search,
  BookOpen,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Award,
  Check,
  ChevronRight,
  ListOrdered,
  AlertTriangle,
  Compass,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface DocumentItem {
  id: string;
  document_id?: string;
  filename: string;
  subject: string;
  topic: string;
  uploaded_at: string;
  page_count: number;
  chunk_count: number;
  status: string;
  topics?: string[];
  questions?: {
    extracted?: string[];
    suggested?: string[];
  };
}

interface PassageItem {
  source: string;
  text: string;
  score: number;
  chunk_index?: number;
  page_number?: number;
}

interface RagResult {
  query: string;
  response: string;
  evidence_status: string;
  is_sufficient_context: boolean;
  can_use_general_ai?: boolean;
  mode?: string;
  sources: string[];
  passages: PassageItem[];
  recommended_topics: string[];
  timestamp: string;
}

interface QueryHistoryItem {
  id: string;
  title: string;
  subject: string;
  timestamp: string;
}

export default function Model1LearningPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Document selection
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [docsLoading, setDocsLoading] = useState(true);

  // Learning mode tabs: "topics" | "questions" | "custom"
  const [activeTab, setActiveTab] = useState<"topics" | "questions" | "custom">("topics");

  // Query & Explanation
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "Done" state & Generated Assessment
  const [markingDone, setMarkingDone] = useState(false);
  const [assessmentCreatedId, setAssessmentCreatedId] = useState<string | null>(null);
  const [doneSuccess, setDoneSuccess] = useState<boolean>(false);

  // History
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load student documents
  useEffect(() => {
    if (authLoading || !profile) return;
    async function fetchDocuments() {
      try {
        setDocsLoading(true);
        const docs = await apiRequest<DocumentItem[]>("/api/documents");
        setDocuments(docs);
        if (docs.length > 0 && !selectedDocId) {
          setSelectedDocId(docs[0].id || docs[0].document_id || "");
        }
      } catch (err: any) {
        console.error("Failed to load documents", err);
      } finally {
        setDocsLoading(false);
      }
    }
    fetchDocuments();
    fetchHistory();
  }, [authLoading, profile]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await apiRequest<QueryHistoryItem[]>("/api/learning/history");
      setHistory(data);
    } catch {
      // Ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const selectedDoc = documents.find((d) => (d.id || d.document_id) === selectedDocId);

  // Execute RAG query (works for topic clicks, question clicks, or custom input)
  const executeQuery = async (
    queryText: string,
    topicLabel?: string,
    mode: "grounded" | "general_knowledge" = "grounded"
  ) => {
    if (!queryText.trim()) return;

    setLoading(true);
    setError(null);
    setQuery(queryText);

    try {
      const data = await apiRequest<RagResult>("/api/learning/query", {
        method: "POST",
        body: JSON.stringify({
          query: queryText.trim(),
          document_id: selectedDocId || undefined,
          subject: selectedDoc?.subject || "General",
          topic: topicLabel || selectedDoc?.topic || "Study Notes",
          mode: mode,
        }),
      });
      setResult(data);
      fetchHistory();
    } catch (err: any) {
      setError(err?.message || "Failed to generate explanation. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(query, undefined, "grounded");
  };

  // Handle "Done" button action
  const handleMarkDone = async () => {
    if (!selectedDocId) return;

    setMarkingDone(true);
    setError(null);

    try {
      const res = await apiRequest<{ message: string; session_id: string; assessment_id: string }>(
        "/api/learning/done",
        {
          method: "POST",
          body: JSON.stringify({
            document_id: selectedDocId,
            subject: selectedDoc?.subject || "General",
            topic: selectedDoc?.topic || "Course Notes",
            generate_assessment: true,
          }),
        }
      );

      setDoneSuccess(true);
      if (res.assessment_id) {
        setAssessmentCreatedId(res.assessment_id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to mark learning as done.");
    } finally {
      setMarkingDone(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <StudentNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> Model 1: Document-Grounded Learning
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-[#0D1445]" />
              Document RAG Q&A & AI Mastery Tutor
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D] max-w-3xl">
              Select your uploaded syllabus or lecture notes. Explore extracted topics, practice important questions, or query your document directly. Grounded in Qdrant vectors and evaluated by Google Gemini.
            </p>
          </div>

          {/* Document Selector Bar */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label htmlFor="select-learning-doc" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                  Selected Learning Document
                </label>
                {docsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[#686A7D] py-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0D1445]" /> Loading uploaded materials...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-xs text-[#7A2633] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> No documents uploaded yet.{" "}
                    <Link href="/student/documents" className="underline font-bold text-[#0D1445]">
                      Upload a PDF or DOCX file first
                    </Link>
                  </div>
                ) : (
                  <select
                    id="select-learning-doc"
                    name="selectedDocId"
                    value={selectedDocId}
                    onChange={(e) => {
                      setSelectedDocId(e.target.value);
                      setResult(null);
                      setDoneSuccess(false);
                      setAssessmentCreatedId(null);
                    }}
                    className="bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] font-semibold focus:outline-none focus:border-[#0D1445] min-w-[280px] sm:min-w-[360px]"
                  >
                    {documents.map((d) => (
                      <option key={d.id || d.document_id} value={d.id || d.document_id}>
                        {d.filename} ({d.subject} - {d.chunk_count} chunks)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedDoc && (
                <div className="flex items-center gap-3 text-xs text-[#686A7D] flex-wrap">
                  <div className="bg-[#F7F7FA] px-3 py-1.5 rounded-xl border border-[#E4E3EC]">
                    <span>Subject: </span>
                    <span className="text-[#17172B] font-bold">{selectedDoc.subject}</span>
                  </div>
                  <div className="bg-[#F7F7FA] px-3 py-1.5 rounded-xl border border-[#E4E3EC]">
                    <span>Chunks: </span>
                    <span className="text-[#0D1445] font-bold">{selectedDoc.chunk_count} vectors</span>
                  </div>
                  <Link
                    href="/student/documents"
                    className="text-[#0D1445] font-bold hover:underline"
                  >
                    Manage Files
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 3 Learning Options */}
          {selectedDoc && (
            <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2.5 border-b border-[#E4E3EC] pb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("topics")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "topics"
                      ? "bg-[#0D1445] text-white shadow-xs"
                      : "bg-[#F7F7FA] border border-[#E4E3EC] text-[#686A7D] hover:text-[#17172B]"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Option A: Learn All Topics
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("questions")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "questions"
                      ? "bg-[#0D1445] text-white shadow-xs"
                      : "bg-[#F7F7FA] border border-[#E4E3EC] text-[#686A7D] hover:text-[#17172B]"
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" /> Option B: Learn Important Questions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("custom")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "custom"
                      ? "bg-[#0D1445] text-white shadow-xs"
                      : "bg-[#F7F7FA] border border-[#E4E3EC] text-[#686A7D] hover:text-[#17172B]"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> Option C: Ask Your Own Question
                </button>
              </div>

              {/* Tab A Content: Learn All Topics */}
              {activeTab === "topics" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#0D1445]">
                      Extracted Document Topics ({selectedDoc.topics?.length || 0})
                    </h3>
                    <p className="text-xs text-[#686A7D] mt-0.5">
                      Click any topic below to retrieve relevant passages and generate a comprehensive AI explanation.
                    </p>
                  </div>

                  {(!selectedDoc.topics || selectedDoc.topics.length === 0) ? (
                    <div className="p-4 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] text-xs text-[#686A7D] italic">
                      No explicit section headings were identified. You can ask conceptual questions in Option C.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedDoc.topics.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => executeQuery(t, t, "grounded")}
                          disabled={loading}
                          className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] hover:border-[#BFBFDB] hover:bg-white text-left transition-all text-xs font-bold text-[#17172B] flex items-center justify-between group cursor-pointer shadow-2xs"
                        >
                          <span className="truncate pr-2">{t}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#686A7D] group-hover:text-[#0D1445] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab B Content: Learn Important Questions */}
              {activeTab === "questions" && (
                <div className="space-y-6">
                  {/* Extracted Questions */}
                  <div>
                    <h3 className="text-sm font-bold text-[#0D1445] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#1E4E3F]"></span>
                      Questions Extracted Directly from Document ({selectedDoc.questions?.extracted?.length || 0})
                    </h3>
                    <p className="text-xs text-[#686A7D] mt-0.5 mb-3">
                      Explicit questions detected in your uploaded lecture notes. Click any question to study its grounded answer.
                    </p>

                    {(!selectedDoc.questions?.extracted || selectedDoc.questions.extracted.length === 0) ? (
                      <div className="p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] text-xs text-[#686A7D] italic">
                        No explicit question marks found in this document. Review the AI-Suggested questions below.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDoc.questions.extracted.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => executeQuery(q)}
                            disabled={loading}
                            className="w-full p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] hover:border-[#C2D9D1] hover:bg-white text-left transition-all text-xs text-[#17172B] flex items-center justify-between group cursor-pointer"
                          >
                            <span className="font-semibold pr-2 text-[#1E4E3F]">Q: {q}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#686A7D] group-hover:text-[#1E4E3F] shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI-Suggested Important Questions */}
                  <div className="pt-2 border-t border-[#E4E3EC]">
                    <h3 className="text-sm font-bold text-[#0D1445] flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-[#58587A]" />
                      Key Conceptual Questions ({selectedDoc.questions?.suggested?.length || 0})
                    </h3>
                    <p className="text-xs text-[#686A7D] mb-3">
                      High-yield exam questions synthesized from the document&rsquo;s main headings.
                    </p>

                    <div className="space-y-2">
                      {selectedDoc.questions?.suggested?.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => executeQuery(q)}
                          disabled={loading}
                          className="w-full p-3.5 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] hover:border-[#BFBFDB] hover:bg-white text-left transition-all text-xs text-[#17172B] flex items-center justify-between group cursor-pointer"
                        >
                          <span className="font-semibold pr-2 text-[#0D1445]">{q}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#686A7D] group-hover:text-[#0D1445] shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab C Content: Ask Custom Question */}
              {activeTab === "custom" && (
                <form onSubmit={handleCustomSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="custom-rag-query" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                      Your Custom Question (Grounded in &lsquo;{selectedDoc.filename}&rsquo;)
                    </label>
                    <div className="relative">
                      <input
                        id="custom-rag-query"
                        name="query"
                        type="text"
                        required
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g. Compare the trade-offs between synchronous and asynchronous consensus..."
                        className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl pl-3.5 pr-28 py-3 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                      />
                      <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        Explain
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="bg-white border border-[#E4E3EC] rounded-2xl p-8 text-center text-[#686A7D] flex flex-col items-center justify-center space-y-3 shadow-xs">
              <Loader2 className="w-7 h-7 animate-spin text-[#0D1445]" />
              <p className="text-xs font-medium text-[#17172B]">
                Searching Qdrant vector database for &ldquo;{query}&rdquo; and synthesizing grounded explanation...
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633] text-xs font-medium">
              {error}
            </div>
          )}

          {/* Explanation View */}
          {result && !loading && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E4E3EC] gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D1445] bg-[#F2F2F9] border border-[#BFBFDB] px-2.5 py-1 rounded-full">
                      Question / Concept
                    </span>
                    <h2 className="text-base font-bold text-[#0D1445] mt-2">{result.query}</h2>
                  </div>

                  {result.evidence_status === "GENERAL_AI_EXPLANATION" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB] shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> General AI Explanation – Not Verified Against Uploaded Notes
                    </span>
                  ) : result.evidence_status === "GROUNDED IN UPLOADED MATERIALS" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1] shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4E3F]" /> Grounded in Uploaded Materials
                    </span>
                  ) : result.evidence_status === "PARTIALLY GROUNDED" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF5F7] text-[#58587A] border border-[#E0D0D9] shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#58587A]" /> Partially Grounded in Materials
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E] shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-[#7A2633]" /> Insufficient Study Context
                    </span>
                  )}
                </div>

                {/* Optional General Knowledge Prompt Banner */}
                {result.can_use_general_ai && result.evidence_status !== "GENERAL_AI_EXPLANATION" && (
                  <div className="p-4 rounded-xl bg-[#F7F7FA] border border-[#BFBFDB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-5 h-5 text-[#0D1445] shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-[#0D1445]">Need a comprehensive academic explanation?</div>
                        <div className="text-[11px] text-[#686A7D]">
                          The uploaded document lists this topic without full explanatory notes. You can generate a general AI explanation.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => executeQuery(result.query, undefined, "general_knowledge")}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#BFBFDB]" /> Explain Using General Knowledge
                    </button>
                  </div>
                )}

                {/* Return to grounded check if currently in general AI mode */}
                {result.evidence_status === "GENERAL_AI_EXPLANATION" && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] text-xs">
                    <span className="text-[#686A7D] text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0D1445]" /> Viewing comprehensive General AI academic explanation.
                    </span>
                    <button
                      type="button"
                      onClick={() => executeQuery(result.query, undefined, "grounded")}
                      disabled={loading}
                      className="text-[#0D1445] font-bold underline cursor-pointer"
                    >
                      Re-check Uploaded Document Context
                    </button>
                  </div>
                )}

                {/* Explanation text rendered with MarkdownRenderer */}
                <div className="bg-[#F7F7FA] p-6 rounded-2xl border border-[#E4E3EC] shadow-2xs">
                  <MarkdownRenderer content={result.response} />
                </div>

                {/* Follow-up topics */}
                {result.recommended_topics.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-[#0D1445]">Recommended Next Topics:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.recommended_topics.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => executeQuery(`Explain ${t}`, t, "grounded")}
                          className="px-3 py-1 rounded-full bg-white border border-[#E4E3EC] text-[11px] font-semibold text-[#0D1445] hover:border-[#BFBFDB] hover:bg-[#F2F2F9] cursor-pointer transition-colors shadow-2xs"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Section: Done Button */}
                <div className="pt-4 border-t border-[#E4E3EC] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-[#686A7D]">
                    Finished reviewing this concept? Mark your session as completed to generate your AI assessment.
                  </p>
                  <button
                    type="button"
                    onClick={handleMarkDone}
                    disabled={markingDone || doneSuccess}
                    className="px-6 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {markingDone ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Assessment...
                      </>
                    ) : doneSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-[#C2D9D1]" />
                        Learning Session Done!
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 text-[#BFBFDB]" />
                        Done – Take AI Assessment
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Success Banner when Done is clicked */}
              {doneSuccess && (
                <div className="bg-[#EEF6F3] border border-[#C2D9D1] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#C2D9D1] text-[#1E4E3F] flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1E4E3F]">
                        Great job completing your study session!
                      </h4>
                      <p className="text-xs text-[#1E4E3F]/80 mt-0.5">
                        Your learning activity has been saved in Firestore. An objective 5-question AI assessment is ready for you.
                      </p>
                    </div>
                  </div>

                  {assessmentCreatedId && (
                    <Link
                      href={`/student/assessments/${assessmentCreatedId}`}
                      className="px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      Start Assessment Now <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}

              {/* Retrieved Grounding Passages from Qdrant */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
                <h3 className="text-sm font-bold text-[#0D1445] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0D1445]" />
                  Retrieved Grounding Passages from Qdrant Vector DB ({result.passages.length})
                </h3>

                {result.passages.length === 0 ? (
                  <p className="text-xs text-[#686A7D] italic">No direct vector matches retrieved.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.passages.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] text-xs flex flex-col justify-between space-y-2 shadow-2xs"
                      >
                        <div className="text-[#17172B] leading-relaxed italic">
                          &ldquo;{p.text}&rdquo;
                        </div>
                        <div className="pt-2 border-t border-[#E4E3EC] flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#0D1445]">{p.source}</span>
                          <span className="text-[#686A7D]">Cosine Relevance: {p.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent History */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
            <h3 className="text-sm font-bold text-[#0D1445] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#686A7D]" />
              Recent Learning Activities & Explored Questions
            </h3>

            {historyLoading ? (
              <div className="py-6 flex justify-center text-[#686A7D]">
                <Loader2 className="w-5 h-5 animate-spin text-[#0D1445]" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-[#686A7D]">No question history recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#E4E3EC]">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between hover:bg-[#F7F7FA] px-2 rounded-xl transition-colors cursor-pointer"
                    onClick={() => {
                      const cleanQ = item.title.replace(/^Explored:\s*['"]?/, "").replace(/['"]?\.\.\.$/, "");
                      executeQuery(cleanQ);
                    }}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#17172B]">{item.title}</div>
                      <div className="text-[11px] text-[#686A7D]">{item.subject}</div>
                    </div>
                    <div className="text-[11px] text-[#686A7D]">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
