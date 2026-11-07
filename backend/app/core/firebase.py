"""
Firebase Admin and Firestore integration – requires a live Firestore client.
"""
import os
import json
import logging
from typing import Optional, Dict, Any

import firebase_admin
from firebase_admin import credentials, auth as admin_auth, firestore
from app.core.config import settings

logger = logging.getLogger(__name__)

# No in‑memory fallback – this module now requires a live Firestore client.
# If Firestore cannot be initialized, the application will raise an error on startup.


class FirebaseManager:
    def __init__(self):
        self.app = None
        self.db = None
        self._initialize_firebase()

    def _initialize_firebase(self):
        """Initializes Firebase Admin SDK and obtains a Firestore client.
        Raises RuntimeError if a usable Firestore client cannot be created.
        """
        # If the SDK was already initialized elsewhere, reuse it.
        if firebase_admin._apps:
            self.app = firebase_admin.get_app()
            try:
                self.db = firestore.client()
            except Exception as e:
                logger.error(f"Could not connect to live Firestore: {e}")
                raise RuntimeError("Firestore client unavailable")
            return

        cred = None
        # 1️⃣ Service account JSON string (e.g., from env var)
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            try:
                cred_dict = json.loads(sa_json)
                cred = credentials.Certificate(cred_dict)
            except Exception as e:
                logger.error(f"Failed parsing FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
                raise

        # 2️⃣ Service account file path (absolute or relative to project root)
        sa_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH or os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
        if not cred and sa_path:
            # Resolve relative paths safely
            if not os.path.isabs(sa_path):
                # Project root is two levels up from this file (backend/app/core)
                project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
                sa_path = os.path.join(project_root, sa_path)
            if os.path.exists(sa_path):
                try:
                    cred = credentials.Certificate(sa_path)
                except Exception as e:
                    logger.error(f"Failed loading service account file: {e}")
                    raise
            else:
                logger.error(f"Firebase service‑account file not found at {sa_path}")
                raise RuntimeError("Firebase credentials missing")

        # 3️⃣ Project ID fallback (useful for emulator or low‑privilege setups)
        project_id = (
            settings.FIREBASE_PROJECT_ID
            or os.environ.get("FIREBASE_PROJECT_ID", "personalized-learning-a2477")
        )

        # Resolve final credential – must have a service account certificate.
        if not cred:
            logger.error("Firebase service‑account credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.")
            raise RuntimeError("Firebase service‑account credentials missing")

        # Initialise Firebase Admin with the verified credentials.
        try:
            self.app = firebase_admin.initialize_app(
                cred, {"projectId": settings.FIREBASE_PROJECT_ID or os.environ.get("FIREBASE_PROJECT_ID", "personalized-learning-a2477")}
            )
            self.db = firestore.client()
            logger.info("Firebase Admin initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin: {e}")
            raise RuntimeError("Firestore client unavailable")

    # -----------------------------------------------------------------
    # Authentication helpers
    # -----------------------------------------------------------------
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token and return decoded claims.
        Supports a simple development bypass token of the form ``dev-token-<uid>``.
        """
        if not token:
            return None
        # Development bypass – handy for local testing without real auth
        if token.startswith("dev-token-"):
            uid = token.replace("dev-token-", "")
            return {
                "uid": uid,
                "email": f"{uid}@academic.edu",
                "name": uid.capitalize(),
                "role": "admin" if "admin" in uid else "student",
            }
        try:
            return admin_auth.verify_id_token(token)
        except Exception as e:
            logger.warning(f"Firebase token verification failed: {e}")
            return None

    # -----------------------------------------------------------------
    # Firestore CRUD wrappers – **no fallback**.
    # -----------------------------------------------------------------
    def _require_db(self):
        if not self.db:
            raise RuntimeError(
                "Firestore client not initialized – check environment variables"
            )

    def set_document(self, collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Create or update a document in Firestore. Raises on failure."""
        self._require_db()
        try:
            self.db.collection(collection).document(doc_id).set(data, merge=True)
            return True
        except Exception as e:
            logger.error(f"Firestore set_document error: {e}")
            raise

    def update_document(self, collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Update a document in Firestore with merge=True."""
        return self.set_document(collection, doc_id, data)

    def get_document(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single document from Firestore. Returns ``None`` if missing."""
        self._require_db()
        try:
            doc = self.db.collection(collection).document(doc_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"Firestore get_document error: {e}")
            raise

    def list_documents(
        self, collection: str, filters: Optional[Dict[str, Any]] = None
    ) -> list:
        """Return a list of documents, optionally filtered by field equality."""
        self._require_db()
        try:
            query = self.db.collection(collection)
            if filters:
                for k, v in filters.items():
                    query = query.where(k, "==", v)
            return [{**d.to_dict(), "id": d.id} for d in query.stream()]
        except Exception as e:
            logger.error(f"Firestore list_documents error: {e}")
            raise

    def delete_document(self, collection: str, doc_id: str) -> bool:
        """Delete a document from Firestore. Returns ``True`` on success."""
        self._require_db()
        try:
            self.db.collection(collection).document(doc_id).delete()
            return True
        except Exception as e:
            logger.error(f"Firestore delete_document error: {e}")
            raise


# Global instance used throughout the project
firebase_manager = FirebaseManager()
