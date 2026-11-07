"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentNav from "@/components/StudentNav";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  FileText,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Info,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

interface DocumentItem {
  id: string;
  filename: string;
  file_type?: string;
  subject: string;
  topic: string;
  uploaded_at: string;
  page_count: number;
  chunk_count: number;
  char_count: number;
  status: string;
  error_message?: string | null;
  is_scanned: boolean;
  topics?: string[];
  questions?: {
    extracted?: string[];
    suggested?: string[];
  };
}

export default function StudentDocumentsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("Computer Science");
  const [topic, setTopic] = useState("Information Retrieval");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<DocumentItem[]>("/api/documents");
      setDocuments(data);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load documents", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !profile) return;
    fetchDocuments();
  }, [authLoading, profile]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({ text: "Please select a PDF, DOCX, or TXT file to upload.", type: "error" });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);
    formData.append("topic", topic);

    try {
      const newDoc = await apiRequest<DocumentItem>("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      setMessage({
        text: `Document '${newDoc.filename}' processed successfully! Status: ${newDoc.status || "READY"}. Created ${newDoc.chunk_count} vector chunks in Qdrant.`,
        type: "success",
      });
      setFile(null);
      // Reset file input element
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      fetchDocuments();
    } catch (err: any) {
      setMessage({ text: err?.message || "Document processing failed.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (docId: string, filename: string) => {
    try {
      setRetryingId(docId);
      setMessage(null);
      const updatedDoc = await apiRequest<DocumentItem>(`/api/documents/${docId}/retry`, {
        method: "POST",
      });
      setMessage({
        text: `Document '${updatedDoc.filename}' successfully reprocessed! ${updatedDoc.chunk_count} vectors indexed in Qdrant.`,
        type: "success",
      });
      fetchDocuments();
    } catch (err: any) {
      setMessage({ text: err?.message || `Failed to reprocess '${filename}'.`, type: "error" });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete '${filename}'? All associated vector embeddings in Qdrant will be removed.`)) {
      return;
    }

    try {
      await apiRequest(`/api/documents/${docId}`, { method: "DELETE" });
      setDocuments(documents.filter((d) => d.id !== docId));
      setMessage({ text: `Deleted '${filename}'.`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to delete document.", type: "error" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <StudentNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-[#0D1445]" />
              Course Study Materials & Document Indexing
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D]">
              Upload your lecture notes, textbook chapters, or syllabus documents. Files are parsed into overlapping chunks, vectorized, and isolated in Qdrant for Model 1 grounded question answering.
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center justify-between font-medium ${
                message.type === "success"
                  ? "bg-[#EEF6F3] border border-[#C2D9D1] text-[#1E4E3F]"
                  : "bg-[#FBF1F2] border border-[#AD525E] text-[#7A2633]"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="underline ml-4 cursor-pointer font-bold">
                Dismiss
              </button>
            </div>
          )}

          {/* Upload Area */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
            <h2 className="text-sm font-bold text-[#0D1445] mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#0D1445]" /> Upload New Study Document
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="doc-subject" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Subject / Course
                  </label>
                  <input
                    id="doc-subject"
                    name="subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>
                <div>
                  <label htmlFor="doc-topic" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Topic / Module
                  </label>
                  <input
                    id="doc-topic"
                    name="topic"
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Vector Search & RAG"
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="file-upload" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                  Select Document (PDF, DOCX, or TXT — Max 15MB)
                </label>
                <input
                  id="file-upload"
                  name="file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#686A7D] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0D1445] file:text-white hover:file:bg-[#162060] file:cursor-pointer cursor-pointer border border-[#E4E3EC] rounded-xl bg-[#F7F7FA] p-2"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-[#686A7D] flex items-center gap-1 font-medium">
                  <Info className="w-3.5 h-3.5 text-[#58587A]" /> Scanned image-only PDFs require a digital text layer
                </span>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing & Indexing Vectors...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload & Vectorize
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-[#0D1445] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0D1445]" />
                Indexed Study Documents ({documents.length})
              </h2>
              {documents.length > 0 && (
                <Link
                  href="/student/important-questions"
                  className="text-xs font-bold text-[#0D1445] hover:underline inline-flex items-center gap-1"
                >
                  Ask Questions on These Notes <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="py-12 flex justify-center text-[#686A7D]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0D1445]" />
              </div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center text-[#686A7D] text-xs">
                <FileSpreadsheet className="w-8 h-8 text-[#BFBFDB] mx-auto mb-2" />
                No documents uploaded yet. Upload a syllabus or lecture PDF above to enable Model 1 question answering.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F7FA] text-[#686A7D] uppercase tracking-wider font-bold border-b border-[#E4E3EC]">
                    <tr>
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-4">Subject & Topic</th>
                      <th className="py-3 px-4">Length / Pages</th>
                      <th className="py-3 px-4">Qdrant Vectors</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E3EC]">
                    {documents.map((doc) => {
                      const isReady = ["READY", "PROCESSED"].includes((doc.status || "").toUpperCase());
                      const isFailed = (doc.status || "").toUpperCase() === "FAILED";
                      const isProcessing = ["UPLOADING", "EXTRACTING", "CHUNKING", "EMBEDDING", "INDEXING"].includes((doc.status || "").toUpperCase());
                      const isDocx = (doc.filename || "").toLowerCase().endsWith(".docx");

                      return (
                        <tr key={doc.id} className="hover:bg-[#F7F7FA] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#17172B]">{doc.filename}</div>
                            <div className="text-[11px] text-[#686A7D]">
                              Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "Recently"}
                            </div>
                            {doc.is_scanned && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#7A2633] bg-[#FBF1F2] px-2 py-0.5 rounded-full border border-[#AD525E]">
                                <AlertTriangle className="w-3 h-3" /> Scanned PDF Warning
                              </span>
                            )}
                            {doc.error_message && isFailed && (
                              <div className="text-[10px] text-[#7A2633] mt-1 max-w-xs truncate" title={doc.error_message}>
                                {doc.error_message}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-[#17172B]">{doc.subject}</span>
                            <span className="block text-[11px] text-[#686A7D]">{doc.topic}</span>
                          </td>
                          <td className="py-3.5 px-4 text-[#686A7D]">
                            {isDocx ? (
                              <span>
                                {doc.char_count ? `${doc.char_count.toLocaleString()} chars` : "N/A (DOCX)"}
                              </span>
                            ) : (
                              <span>{doc.page_count} {doc.page_count === 1 ? "page" : "pages"}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${
                                doc.chunk_count > 0 ? "text-[#0D1445]" : "text-[#7A2633]"
                              }`}
                            >
                              {doc.chunk_count} vectors
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {isReady && doc.chunk_count > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]">
                                <CheckCircle2 className="w-3 h-3" /> Indexed
                              </span>
                            ) : isReady && doc.chunk_count === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F7] text-[#58587A] border border-[#E0D0D9]">
                                <AlertTriangle className="w-3 h-3" /> 0 Vectors
                              </span>
                            ) : isProcessing ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB]">
                                <Loader2 className="w-3 h-3 animate-spin" /> {doc.status}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF1F2] text-[#7A2633] border border-[#AD525E]">
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            {(isFailed || doc.chunk_count === 0) && (
                              <button
                                onClick={() => handleRetry(doc.id, doc.filename)}
                                disabled={retryingId === doc.id}
                                className="p-1.5 text-[#686A7D] hover:text-[#0D1445] hover:bg-[#F2F2F9] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Retry vector indexing"
                              >
                                {retryingId === doc.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#0D1445]" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(doc.id, doc.filename)}
                              className="p-1.5 text-[#686A7D] hover:text-[#7A2633] hover:bg-[#FBF1F2] rounded-lg transition-colors cursor-pointer inline-flex items-center"
                              title="Delete document and vector chunks"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
