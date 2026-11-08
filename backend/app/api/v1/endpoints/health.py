from fastapi import APIRouter
from app.services.qdrant_service import qdrant_service

router = APIRouter()


@router.get("/health")
def health_check():
    qdrant_diag = qdrant_service.check_health()
    return {
        "status": "healthy",
        "service": "personalized-learning-backend",
        "version": "1.0.0",
        "qdrant": {
            "status": qdrant_diag.get("status"),
            "cluster_url": qdrant_diag.get("cluster_url"),
            "collection": qdrant_diag.get("collection"),
            "api_key_configured": qdrant_diag.get("api_key_configured"),
            "api_key_masked": qdrant_diag.get("api_key_masked"),
            "points_count": qdrant_diag.get("points_count", 0),
            "vector_dimension": qdrant_diag.get("vector_dimension", 0),
            "message": qdrant_diag.get("message"),
        }
    }
