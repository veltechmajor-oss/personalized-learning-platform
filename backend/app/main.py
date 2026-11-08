import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.services.migration_service import run_video_folder_migration

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run idempotent data migration for course folders and video lessons
    try:
        run_video_folder_migration()
    except Exception as e:
        logger.warning("Startup migration check error: %s", e)
    yield


app = FastAPI(
    title="Personalized Learning Platform API",
    description="Backend API powering RAG-based personalized learning and academic progress management",
    version="1.0.0",
    lifespan=lifespan,
)

# Standardized allowed origins list including the exact deployed frontend origin
EXACT_DEPLOYED_ORIGINS = [
    "https://personalized-learning-platform-1-l82p.onrender.com",
    "https://personalized-learning-frontend.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Deduplicate configured origins
all_allowed_origins = list(dict.fromkeys(EXACT_DEPLOYED_ORIGINS + settings.cors_origins))

# CORS middleware registered BEFORE routes handle requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=all_allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
    ],
    expose_headers=["*"],
    max_age=600,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Ensure all unhandled backend exceptions return a JSON response with proper CORS headers
    attached, preventing browser CORS policy masking the real backend exception.
    """
    logger.exception("Unhandled server exception on %s %s: %s", request.method, request.url.path, exc)
    origin = request.headers.get("origin")
    headers = {}
    if origin and (
        origin in all_allowed_origins
        or origin.endswith(".onrender.com")
        or "localhost" in origin
        or "127.0.0.1" in origin
    ):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, X-Requested-With"

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers=headers,
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
