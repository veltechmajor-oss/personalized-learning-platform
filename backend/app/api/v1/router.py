from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    users,
    documents,
    learning,
    videos,
    assessments,
    progress,
    course_folders,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Roles"])
api_router.include_router(users.router, prefix="/users", tags=["User Management"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents & Files"])
api_router.include_router(learning.router, prefix="/learning", tags=["Model 1: RAG Learning"])
api_router.include_router(course_folders.router, prefix="/folders", tags=["Model 2: Course Folders"])
api_router.include_router(videos.router, prefix="/videos", tags=["Model 2: Video Lessons"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["Model 2: Assessments"])
api_router.include_router(progress.router, prefix="/progress", tags=["Academic Progress Management"])


