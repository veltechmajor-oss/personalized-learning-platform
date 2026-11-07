from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.services.migration_service import run_video_folder_migration


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run idempotent data migration for course folders and video lessons
    try:
        run_video_folder_migration()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Startup migration check error: %s", e)
    yield


app = FastAPI(
    title="Personalized Learning Platform API",
    description="Backend API powering RAG-based personalized learning and academic progress management",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://personalized-learning-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# Mount routes
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Welcome to Personalized Learning Platform API",
        "docs": "/docs",
        "health": "/api/health"
    }
