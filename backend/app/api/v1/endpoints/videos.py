from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import datetime
from app.core.security import get_current_user, require_admin, AuthenticatedUser
from app.core.firebase import firebase_manager
from app.services.video_service import video_service
from app.services.assessment_generation_service import assessment_generation_service

router = APIRouter()


class VideoLessonCreateRequest(BaseModel):
    folder_id: Optional[str] = None
    title: str = Field(..., min_length=2)
    description: str = ""
    youtube_url: str
    subject: str = "Computer Science"
    topic: str = "Core Concepts"
    learning_objectives: Optional[str] = Field("", description="Admin-provided learning goals and key concepts")
    completion_threshold_percentage: float = Field(80.0, ge=10.0, le=100.0)
    assessment_total_marks: float = Field(10.0, ge=1.0)
    assessment_question_count: int = Field(10, ge=1)
    difficulty_level: str = Field("Medium", description="Difficulty: Easy, Medium, Hard")
    assessment_time_limit_minutes: int = Field(30, ge=1)
    is_published: bool = True
    order_index: Optional[int] = 0


class VideoLessonResponse(BaseModel):
    id: str
    video_id: Optional[str] = None
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    title: str
    description: str
    learning_objectives: Optional[str] = ""
    youtube_url: str
    youtube_id: str
    youtube_video_id: Optional[str] = None
    subject: str
    topic: str
    completion_threshold_percentage: float
    completion_threshold: Optional[float] = None
    is_published: bool
    published: Optional[bool] = None
    created_at: str
    updated_at: Optional[str] = None
    student_progress_percentage: Optional[float] = 0.0
    last_position_seconds: Optional[float] = 0.0
    is_completed: Optional[bool] = False
    has_assessment: Optional[bool] = False
    assessment_id: Optional[str] = None


class ProgressUpdateRequest(BaseModel):
    watched_seconds: float = Field(..., ge=0.0)
    total_seconds: Optional[float] = Field(None, gt=0.0)
    duration_seconds: Optional[float] = Field(None, gt=0.0)
    last_position_seconds: Optional[float] = Field(0.0, ge=0.0)


class VideoAssessmentGenRequest(BaseModel):
    question_count: int = Field(10, ge=1, le=25)
    total_marks: float = Field(10.0, ge=1.0)
    difficulty: str = Field("Medium")
    regenerate: bool = False


def _get_or_create_default_folder() -> str:
    """Ensure a default course folder exists to associate unassigned videos."""
    folders = firebase_manager.list_documents("course_folders")
    if folders:
        return folders[0].get("id") or folders[0].get("folder_id")

    fid = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    firebase_manager.set_document("course_folders", fid, {
        "id": fid,
        "folder_id": fid,
        "folder_name": "General Course Curriculum",
        "description": "Standard course curriculum videos.",
        "subject": "Computer Science",
        "created_by": "system",
        "created_at": now,
        "updated_at": now,
        "published": True,
        "is_published": True,
        "video_count": 0
    })
    return fid


def _sync_folder_count(folder_id: str):
    """Recompute video count for a specific folder."""
    if not folder_id:
        return
    videos = firebase_manager.list_documents("videos", filters={"folder_id": folder_id})
    firebase_manager.update_document("course_folders", folder_id, {"video_count": len(videos)})


@router.post("", response_model=VideoLessonResponse)
async def create_video_lesson(
    payload: VideoLessonCreateRequest,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    is_valid, err_msg, video_id = video_service.validate_youtube_url(payload.youtube_url)
    if not is_valid or not video_id:
        raise HTTPException(status_code=400, detail=err_msg)

    # Validate or assign folder_id
    folder_id = payload.folder_id
    folder_name = "General"
    if folder_id:
        f = firebase_manager.get_document("course_folders", folder_id)
        if not f:
            raise HTTPException(status_code=400, detail=f"Course folder ID '{folder_id}' not found.")
        folder_name = f.get("folder_name", "General")
    else:
        folder_id = _get_or_create_default_folder()
        f = firebase_manager.get_document("course_folders", folder_id)
        folder_name = f.get("folder_name", "General") if f else "General"

    lesson_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    lesson_data = {
        "id": lesson_id,
        "video_id": lesson_id,
        "folder_id": folder_id,
        "folder_name": folder_name,
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "learning_objectives": payload.learning_objectives.strip() if payload.learning_objectives else "",
        "youtube_url": payload.youtube_url.strip(),
        "youtube_id": video_id,
        "youtube_video_id": video_id,
        "subject": payload.subject.strip(),
        "topic": payload.topic.strip(),
        "completion_threshold_percentage": payload.completion_threshold_percentage,
        "completion_threshold": payload.completion_threshold_percentage,
        "is_published": payload.is_published,
        "published": payload.is_published,
        "order_index": payload.order_index or 0,
        "created_at": now,
        "updated_at": now,
        "created_by": current_admin.uid
    }

    firebase_manager.set_document("videos", lesson_id, lesson_data)
    _sync_folder_count(folder_id)

    return VideoLessonResponse(**lesson_data)


@router.get("", response_model=List[VideoLessonResponse])
async def list_videos(
    folder_id: Optional[str] = Query(None, description="Filter videos by course folder ID"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    filters = {}
    if current_user.role != "admin":
        filters["is_published"] = True
    if folder_id:
        filters["folder_id"] = folder_id

    all_videos = firebase_manager.list_documents("videos", filters=filters if filters else None)

    # Fetch folder map for display
    all_folders = {f.get("id"): f.get("folder_name") for f in firebase_manager.list_documents("course_folders")}

    # Fetch student's progress records
    progress_records = {
        p.get("video_id"): p
        for p in firebase_manager.list_documents("video_progress", filters={"student_id": current_user.uid})
    }

    # Fetch assessments mapped to videos
    assessments = firebase_manager.list_documents("assessments")
    video_assessment_map = {a.get("video_id"): a.get("id") for a in assessments if a.get("video_id")}

    results = []
    for v in all_videos:
        vid_id = v.get("id") or v.get("video_id")
        prog = progress_records.get(vid_id, {})
        student_prog = prog.get("watched_percentage") or prog.get("completion_percentage") or 0.0
        last_pos = prog.get("last_position_seconds", 0.0)
        threshold = v.get("completion_threshold_percentage") or v.get("completion_threshold") or 80.0
        v_folder_id = v.get("folder_id")
        v_folder_name = v.get("folder_name") or all_folders.get(v_folder_id, "General Course")

        is_completed = prog.get("is_completed") or prog.get("completed") or (student_prog >= threshold)
        is_pub = v.get("is_published", v.get("published", True))

        results.append(VideoLessonResponse(
            id=vid_id,
            video_id=vid_id,
            folder_id=v_folder_id,
            folder_name=v_folder_name,
            title=v.get("title", "Untitled Lesson"),
            description=v.get("description", ""),
            learning_objectives=v.get("learning_objectives", ""),
            youtube_url=v.get("youtube_url", ""),
            youtube_id=v.get("youtube_id", ""),
            youtube_video_id=v.get("youtube_id", ""),
            subject=v.get("subject", "General"),
            topic=v.get("topic", "General"),
            completion_threshold_percentage=threshold,
            completion_threshold=threshold,
            is_published=is_pub,
            published=is_pub,
            created_at=v.get("created_at", ""),
            updated_at=v.get("updated_at", v.get("created_at", "")),
            student_progress_percentage=round(float(student_prog), 1),
            last_position_seconds=float(last_pos),
            is_completed=bool(is_completed),
            has_assessment=vid_id in video_assessment_map,
            assessment_id=video_assessment_map.get(vid_id)
        ))

    # Sort by title
    results.sort(key=lambda x: (x.title.lower()))
    return results


@router.get("/{video_id}", response_model=VideoLessonResponse)
async def get_video(video_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    v = firebase_manager.get_document("videos", video_id)
    if not v:
        raise HTTPException(status_code=404, detail="Video lesson not found.")

    is_pub = v.get("is_published", v.get("published", True))
    if not is_pub and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="This video lesson is not published yet.")

    prog = firebase_manager.get_document("video_progress", f"{current_user.uid}_{video_id}") or {}
    student_prog = prog.get("watched_percentage") or prog.get("completion_percentage") or 0.0
    last_pos = prog.get("last_position_seconds", 0.0)
    threshold = v.get("completion_threshold_percentage") or v.get("completion_threshold") or 80.0

    assessments = firebase_manager.list_documents("assessments", filters={"video_id": video_id})
    assessment_id = assessments[0].get("id") if assessments else None

    folder_name = v.get("folder_name", "")
    if not folder_name and v.get("folder_id"):
        f = firebase_manager.get_document("course_folders", v.get("folder_id"))
        if f:
            folder_name = f.get("folder_name", "")

    return VideoLessonResponse(
        id=video_id,
        video_id=video_id,
        folder_id=v.get("folder_id"),
        folder_name=folder_name,
        title=v.get("title", ""),
        description=v.get("description", ""),
        learning_objectives=v.get("learning_objectives", ""),
        youtube_url=v.get("youtube_url", ""),
        youtube_id=v.get("youtube_id", ""),
        youtube_video_id=v.get("youtube_id", ""),
        subject=v.get("subject", ""),
        topic=v.get("topic", ""),
        completion_threshold_percentage=threshold,
        completion_threshold=threshold,
        is_published=is_pub,
        published=is_pub,
        created_at=v.get("created_at", ""),
        updated_at=v.get("updated_at", v.get("created_at", "")),
        student_progress_percentage=round(float(student_prog), 1),
        last_position_seconds=float(last_pos),
        is_completed=bool(prog.get("is_completed") or student_prog >= threshold),
        has_assessment=bool(assessment_id),
        assessment_id=assessment_id
    )


@router.put("/{video_id}", response_model=VideoLessonResponse)
async def update_video_lesson(
    video_id: str,
    payload: VideoLessonCreateRequest,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    existing = firebase_manager.get_document("videos", video_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Video lesson not found.")

    is_valid, err_msg, yid = video_service.validate_youtube_url(payload.youtube_url)
    if not is_valid or not yid:
        raise HTTPException(status_code=400, detail=err_msg)

    old_folder_id = existing.get("folder_id")
    new_folder_id = payload.folder_id or old_folder_id or _get_or_create_default_folder()

    folder_name = existing.get("folder_name", "")
    if new_folder_id:
        f = firebase_manager.get_document("course_folders", new_folder_id)
        if f:
            folder_name = f.get("folder_name", "")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    updated_data = {
        "folder_id": new_folder_id,
        "folder_name": folder_name,
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "learning_objectives": payload.learning_objectives.strip() if payload.learning_objectives else "",
        "youtube_url": payload.youtube_url.strip(),
        "youtube_id": yid,
        "youtube_video_id": yid,
        "subject": payload.subject.strip(),
        "topic": payload.topic.strip(),
        "completion_threshold_percentage": payload.completion_threshold_percentage,
        "completion_threshold": payload.completion_threshold_percentage,
        "is_published": payload.is_published,
        "published": payload.is_published,
        "updated_at": now
    }

    firebase_manager.update_document("videos", video_id, updated_data)

    if old_folder_id and old_folder_id != new_folder_id:
        _sync_folder_count(old_folder_id)
    _sync_folder_count(new_folder_id)

    merged = {**existing, **updated_data}
    return VideoLessonResponse(**merged)


@router.delete("/{video_id}")
async def delete_video_lesson(
    video_id: str,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    existing = firebase_manager.get_document("videos", video_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Video lesson not found.")

    folder_id = existing.get("folder_id")
    firebase_manager.delete_document("videos", video_id)

    if folder_id:
        _sync_folder_count(folder_id)

    return {"message": "Video lesson deleted successfully.", "id": video_id}


@router.post("/{video_id}/progress")
async def update_playback_progress(
    video_id: str,
    payload: ProgressUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Update student playback progress.
    Validates progress, enforces monotonic increase, and marks video completed
    once threshold is reached.
    """
    v = firebase_manager.get_document("videos", video_id)
    if not v:
        raise HTTPException(status_code=404, detail="Video lesson not found.")

    duration = payload.duration_seconds or payload.total_seconds or 100.0
    watched_seconds = payload.watched_seconds
    last_position = payload.last_position_seconds or watched_seconds

    # Anti-tampering check: clamp watched ratio to [0.0, 1.0]
    watched_ratio = min(max(watched_seconds / duration, 0.0), 1.0) if duration > 0 else 0.0
    watched_percentage = round(watched_ratio * 100.0, 1)

    progress_key = f"{current_user.uid}_{video_id}"
    existing_prog = firebase_manager.get_document("video_progress", progress_key) or {}
    prev_percentage = float(existing_prog.get("watched_percentage") or existing_prog.get("completion_percentage") or 0.0)

    # Monotonic progress guarantee
    final_percentage = max(prev_percentage, watched_percentage)
    threshold = float(v.get("completion_threshold_percentage") or v.get("completion_threshold") or 80.0)
    is_completed = final_percentage >= threshold

    updated_record = {
        "id": progress_key,
        "student_id": current_user.uid,
        "video_id": video_id,
        "folder_id": v.get("folder_id"),
        "watched_seconds": watched_seconds,
        "duration_seconds": duration,
        "completion_percentage": final_percentage,
        "watched_percentage": final_percentage,
        "is_completed": is_completed,
        "completed": is_completed,
        "last_position_seconds": last_position,
        "last_watched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "subject": v.get("subject", "General"),
        "topic": v.get("topic", "General")
    }

    firebase_manager.set_document("video_progress", progress_key, updated_record)

    # Check if an assessment already exists for this video
    assessments = firebase_manager.list_documents("assessments", filters={"video_id": video_id})
    assessment_id = assessments[0].get("id") if assessments else None

    # Record activity milestone if newly completed
    if is_completed and not existing_prog.get("is_completed", False):
        act_id = str(uuid.uuid4())
        firebase_manager.set_document("activities", act_id, {
            "id": act_id,
            "student_id": current_user.uid,
            "type": "video_completion",
            "title": f"Completed Lesson: '{v.get('title')}' ({final_percentage}%)",
            "subject": v.get("subject", "General"),
            "topic": v.get("topic", "General"),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

    return {
        "video_id": video_id,
        "watched_percentage": final_percentage,
        "completion_percentage": final_percentage,
        "is_completed": is_completed,
        "completed": is_completed,
        "assessment_unlocked": is_completed,
        "assessment_id": assessment_id
    }


@router.post("/{video_id}/generate-assessment")
async def generate_video_assessment(
    video_id: str,
    payload: VideoAssessmentGenRequest = VideoAssessmentGenRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Generate an objective AI assessment for this video lesson using Gemini API.
    Based strictly on the administrator's video description and learning objectives.
    """
    video = firebase_manager.get_document("videos", video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video lesson not found.")

    # Check eligibility: Admin or student with completed progress
    if current_user.role != "admin":
        prog = firebase_manager.get_document("video_progress", f"{current_user.uid}_{video_id}") or {}
        is_done = prog.get("is_completed") or prog.get("completed")
        if not is_done:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assessment generation is locked. You must reach the video lesson completion threshold first."
            )

    # If assessment already exists and not regenerating, return existing
    if not payload.regenerate:
        existing_assessments = firebase_manager.list_documents("assessments", filters={"video_id": video_id})
        if existing_assessments:
            existing = existing_assessments[0]
            return {
                "message": "Assessment already available for this video lesson.",
                "assessment_id": existing.get("id"),
                "total_marks": existing.get("total_marks", 10.0),
                "question_count": existing.get("question_count", len(existing.get("questions", []))),
                "is_existing": True
            }

    # Fetch folder info
    folder_id = video.get("folder_id")
    folder_name = "Course Module"
    if folder_id:
        f = firebase_manager.get_document("course_folders", folder_id)
        if f:
            folder_name = f.get("folder_name", "Course Module")

    title = video.get("title", "Video Lesson")
    desc = video.get("description", "")
    learning_obj = video.get("learning_objectives") or (
        f"Master the core operational principles, definitions, and applications of {video.get('topic', 'this module')}."
    )

    # Use Gemini structured assessment generator
    questions = assessment_generation_service.generate_assessment(
        title=f"{title} - Assessment",
        description=desc,
        learning_objectives=f"Course Folder: {folder_name}\nLearning Objectives:\n{learning_obj}\nOverview: {desc}",
        subject=video.get("subject", "General"),
        topic=video.get("topic", "General"),
        difficulty=payload.difficulty,
        question_count=payload.question_count,
        total_marks=payload.total_marks
    )

    assessment_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    assessment_data = {
        "id": assessment_id,
        "video_id": video_id,
        "folder_id": folder_id,
        "source_type": "video",
        "title": f"{title} Assessment",
        "description": f"Curriculum evaluation for '{title}' based on verified learning objectives.",
        "subject": video.get("subject", "General"),
        "topic": video.get("topic", "General"),
        "passing_percentage": 60.0,
        "total_marks": payload.total_marks,
        "question_count": len(questions),
        "questions": questions,
        "is_published": True,
        "created_at": now,
        "created_by": current_user.uid
    }

    firebase_manager.set_document("assessments", assessment_id, assessment_data)

    return {
        "message": f"AI assessment with {len(questions)} objective questions generated successfully.",
        "assessment_id": assessment_id,
        "total_marks": payload.total_marks,
        "question_count": len(questions),
        "is_existing": False
    }
