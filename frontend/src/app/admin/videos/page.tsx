"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminNav from "@/components/AdminNav";
import { apiRequest } from "@/lib/api";
import {
  Folder,
  FolderPlus,
  Video,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Play,
  Layers,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  AlertCircle,
  Sparkles,
  Search,
} from "lucide-react";

interface CourseFolder {
  id: string;
  folder_id: string;
  folder_name: string;
  description: string;
  subject: string;
  published: boolean;
  video_count: number;
  created_at: string;
}

interface VideoLesson {
  id: string;
  video_id?: string;
  folder_id?: string;
  folder_name?: string;
  title: string;
  description: string;
  learning_objectives?: string;
  youtube_url: string;
  youtube_id: string;
  subject: string;
  topic: string;
  completion_threshold_percentage: number;
  is_published: boolean;
  created_at: string;
}

export default function AdminVideosPage() {
  // Folders and Videos state
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Modals & form state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<CourseFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [folderSubject, setFolderSubject] = useState("Computer Science");
  const [folderPublished, setFolderPublished] = useState(true);

  // Video form modal
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoLesson | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [videoObjectives, setVideoObjectives] = useState("");
  const [videoSubject, setVideoSubject] = useState("Computer Science");
  const [videoTopic, setVideoTopic] = useState("Core Concepts");
  const [videoThreshold, setVideoThreshold] = useState<number>(80);
  const [videoPublished, setVideoPublished] = useState(true);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [foldersData, videosData] = await Promise.all([
        apiRequest<CourseFolder[]>("/api/folders"),
        apiRequest<VideoLesson[]>("/api/videos"),
      ]);
      setFolders(foldersData);
      setVideos(videosData);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load curriculum data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Active folder object
  const activeFolder = folders.find((f) => (f.id || f.folder_id) === activeFolderId);
  const folderVideos = videos.filter((v) => v.folder_id === activeFolderId);

  // Filtered folders by search query
  const filteredFolders = folders.filter((f) =>
    f.folder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats calculation
  const totalFolders = folders.length;
  const totalVideos = videos.length;
  const publishedFolders = folders.filter((f) => f.published).length;
  const publishedVideos = videos.filter((v) => v.is_published).length;

  // Folder CRUD handlers
  const openNewFolderModal = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderDesc("");
    setFolderSubject("Computer Science");
    setFolderPublished(true);
    setShowFolderModal(true);
  };

  const openEditFolderModal = (f: CourseFolder) => {
    setEditingFolder(f);
    setFolderName(f.folder_name);
    setFolderDesc(f.description);
    setFolderSubject(f.subject);
    setFolderPublished(f.published);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      if (editingFolder) {
        await apiRequest(`/api/folders/${editingFolder.id || editingFolder.folder_id}`, {
          method: "PUT",
          body: JSON.stringify({
            folder_name: folderName.trim(),
            description: folderDesc.trim(),
            subject: folderSubject.trim(),
            published: folderPublished,
          }),
        });
        setMessage({ text: `Folder '${folderName}' updated successfully!`, type: "success" });
      } else {
        await apiRequest("/api/folders", {
          method: "POST",
          body: JSON.stringify({
            folder_name: folderName.trim(),
            description: folderDesc.trim(),
            subject: folderSubject.trim(),
            published: folderPublished,
          }),
        });
        setMessage({ text: `Folder '${folderName}' created successfully!`, type: "success" });
      }

      setShowFolderModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to save course folder", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folder: CourseFolder) => {
    const fid = folder.id || folder.folder_id;
    if (
      !confirm(
        `Are you sure you want to delete folder '${folder.folder_name}' and all videos inside it? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/api/folders/${fid}`, { method: "DELETE" });
      setMessage({ text: `Folder '${folder.folder_name}' deleted.`, type: "success" });
      if (activeFolderId === fid) {
        setActiveFolderId(null);
      }
      loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to delete folder", type: "error" });
    }
  };

  // Video CRUD handlers
  const openNewVideoModal = () => {
    setEditingVideo(null);
    setVideoTitle("");
    setVideoUrl("");
    setVideoDesc("");
    setVideoObjectives("");
    setVideoSubject(activeFolder ? activeFolder.subject : "Computer Science");
    setVideoTopic("Core Concepts");
    setVideoThreshold(80);
    setVideoPublished(true);
    setShowVideoModal(true);
  };

  const openEditVideoModal = (v: VideoLesson) => {
    setEditingVideo(v);
    setVideoTitle(v.title);
    setVideoUrl(v.youtube_url);
    setVideoDesc(v.description);
    setVideoObjectives(v.learning_objectives || "");
    setVideoSubject(v.subject);
    setVideoTopic(v.topic);
    setVideoThreshold(v.completion_threshold_percentage || 80);
    setVideoPublished(v.is_published);
    setShowVideoModal(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrl.trim() || !activeFolderId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      if (editingVideo) {
        await apiRequest(`/api/videos/${editingVideo.id}`, {
          method: "PUT",
          body: JSON.stringify({
            folder_id: activeFolderId,
            title: videoTitle.trim(),
            youtube_url: videoUrl.trim(),
            description: videoDesc.trim(),
            learning_objectives: videoObjectives.trim(),
            subject: videoSubject.trim(),
            topic: videoTopic.trim(),
            completion_threshold_percentage: Number(videoThreshold),
            is_published: videoPublished,
          }),
        });
        setMessage({ text: `Video lesson '${videoTitle}' updated successfully!`, type: "success" });
      } else {
        await apiRequest("/api/videos", {
          method: "POST",
          body: JSON.stringify({
            folder_id: activeFolderId,
            title: videoTitle.trim(),
            youtube_url: videoUrl.trim(),
            description: videoDesc.trim(),
            learning_objectives: videoObjectives.trim(),
            subject: videoSubject.trim(),
            topic: videoTopic.trim(),
            completion_threshold_percentage: Number(videoThreshold),
            is_published: videoPublished,
          }),
        });
        setMessage({ text: `Video lesson '${videoTitle}' created successfully!`, type: "success" });
      }

      setShowVideoModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to save video lesson", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVideo = async (video: VideoLesson) => {
    if (!confirm(`Are you sure you want to delete video '${video.title}'?`)) return;

    try {
      await apiRequest(`/api/videos/${video.id}`, { method: "DELETE" });
      setMessage({ text: `Deleted video '${video.title}'.`, type: "success" });
      loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to delete video lesson", type: "error" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <AdminNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs font-bold mb-2">
                <Layers className="w-3.5 h-3.5 text-[#58587A]" /> Model 2 Curriculum Architecture
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
                <Folder className="w-6 h-6 text-[#0D1445]" />
                Folder-Based Course Curriculum & Videos
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#686A7D]">
                Organize curriculum videos into course folders. Define learning objectives for AI-generated objective assessments.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {!activeFolderId ? (
                <button
                  type="button"
                  onClick={openNewFolderModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-[#BFBFDB]" /> New Course Folder
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openNewVideoModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#BFBFDB]" /> Add Video to Folder
                </button>
              )}
            </div>
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

          {/* Curriculum Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E4E3EC] shadow-xs">
              <span className="text-xs text-[#686A7D] font-medium block">Course Folders</span>
              <span className="text-2xl font-bold text-[#0D1445] mt-1 block">{totalFolders}</span>
              <span className="text-[11px] text-[#1E4E3F] mt-1 font-semibold">{publishedFolders} Published</span>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-[#E4E3EC] shadow-xs">
              <span className="text-xs text-[#686A7D] font-medium block">Curriculum Videos</span>
              <span className="text-2xl font-bold text-[#0D1445] mt-1 block">{totalVideos}</span>
              <span className="text-[11px] text-[#1E4E3F] mt-1 font-semibold">{publishedVideos} Published</span>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-[#E4E3EC] shadow-xs">
              <span className="text-xs text-[#686A7D] font-medium block">Gate Enforcement</span>
              <span className="text-2xl font-bold text-[#0D1445] mt-1 block">Anti-Tamper</span>
              <span className="text-[11px] text-[#686A7D] mt-1 font-medium">Monotonic watch clamp</span>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-[#E4E3EC] shadow-xs">
              <span className="text-xs text-[#686A7D] font-medium block">AI Assessment Gate</span>
              <span className="text-2xl font-bold text-[#0D1445] mt-1 block">Active</span>
              <span className="text-[11px] text-[#58587A] mt-1 font-semibold">Gemini 10 MCQs</span>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex justify-center text-[#686A7D]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
            </div>
          ) : !activeFolderId ? (
            /* VIEW 1: All Course Folders Grid */
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#686A7D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="folder-search"
                    name="searchQuery"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search folders by name or subject..."
                    aria-label="Search folders by name or subject"
                    className="w-full bg-white border border-[#E4E3EC] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] transition-colors shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={openNewFolderModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#BFBFDB]" /> Create New Folder
                </button>
              </div>

              {filteredFolders.length === 0 ? (
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-12 text-center text-[#686A7D] text-xs shadow-xs">
                  <Folder className="w-12 h-12 text-[#BFBFDB] mx-auto mb-3" />
                  <p className="font-bold text-[#17172B] text-sm">No Course Folders Found</p>
                  <p className="mt-1 text-xs text-[#686A7D]">
                    {searchQuery ? "No folders match your search." : "Create your first course folder to start organizing video lessons."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFolders.map((folder) => {
                    const fid = folder.id || folder.folder_id;
                    return (
                      <div
                        key={fid}
                        className="bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-6 transition-all duration-200 hover:shadow-md flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB]">
                              {folder.subject}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {folder.published ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E4E3F] bg-[#EEF6F3] px-2 py-0.5 rounded-full border border-[#C2D9D1]">
                                  <Eye className="w-3 h-3" /> Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#58587A] bg-[#FAF5F7] px-2 py-0.5 rounded-full border border-[#E0D0D9]">
                                  <EyeOff className="w-3 h-3" /> Draft
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-3 pt-1">
                            <div className="w-10 h-10 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-center text-[#0D1445] shrink-0 font-bold">
                              <Folder className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-[#0D1445] text-base truncate">
                                {folder.folder_name}
                              </h3>
                              <p className="text-xs text-[#686A7D] line-clamp-2 mt-1 leading-relaxed">
                                {folder.description || "Course curriculum folder."}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#E4E3EC] flex items-center justify-between text-xs">
                          <span className="text-[#686A7D] font-medium flex items-center gap-1">
                            <Video className="w-3.5 h-3.5 text-[#58587A]" />
                            <strong className="text-[#0D1445]">{folder.video_count}</strong> {folder.video_count === 1 ? "Video" : "Videos"}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditFolderModal(folder)}
                              className="p-1.5 text-[#686A7D] hover:text-[#0D1445] hover:bg-[#F2F2F9] rounded-lg transition-colors cursor-pointer"
                              title="Edit Folder"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFolder(folder)}
                              className="p-1.5 text-[#686A7D] hover:text-[#7A2633] hover:bg-[#FBF1F2] rounded-lg transition-colors cursor-pointer"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveFolderId(fid)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Open <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: Inside Active Folder (Videos List & Management) */
            <div className="space-y-6">
              {/* Folder Breadcrumb Banner */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#686A7D]">
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(null)}
                      className="hover:underline flex items-center gap-1 font-bold text-[#0D1445] cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> All Course Folders
                    </button>
                    <span>/</span>
                    <span className="text-[#17172B] font-semibold">{activeFolder?.folder_name}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0D1445] flex items-center gap-2">
                    <Folder className="w-5 h-5 text-[#0D1445]" />
                    {activeFolder?.folder_name}
                  </h2>
                  <p className="text-xs text-[#686A7D]">{activeFolder?.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={openNewVideoModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#BFBFDB]" /> Add Video Lesson
                  </button>
                </div>
              </div>

              {/* Videos Table */}
              <div className="bg-white border border-[#E4E3EC] rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-[#E4E3EC] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0D1445] flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#0D1445]" />
                    Lesson Videos Inside This Folder ({folderVideos.length})
                  </h3>
                </div>

                {folderVideos.length === 0 ? (
                  <div className="p-12 text-center text-[#686A7D] text-xs">
                    <Video className="w-10 h-10 text-[#BFBFDB] mx-auto mb-2" />
                    No video lessons assigned to this folder yet. Click &lsquo;Add Video Lesson&rsquo; above to upload one.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F7FA] text-[#686A7D] uppercase tracking-wider font-bold border-b border-[#E4E3EC]">
                        <tr>
                          <th className="py-3 px-4">Lesson Details</th>
                          <th className="py-3 px-4">Subject & Topic</th>
                          <th className="py-3 px-4">YouTube ID</th>
                          <th className="py-3 px-4">Watch Threshold</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E3EC]">
                        {folderVideos.map((v) => (
                          <tr key={v.id} className="hover:bg-[#F7F7FA] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#17172B]">{v.title}</div>
                              <div className="text-[11px] text-[#686A7D] line-clamp-1 max-w-sm mt-0.5">
                                {v.description || "No description provided."}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-[#17172B]">{v.subject}</span>
                              <span className="block text-[11px] text-[#686A7D]">{v.topic}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#0D1445]">
                              <a
                                href={v.youtube_url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-[#162060] inline-flex items-center gap-1"
                              >
                                {v.youtube_id} <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#0D1445]">
                                {v.completion_threshold_percentage}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {v.is_published ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1]">
                                  <CheckCircle2 className="w-3 h-3" /> Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F7] text-[#58587A] border border-[#E0D0D9]">
                                  Draft
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => openEditVideoModal(v)}
                                className="p-1.5 text-[#686A7D] hover:text-[#0D1445] hover:bg-[#F2F2F9] rounded-lg transition-colors cursor-pointer"
                                title="Edit Video Lesson"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVideo(v)}
                                className="p-1.5 text-[#686A7D] hover:text-[#7A2633] hover:bg-[#FBF1F2] rounded-lg transition-colors cursor-pointer"
                                title="Delete Video Lesson"
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
            </div>
          )}
        </main>

        {/* Modal: Add/Edit Course Folder */}
        {showFolderModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#E4E3EC] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E3EC]">
                <h3 className="font-bold text-[#0D1445] text-base flex items-center gap-2">
                  <Folder className="w-5 h-5 text-[#0D1445]" />
                  {editingFolder ? "Edit Course Folder" : "Create New Course Folder"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="text-xs text-[#686A7D] hover:text-[#17172B] cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveFolder} className="space-y-4">
                <div>
                  <label htmlFor="folder-name-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Folder / Course Name
                  </label>
                  <input
                    id="folder-name-input"
                    name="folderName"
                    type="text"
                    required
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="e.g. Data Analytics & Business Intelligence"
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>

                <div>
                  <label htmlFor="folder-subject-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Subject / Domain
                  </label>
                  <input
                    id="folder-subject-input"
                    name="folderSubject"
                    type="text"
                    required
                    value={folderSubject}
                    onChange={(e) => setFolderSubject(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>

                <div>
                  <label htmlFor="folder-desc-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Course Description
                  </label>
                  <textarea
                    id="folder-desc-input"
                    name="folderDesc"
                    rows={3}
                    value={folderDesc}
                    onChange={(e) => setFolderDesc(e.target.value)}
                    placeholder="Brief description of the curriculum module covered in this folder..."
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="folder-published"
                    checked={folderPublished}
                    onChange={(e) => setFolderPublished(e.target.checked)}
                    className="w-4 h-4 text-[#0D1445] rounded border-[#E4E3EC] cursor-pointer"
                  />
                  <label htmlFor="folder-published" className="text-xs text-[#17172B] font-semibold cursor-pointer">
                    Publish folder immediately to students
                  </label>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E3EC]">
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#F7F7FA] hover:bg-[#EBEBF5] text-[#17172B] text-xs font-bold border border-[#E4E3EC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingFolder ? "Update Folder" : "Create Folder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Video Lesson */}
        {showVideoModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-[#E4E3EC] rounded-2xl max-w-xl w-full p-6 space-y-5 my-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E3EC]">
                <h3 className="font-bold text-[#0D1445] text-base flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#0D1445]" />
                  {editingVideo ? "Edit Video Lesson" : `Add Video to '${activeFolder?.folder_name}'`}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="text-xs text-[#686A7D] hover:text-[#17172B] cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveVideo} className="space-y-4">
                <div>
                  <label htmlFor="video-title-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Lesson Title
                  </label>
                  <input
                    id="video-title-input"
                    name="videoTitle"
                    type="text"
                    required
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g. Power BI Desktop: Complete Visual Dashboards & DAX"
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>

                <div>
                  <label htmlFor="video-url-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    YouTube URL or Video ID
                  </label>
                  <input
                    id="video-url-input"
                    name="videoUrl"
                    type="text"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=TNbvGPwPyQ8"
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="video-topic-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                      Curriculum Topic
                    </label>
                    <input
                      id="video-topic-input"
                      name="videoTopic"
                      type="text"
                      required
                      value={videoTopic}
                      onChange={(e) => setVideoTopic(e.target.value)}
                      placeholder="e.g. Business Intelligence"
                      className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                    />
                  </div>

                  <div>
                    <label htmlFor="video-threshold-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                      Completion Threshold (%)
                    </label>
                    <input
                      id="video-threshold-input"
                      name="videoThreshold"
                      type="number"
                      min="10"
                      max="100"
                      required
                      value={videoThreshold}
                      onChange={(e) => setVideoThreshold(Number(e.target.value))}
                      className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="video-desc-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Lesson Description
                  </label>
                  <textarea
                    id="video-desc-input"
                    name="videoDesc"
                    rows={2}
                    value={videoDesc}
                    onChange={(e) => setVideoDesc(e.target.value)}
                    placeholder="Short description of concepts demonstrated in this video..."
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>

                <div>
                  <label htmlFor="video-objectives-input" className="block text-xs font-semibold text-[#17172B] mb-1.5">
                    Learning Objectives (Used by Gemini for 10-Question Objective Tests)
                  </label>
                  <textarea
                    id="video-objectives-input"
                    name="videoObjectives"
                    rows={3}
                    value={videoObjectives}
                    onChange={(e) => setVideoObjectives(e.target.value)}
                    placeholder="e.g. Master Power Query transformations, DAX calculated columns vs measures, star schema relationships..."
                    className="w-full bg-[#F7F7FA] border border-[#E4E3EC] rounded-xl px-3.5 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#0D1445]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="video-published"
                    checked={videoPublished}
                    onChange={(e) => setVideoPublished(e.target.checked)}
                    className="w-4 h-4 text-[#0D1445] rounded border-[#E4E3EC] cursor-pointer"
                  />
                  <label htmlFor="video-published" className="text-xs text-[#17172B] font-semibold cursor-pointer">
                    Publish lesson to enrolled students
                  </label>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E3EC]">
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#F7F7FA] hover:bg-[#EBEBF5] text-[#17172B] text-xs font-bold border border-[#E4E3EC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingVideo ? "Update Lesson" : "Save Lesson"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
