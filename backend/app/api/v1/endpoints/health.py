from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "personalized-learning-backend",
        "version": "1.0.0"
    }
