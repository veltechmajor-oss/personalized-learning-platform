from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import datetime
from app.core.security import get_current_user, require_admin, AuthenticatedUser
from app.core.firebase import firebase_manager

router = APIRouter()


class CourseFolderCreateRequest(BaseModel):
    folder_name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field("", max_length=1000)
    subject: str = Field("Computer Science", min_length=2)
    published: bool = Field(True, description="Whether this folder is visible to students")


class CourseFolderUpdateRequest(BaseModel):
    folder_name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    subject: Optional[str] = None
    published: Optional[bool] = None


class CourseFolderResponse(BaseModel):
    id: str
    folder_id: str
    folder_name: str
    description: str
    subject: str
    published: bool
    is_published: bool
    video_count: int
    created_by: str
    created_at: str
    updated_at: str


@router.get("", response_model=List[CourseFolderResponse])
async def list_course_folders(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    List course curriculum folders. Admins see all; students see published folders only.
    Synchronizes real video counts from the videos collection.
    """
    filters = None if current_user.role == "admin" else {"is_published": True}
    folders = firebase_manager.list_documents("course_folders", filters=filters)

    # Calculate actual video counts per folder
    video_filters = None if current_user.role == "admin" else {"is_published": True}
    all_videos = firebase_manager.list_documents("videos", filters=video_filters)
    counts: Dict[str, int] = {}
    for v in all_videos:
        fid = v.get("folder_id")
        if fid:
            counts[fid] = counts.get(fid, 0) + 1

    results = []
    for f in folders:
        fid = f.get("id") or f.get("folder_id") or ""
        is_pub = f.get("published", f.get("is_published", True))
        actual_count = counts.get(fid, f.get("video_count", 0))

        results.append(CourseFolderResponse(
            id=fid,
            folder_id=fid,
            folder_name=f.get("folder_name", "Untitled Folder"),
            description=f.get("description", ""),
            subject=f.get("subject", "General"),
            published=is_pub,
            is_published=is_pub,
            video_count=actual_count,
            created_by=f.get("created_by", "admin"),
            created_at=f.get("created_at", ""),
            updated_at=f.get("updated_at", f.get("created_at", ""))
        ))

    # Sort folders by name
    results.sort(key=lambda x: x.folder_name.lower())
    return results


@router.post("", response_model=CourseFolderResponse)
async def create_course_folder(
    payload: CourseFolderCreateRequest,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    """Create a new course curriculum folder (Admin only)."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    folder_id = str(uuid.uuid4())

    folder_data = {
        "id": folder_id,
        "folder_id": folder_id,
        "folder_name": payload.folder_name.strip(),
        "description": payload.description.strip() if payload.description else "",
        "subject": payload.subject.strip(),
        "published": payload.published,
        "is_published": payload.published,
        "video_count": 0,
        "created_by": current_admin.uid,
        "created_at": now,
        "updated_at": now
    }

    firebase_manager.set_document("course_folders", folder_id, folder_data)
    return CourseFolderResponse(**folder_data)


@router.get("/{folder_id}", response_model=CourseFolderResponse)
async def get_course_folder(
    folder_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieve details for a single course curriculum folder."""
    f = firebase_manager.get_document("course_folders", folder_id)
    if not f:
        raise HTTPException(status_code=404, detail="Course folder not found.")

    is_pub = f.get("published", f.get("is_published", True))
    if not is_pub and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="This course folder is not published yet.")

    # Calculate count
    videos = firebase_manager.list_documents("videos", filters={"folder_id": folder_id})
    if current_user.role != "admin":
        videos = [v for v in videos if v.get("is_published", True)]

    return CourseFolderResponse(
        id=folder_id,
        folder_id=folder_id,
        folder_name=f.get("folder_name", "Untitled Folder"),
        description=f.get("description", ""),
        subject=f.get("subject", "General"),
        published=is_pub,
        is_published=is_pub,
        video_count=len(videos),
        created_by=f.get("created_by", "admin"),
        created_at=f.get("created_at", ""),
        updated_at=f.get("updated_at", f.get("created_at", ""))
    )


@router.put("/{folder_id}", response_model=CourseFolderResponse)
async def update_course_folder(
    folder_id: str,
    payload: CourseFolderUpdateRequest,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    """Update course curriculum folder metadata or publication status (Admin only)."""
    existing = firebase_manager.get_document("course_folders", folder_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Course folder not found.")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    updates: Dict[str, Any] = {"updated_at": now}

    if payload.folder_name is not None:
        updates["folder_name"] = payload.folder_name.strip()
    if payload.description is not None:
        updates["description"] = payload.description.strip()
    if payload.subject is not None:
        updates["subject"] = payload.subject.strip()
    if payload.published is not None:
        updates["published"] = payload.published
        updates["is_published"] = payload.published

    firebase_manager.update_document("course_folders", folder_id, updates)
    merged = {**existing, **updates}

    # Recalculate count
    videos = firebase_manager.list_documents("videos", filters={"folder_id": folder_id})
    merged["video_count"] = len(videos)
    merged["id"] = folder_id
    merged["folder_id"] = folder_id

    return CourseFolderResponse(**merged)


@router.delete("/{folder_id}")
async def delete_course_folder(
    folder_id: str,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    """Delete a course curriculum folder and unlink its videos (Admin only)."""
    existing = firebase_manager.get_document("course_folders", folder_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Course folder not found.")

    # Unlink or delete videos inside this folder
    videos = firebase_manager.list_documents("videos", filters={"folder_id": folder_id})
    for v in videos:
        vid_id = v.get("id")
        # Delete video or remove folder link
        firebase_manager.delete_document("videos", vid_id)

    firebase_manager.delete_document("course_folders", folder_id)
    return {
        "message": f"Folder '{existing.get('folder_name')}' and {len(videos)} associated videos deleted successfully.",
        "id": folder_id
    }

