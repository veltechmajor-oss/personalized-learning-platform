from __future__ import annotations
import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = (
        "https://personalized-learning-platform-1-l82p.onrender.com,"
        "https://personalized-learning-frontend.onrender.com,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Qdrant
    QDRANT_URL: str = "https://c16762c5-f84b-4e5a-93a4-6bb790b8805f.sa-east-1-0.aws.cloud.qdrant.io"
    QDRANT_API_KEY: str = ""
    QDRANT_KEY: Optional[str] = None
    QDRANT_APIKEY: Optional[str] = None
    QDRANT_COLLECTION: str = "learning_materials"
    QDRANT_COLLECTION_NAME: Optional[str] = None

    # Firebase
    FIREBASE_PROJECT_ID: str = "personalized-learning-a2477"
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_SERVICE_ACCOUNT_PATH: str = ""
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    FIREBASE_SERVICE_ACCOUNT_BASE64: str = ""

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = "kyp1f9pe"
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_URL: str = ""

    # Security
    ADMIN_SETUP_SECRET: str = "academic-admin-secret-2026"

    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def effective_qdrant_url(self) -> str:
        url = (
            (self.QDRANT_URL and self.QDRANT_URL.strip())
            or os.environ.get("QDRANT_URL", "").strip()
            or "https://c16762c5-f84b-4e5a-93a4-6bb790b8805f.sa-east-1-0.aws.cloud.qdrant.io"
        )
        if (url.startswith('"') and url.endswith('"')) or (url.startswith("'") and url.endswith("'")):
            url = url[1:-1].strip()
        return url.rstrip("/")

    @property
    def effective_qdrant_api_key(self) -> str:
        key = (
            (self.QDRANT_API_KEY and self.QDRANT_API_KEY.strip())
            or (self.QDRANT_KEY and self.QDRANT_KEY.strip())
            or (self.QDRANT_APIKEY and self.QDRANT_APIKEY.strip())
            or os.environ.get("QDRANT_API_KEY", "").strip()
            or os.environ.get("QDRANT_KEY", "").strip()
            or os.environ.get("QDRANT_APIKEY", "").strip()
        )
        if (key.startswith('"') and key.endswith('"')) or (key.startswith("'") and key.endswith("'")):
            key = key[1:-1].strip()
        return key

    @property
    def effective_qdrant_collection(self) -> str:
        col = (
            (self.QDRANT_COLLECTION_NAME and self.QDRANT_COLLECTION_NAME.strip())
            or (self.QDRANT_COLLECTION and self.QDRANT_COLLECTION.strip())
            or os.environ.get("QDRANT_COLLECTION_NAME", "").strip()
            or os.environ.get("QDRANT_COLLECTION", "").strip()
            or "learning_materials"
        )
        if (col.startswith('"') and col.endswith('"')) or (col.startswith("'") and col.endswith("'")):
            col = col[1:-1].strip()
        return col


settings = Settings()
