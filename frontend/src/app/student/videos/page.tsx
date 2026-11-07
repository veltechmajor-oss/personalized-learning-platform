"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentNav from "@/components/StudentNav";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  Video,
  Play,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  BookOpen,
  Folder,
  FolderOpen,
  Layers,
  FileCheck,
  Search,
  Check,
  RefreshCw,
  Clock,
} from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface CourseFolder {
  id: string;
  folder_name: string;
  description: string;
  subject: string;
  is_published: boolean;
  video_count: number;
}

interface VideoLesson {
  id: string;
  folder_id?: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_id: string;
  subject: string;
  topic: string;
  completion_threshold_percentage: number;
  is_published: boolean;
  student_progress_percentage: number;
  is_completed: boolean;
  last_position_seconds?: number;
  has_assessment: boolean;
  assessment_id?: string;
}

export default function StudentVideosPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation State
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<CourseFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFolders, setLoadingFolders] = useState(true);

  // Video State inside Selected Folder
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [progressUpdating, setProgressUpdating] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);

  // YouTube IFrame API State
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Fetch Published Course Folders
  const fetchFolders = async () => {
    try {
      setLoadingFolders(true);
      const data = await apiRequest<CourseFolder[]>("/api/folders");
      setFolders(data.filter((f) => f.is_published));
    } catch {
      // Fallback
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => {
    if (authLoading || !profile) return;
    fetchFolders();
  }, [authLoading, profile]);

  // Fetch Videos for Selected Folder
  const fetchVideosForFolder = async (folder: CourseFolder) => {
    try {
      setLoadingVideos(true);
      setSelectedFolder(folder);
      const data = await apiRequest<VideoLesson[]>(`/api/videos?folder_id=${folder.id}`);
      setVideos(data);
      if (data.length > 0) {
        setSelectedVideo(data[0]);
        setSimulatedProgress(data[0].student_progress_percentage || 0);
      } else {
        setSelectedVideo(null);
        setSimulatedProgress(0);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingVideos(false);
    }
  };

  // Switch video within folder
  const handleSelectVideo = (v: VideoLesson) => {
    setSelectedVideo(v);
    setSimulatedProgress(v.student_progress_percentage || 0);
    setMessage(null);
  };

  // Sync Progress to Backend
  const handleRecordProgress = async (percentage: number) => {
    if (!selectedVideo) return;
    setProgressUpdating(true);
    setMessage(null);

    try {
      const res = await apiRequest<any>(`/api/videos/${selectedVideo.id}/progress`, {
        method: "POST",
        body: JSON.stringify({
          watched_seconds: percentage,
          total_seconds: 100, // Normalized unit
        }),
      });

      setSimulatedProgress(res.watched_percentage);
      if (res.is_completed) {
        setMessage("🎉 Congratulations! You have met the watch threshold and unlocked the objective assessment.");
      }

      // Refresh video in list
      setVideos((prev) =>
        prev.map((v) =>
          v.id === selectedVideo.id
            ? {
                ...v,
                student_progress_percentage: res.watched_percentage,
                is_completed: res.is_completed,
                assessment_id: res.assessment_id || v.assessment_id,
                has_assessment: res.has_assessment || v.has_assessment,
              }
            : v
        )
      );
      setSelectedVideo((prev) =>
        prev
          ? {
              ...prev,
              student_progress_percentage: res.watched_percentage,
              is_completed: res.is_completed,
              assessment_id: res.assessment_id || prev.assessment_id,
              has_assessment: res.has_assessment || prev.has_assessment,
            }
          : null
      );
    } catch (err: any) {
      setMessage(err?.message || "Failed to update progress.");
    } finally {
      setProgressUpdating(false);
    }
  };

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!selectedVideo || !selectedVideo.youtube_id) return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player("youtube-player-element", {
        videoId: selectedVideo.youtube_id,
        playerVars: {
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          start: selectedVideo.last_position_seconds || 0,
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
                  const current = playerRef.current.getCurrentTime();
                  const duration = playerRef.current.getDuration();
                  if (duration > 0) {
                    const pct = Math.min(Math.round((current / duration) * 100), 100);
                    setSimulatedProgress((prev) => Math.max(prev, pct));
                    if (pct >= (selectedVideo.completion_threshold_percentage || 80) && !selectedVideo.is_completed) {
                      handleRecordProgress(pct);
                    }
                  }
                }
              }, 4000);
            } else if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED
            ) {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
              if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
                const current = playerRef.current.getCurrentTime();
                const duration = playerRef.current.getDuration();
                if (duration > 0) {
                  const pct = Math.min(Math.round((current / duration) * 100), 100);
                  handleRecordProgress(pct);
                }
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [selectedVideo?.id, selectedVideo?.youtube_id]);

  // Handle Taking Assessment (Generate or Fetch & Route)
  const handleStartAssessment = async () => {
    if (!selectedVideo) return;
    setIsGeneratingAssessment(true);
    setMessage(null);

    try {
      const res = await apiRequest<any>(`/api/videos/${selectedVideo.id}/generate-assessment`, {
        method: "POST",
      });

      if (res.assessment_id) {
        router.push(`/student/assessments/${res.assessment_id}`);
      } else {
        setMessage("Assessment ready! Redirecting...");
      }
    } catch (err: any) {
      setMessage(err?.message || "Failed to launch assessment. Please try again.");
      setIsGeneratingAssessment(false);
    }
  };

  const filteredFolders = folders.filter((f) => {
    const q = searchQuery.toLowerCase();
    return f.folder_name.toLowerCase().includes(q) || f.subject.toLowerCase().includes(q);
  });

  return (
    <ProtectedRoute allowedRoles={["student", "admin"]}>
      <div className="min-h-screen bg-[#F7F7FA] text-[#17172B] flex flex-col font-sans">
        <StudentNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F9] border border-[#BFBFDB] text-[#0D1445] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#58587A]" /> Model 2: Course Curriculum & Video Lessons
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1445] flex items-center gap-2.5">
              <Video className="w-6 h-6 text-[#0D1445]" />
              Course Folders & Video Learning Modules
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#686A7D] max-w-3xl">
              Explore administrator-curated course folders. Select a subject to access video lessons, track your playback time with anti-tamper gates, and unlock AI objective assessments upon reaching the watch threshold.
            </p>
          </div>

          {/* VIEW 1: Course Folders Grid */}
          {!selectedFolder ? (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#686A7D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-course-search"
                    name="courseSearch"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses by subject or folder name..."
                    aria-label="Search courses by subject or folder name"
                    className="w-full bg-white border border-[#E4E3EC] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#17172B] placeholder-[#686A7D] focus:outline-none focus:border-[#0D1445] transition-colors shadow-2xs"
                  />
                </div>
                <div className="text-xs text-[#686A7D] flex items-center gap-2">
                  <span>Available Courses: <strong className="text-[#0D1445]">{folders.length}</strong></span>
                </div>
              </div>

              {loadingFolders ? (
                <div className="py-24 flex justify-center text-[#686A7D]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-12 text-center text-[#686A7D] text-xs shadow-xs">
                  <Folder className="w-12 h-12 text-[#BFBFDB] mx-auto mb-3" />
                  <p className="font-bold text-[#17172B] text-sm">No Course Folders Available</p>
                  <p className="mt-1 text-xs text-[#686A7D]">
                    {searchQuery ? "No course folders match your search query." : "No course folders have been published yet. Please check back later."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => fetchVideosForFolder(folder)}
                      className="group bg-white border border-[#E4E3EC] hover:border-[#BFBFDB] rounded-2xl p-6 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F2F2F9] text-[#0D1445] border border-[#BFBFDB]">
                            {folder.subject}
                          </span>
                          <span className="text-xs text-[#686A7D] flex items-center gap-1 font-medium">
                            <Video className="w-3.5 h-3.5 text-[#58587A]" />
                            {folder.video_count} {folder.video_count === 1 ? "Lesson" : "Lessons"}
                          </span>
                        </div>

                        <div className="flex items-start gap-3.5 pt-1">
                          <div className="w-10 h-10 rounded-xl bg-[#F7F7FA] border border-[#E4E3EC] flex items-center justify-center text-[#0D1445] shrink-0 group-hover:bg-[#0D1445] group-hover:text-white transition-all">
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0D1445] text-base group-hover:underline">
                              {folder.folder_name}
                            </h3>
                            <p className="text-xs text-[#686A7D] line-clamp-2 mt-1 leading-relaxed">
                              {folder.description || "Structured curriculum video lessons for this subject."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#E4E3EC] flex items-center justify-between text-xs font-bold text-[#0D1445]">
                        <span>Open Course Curriculum</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: Course Video Lessons Playlist & YouTube Player */
            <div className="space-y-6">
              {/* Breadcrumb & Navigation */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedFolder(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E4E3EC] hover:bg-[#F7F7FA] text-xs font-bold text-[#0D1445] transition-colors cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to All Course Folders
                </button>

                <div className="flex items-center gap-2 text-xs text-[#686A7D]">
                  <Folder className="w-4 h-4 text-[#0D1445]" />
                  <span>Curriculum:</span>
                  <span className="font-bold text-[#0D1445]">{selectedFolder.folder_name}</span>
                  <span className="text-[#BFBFDB]">•</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F2F2F9] text-[#0D1445] text-[10px] font-bold border border-[#BFBFDB]">
                    {selectedFolder.subject}
                  </span>
                </div>
              </div>

              {loadingVideos ? (
                <div className="py-24 flex justify-center text-[#686A7D]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0D1445]" />
                </div>
              ) : videos.length === 0 ? (
                <div className="bg-white border border-[#E4E3EC] rounded-2xl p-12 text-center text-[#686A7D] text-xs shadow-xs">
                  <Video className="w-10 h-10 text-[#BFBFDB] mx-auto mb-3" />
                  <p className="font-bold text-[#17172B] text-sm">No Videos Published In This Folder Yet</p>
                  <p className="mt-1 text-xs text-[#686A7D]">
                    The course instructor has not published video lessons for this module yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left 2 Cols: Real YouTube Player & Tracking Panel */}
                  <div className="lg:col-span-2 space-y-6">
                    {selectedVideo && (
                      <div className="bg-white border border-[#E4E3EC] rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                        {/* Dynamic YouTube Player Container */}
                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#E4E3EC] relative shadow-2xs">
                          <div id="youtube-player-element" className="w-full h-full" />
                        </div>

                        {/* Video Metadata Header */}
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                            <div>
                              <h2 className="text-xl font-bold text-[#0D1445]">{selectedVideo.title}</h2>
                              <div className="text-xs text-[#58587A] font-semibold mt-0.5">
                                {selectedVideo.subject} • {selectedVideo.topic}
                              </div>
                            </div>

                            {selectedVideo.is_completed ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EEF6F3] text-[#1E4E3F] border border-[#C2D9D1] shrink-0">
                                <CheckCircle2 className="w-4 h-4" /> Watch Threshold Met
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF5F7] text-[#58587A] border border-[#E0D0D9] shrink-0">
                                Required: {selectedVideo.completion_threshold_percentage}%
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#17172B] leading-relaxed mt-2 bg-[#F7F7FA] p-3.5 rounded-xl border border-[#E4E3EC]">
                            {selectedVideo.description || "Study this video lesson to satisfy the required watch threshold before taking the AI assessment."}
                          </p>
                        </div>

                        {/* Progress Bar & Gate Control */}
                        <div className="pt-4 border-t border-[#E4E3EC] space-y-3">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-[#17172B] font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#0D1445]" />
                              Monitored Playback Progress
                            </span>
                            <span className="text-[#0D1445] font-extrabold text-sm">
                              {simulatedProgress}%
                            </span>
                          </div>

                          <div className="w-full bg-[#F7F7FA] rounded-full h-2.5 overflow-hidden border border-[#E4E3EC]">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                                selectedVideo.is_completed ? "bg-[#1E4E3F]" : "bg-[#0D1445]"
                              }`}
                              style={{ width: `${Math.min(simulatedProgress, 100)}%` }}
                            />
                          </div>

                          {/* Quick Progress Buttons & Assessment Launch Button */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#686A7D] font-medium">Fast Progress:</span>
                              {[50, 80, 100].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => handleRecordProgress(pct)}
                                  disabled={progressUpdating}
                                  className="px-3 py-1 rounded-lg bg-[#F7F7FA] hover:bg-[#EBEBF5] text-[11px] text-[#0D1445] font-bold border border-[#E4E3EC] transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>

                            {/* Assessment Launch Gate */}
                            {selectedVideo.is_completed ? (
                              <button
                                type="button"
                                onClick={handleStartAssessment}
                                disabled={isGeneratingAssessment}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1445] hover:bg-[#162060] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isGeneratingAssessment ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Preparing Assessment...
                                  </>
                                ) : (
                                  <>
                                    <FileCheck className="w-4 h-4 text-[#BFBFDB]" />
                                    Take AI Objective Assessment <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F7FA] text-[#686A7D] text-xs border border-[#E4E3EC] font-medium">
                                <Lock className="w-3.5 h-3.5 text-[#58587A]" />
                                <span>Reach {selectedVideo.completion_threshold_percentage}% to unlock assessment</span>
                              </div>
                            )}
                          </div>

                          {message && (
                            <div className="p-3.5 rounded-xl bg-[#EEF6F3] border border-[#C2D9D1] text-[#1E4E3F] text-xs font-medium flex items-center justify-between">
                              <span>{message}</span>
                              <button
                                type="button"
                                onClick={() => setMessage(null)}
                                className="text-[#1E4E3F] hover:underline text-[11px] font-bold cursor-pointer"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Col: Lessons in this Course Folder */}
                  <div className="space-y-4">
                    <div className="bg-white border border-[#E4E3EC] rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-[#0D1445] flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#0D1445]" />
                          <span>Course Lessons</span>
                        </h3>
                        <span className="text-[11px] text-[#686A7D] font-medium">
                          {videos.length} {videos.length === 1 ? "Video" : "Videos"}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {videos.map((v) => {
                          const isSelected = selectedVideo?.id === v.id;
                          return (
                            <div
                              key={v.id}
                              onClick={() => handleSelectVideo(v)}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                isSelected
                                  ? "bg-[#F2F2F9] border-[#0D1445] shadow-2xs"
                                  : "bg-[#F7F7FA] border-[#E4E3EC] hover:border-[#BFBFDB]"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-white border border-[#E4E3EC] flex items-center justify-center text-[#0D1445] shrink-0 mt-0.5">
                                {v.is_completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#1E4E3F]" />
                                ) : (
                                  <Play className="w-4 h-4 text-[#0D1445]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-[#17172B] truncate">
                                  {v.title}
                                </h4>
                                <div className="text-[11px] text-[#686A7D] mt-0.5">
                                  {v.topic} • Req: {v.completion_threshold_percentage}%
                                </div>
                                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                                  <span className="text-[#686A7D]">
                                    Progress: <strong className="text-[#0D1445]">{v.student_progress_percentage || 0}%</strong>
                                  </span>
                                  {v.is_completed ? (
                                    <span className="text-[#1E4E3F] font-bold flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Unlocked
                                    </span>
                                  ) : (
                                    <span className="text-[#686A7D] flex items-center gap-1">
                                      <Lock className="w-3 h-3 text-[#58587A]" /> Locked
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
