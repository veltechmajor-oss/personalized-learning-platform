from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from app.core.security import get_current_user, require_admin, AuthenticatedUser
from app.core.firebase import firebase_manager

router = APIRouter()


class TopicPerformanceItem(BaseModel):
    topic: str
    subject: str
    assessment_count: int
    average_score: Optional[float] = None
    status: str  # "Mastered", "Needs Revision", "Insufficient assessment data"



class RevisionRecommendation(BaseModel):
    topic: str
    subject: str
    priority: str  # "High", "Medium", "Low"
    reason: str
    action_type: str  # "complete_video", "retake_review", "explore_rag"
    resource_id: Optional[str] = None


class ActivityItem(BaseModel):
    id: str
    type: str
    title: str
    subject: str
    timestamp: str
    score: Optional[float] = None


class AcademicProgressDashboard(BaseModel):
    student_id: str
    student_name: str
    total_assigned_videos: int
    completed_videos: int
    completion_rate_percentage: float
    total_assessments_available: int
    total_assessments_attempted: int
    average_assessment_score: Optional[float] = None
    total_documents_uploaded: int
    total_rag_queries: int
    topic_performance: List[TopicPerformanceItem]
    revision_recommendations: List[RevisionRecommendation]
    recent_activities: List[ActivityItem]


class AcademicVideoRecordItem(BaseModel):
    student_id: str
    student_name: str
    folder_id: Optional[str] = None
    folder_name: str
    video_id: str
    video_title: str
    completion_percentage: float
    is_completed: bool
    has_assessment: bool
    assessment_id: Optional[str] = None
    has_attempted: bool
    marks_obtained: Optional[float] = None
    total_marks: Optional[float] = None
    assessment_percentage: Optional[float] = None
    passed: Optional[bool] = None
    last_activity: str


@router.get("/me", response_model=AcademicProgressDashboard)
async def get_my_academic_progress(current_user: AuthenticatedUser = Depends(get_current_user)):
    return calculate_student_academic_progress(current_user.uid, current_user.name)


@router.get("/student/{student_id}", response_model=AcademicProgressDashboard)
async def get_student_academic_progress_by_admin(
    student_id: str,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    user_doc = firebase_manager.get_document("users", student_id)
    name = user_doc.get("name", "Student") if user_doc else "Student"
    return calculate_student_academic_progress(student_id, name)


@router.get("/records", response_model=List[AcademicVideoRecordItem])
async def list_academic_video_records(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Detailed integrated academic records for Model 2 video learning & assessments.
    Admins see all records; students see only their own.
    """
    filters = None if current_user.role == "admin" else {"student_id": current_user.uid}
    prog_records = firebase_manager.list_documents("video_progress", filters=filters)

    # Reference maps
    users_map = {u.get("id"): u.get("name", "Student") for u in firebase_manager.list_documents("users")}
    videos_map = {v.get("id"): v for v in firebase_manager.list_documents("videos")}
    folders_map = {f.get("id"): f.get("folder_name", "General Curriculum") for f in firebase_manager.list_documents("course_folders")}
    assessments_list = firebase_manager.list_documents("assessments")
    video_assessments = {a.get("video_id"): a for a in assessments_list if a.get("video_id")}
    attempts_list = firebase_manager.list_documents("attempts")
    attempts_map = {f"{att.get('student_id')}_{att.get('assessment_id')}": att for att in attempts_list}

    results = []
    for p in prog_records:
        sid = p.get("student_id", "")
        vid = p.get("video_id", "")
        v = videos_map.get(vid, {})
        fid = p.get("folder_id") or v.get("folder_id")
        fname = folders_map.get(fid, "General Curriculum")
        vtitle = v.get("title") or "Video Lesson"
        sname = users_map.get(sid) or p.get("student_name") or ("You" if sid == current_user.uid else "Student")

        comp_pct = float(p.get("completion_percentage") or p.get("watched_percentage") or 0.0)
        is_done = bool(p.get("is_completed") or p.get("completed") or comp_pct >= float(v.get("completion_threshold_percentage", 80.0)))

        ass = video_assessments.get(vid)
        aid = ass.get("id") if ass else None
        att = attempts_map.get(f"{sid}_{aid}") if aid else None

        results.append(AcademicVideoRecordItem(
            student_id=sid,
            student_name=sname,
            folder_id=fid,
            folder_name=fname,
            video_id=vid,
            video_title=vtitle,
            completion_percentage=comp_pct,
            is_completed=is_done,
            has_assessment=bool(aid),
            assessment_id=aid,
            has_attempted=bool(att),
            marks_obtained=att.get("marks_obtained") if att else None,
            total_marks=att.get("total_marks") if att else None,
            assessment_percentage=att.get("score_percentage") if att else None,
            passed=att.get("passed") if att else None,
            last_activity=p.get("last_watched_at") or p.get("updated_at") or ""
        ))

    results.sort(key=lambda x: x.last_activity, reverse=True)
    return results


def calculate_student_academic_progress(student_id: str, student_name: str) -> AcademicProgressDashboard:
    """
    Compute real statistics from Firestore without fabricated values.
    """
    # 1. Video metrics
    videos = firebase_manager.list_documents("videos", filters={"is_published": True})
    progress_records = firebase_manager.list_documents("video_progress", filters={"student_id": student_id})
    completed_video_ids = {p.get("video_id") for p in progress_records if p.get("is_completed", False)}
    total_videos = len(videos)
    completed_videos_count = len(completed_video_ids)
    completion_rate = round((completed_videos_count / total_videos * 100.0) if total_videos > 0 else 0.0, 1)

    # 2. Assessment metrics
    assessments = firebase_manager.list_documents("assessments", filters={"is_published": True})
    attempts = firebase_manager.list_documents("attempts", filters={"student_id": student_id})
    attempt_map = {a.get("assessment_id"): a for a in attempts}
    scores = [a.get("score_percentage", 0.0) for a in attempts if a.get("score_percentage") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    # 3. Documents & RAG metrics
    docs = firebase_manager.list_documents("documents", filters={"student_id": student_id})
    activities = firebase_manager.list_documents("activities", filters={"student_id": student_id})
    rag_queries = [a for a in activities if a.get("type") == "rag_query"]

    # 4. Topic performance aggregation
    topic_scores: Dict[str, List[float]] = {}
    topic_subjects: Dict[str, str] = {}

    # Register all topics from published content
    for v in videos:
        t = v.get("topic")
        if t:
            topic_scores.setdefault(t, [])
            topic_subjects[t] = v.get("subject", "General")

    for a in assessments:
        t = a.get("topic")
        if t:
            topic_scores.setdefault(t, [])
            topic_subjects[t] = a.get("subject", "General")

    for att in attempts:
        t = att.get("topic")
        s = att.get("score_percentage")
        if t and s is not None:
            topic_scores.setdefault(t, []).append(s)
            topic_subjects[t] = att.get("subject", "General")

    topic_performance = []
    revision_recommendations = []

    for topic, score_list in topic_scores.items():
        subject = topic_subjects.get(topic, "General")
        if score_list:
            avg_t = round(sum(score_list) / len(score_list), 1)
            if avg_t >= 75.0:
                status_str = "Mastered"
            else:
                status_str = "Needs Revision"
                revision_recommendations.append(RevisionRecommendation(
                    topic=topic,
                    subject=subject,
                    priority="High",
                    reason=f"Recorded assessment average of {avg_t}% is below the 75% target mastery threshold.",
                    action_type="retake_review"
                ))

            topic_performance.append(TopicPerformanceItem(
                topic=topic,
                subject=subject,
                assessment_count=len(score_list),
                average_score=avg_t,
                status=status_str
            ))
        else:
            topic_performance.append(TopicPerformanceItem(
                topic=topic,
                subject=subject,
                assessment_count=0,
                average_score=None,
                status="Insufficient assessment data"
            ))

    # Identify incomplete assigned video lessons
    for v in videos:
        if v.get("id") not in completed_video_ids:
            revision_recommendations.append(RevisionRecommendation(
                topic=v.get("topic", "Lesson"),
                subject=v.get("subject", "General"),
                priority="Medium",
                reason=f"Assigned video lesson '{v.get('title')}' is incomplete (required threshold {v.get('completion_threshold_percentage', 80)}%).",
                action_type="complete_video",
                resource_id=v.get("id")
            ))

    # Sort activities by timestamp descending
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    recent_acts = [
        ActivityItem(
            id=a.get("id", ""),
            type=a.get("type", "activity"),
            title=a.get("title", "Activity"),
            subject=a.get("subject", "General"),
            timestamp=a.get("timestamp", ""),
            score=a.get("score")
        )
        for a in activities[:10]
    ]

    return AcademicProgressDashboard(
        student_id=student_id,
        student_name=student_name,
        total_assigned_videos=total_videos,
        completed_videos=completed_videos_count,
        completion_rate_percentage=completion_rate,
        total_assessments_available=len(assessments),
        total_assessments_attempted=len(attempts),
        average_assessment_score=avg_score,
        total_documents_uploaded=len(docs),
        total_rag_queries=len(rag_queries),
        topic_performance=topic_performance,
        revision_recommendations=revision_recommendations[:6],
        recent_activities=recent_acts
    )
