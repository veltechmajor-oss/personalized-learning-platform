"""
Firebase Admin SDK and Cloud Firestore integration.
Supports multi-source credential loading:
1. FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string)
2. FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded JSON string)
3. Individual environment variables (Render standard):
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY
4. FIREBASE_SERVICE_ACCOUNT_PATH (local JSON file path for development)
5. GOOGLE_APPLICATION_CREDENTIALS (file path)

Initializes Firebase Admin SDK only once (singleton pattern).
"""
import os
import json
import base64
import logging
from typing import Optional, Dict, Any

import firebase_admin
from firebase_admin import credentials, auth as admin_auth, firestore
from app.core.config import settings

logger = logging.getLogger(__name__)


def _clean_private_key(key: Optional[str]) -> str:
    """Clean and normalize a private key from environment variables.
    Handles:
    - Leading/trailing whitespace
    - Surrounding single or double quotes
    - Literal escaped newlines (\\n -> real newline)
    - Windows CRLF (\\r\\n -> \\n)
    """
    if not key:
        return ""
    cleaned = key.strip()

    # Strip wrapping single or double quotes if present
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()

    # Replace literal escaped \n with actual newlines
    cleaned = cleaned.replace("\\n", "\n").replace("\r", "")

    # Ensure header and footer are on their own lines
    if "-----BEGIN PRIVATE KEY-----" in cleaned and not cleaned.startswith("-----BEGIN PRIVATE KEY-----"):
        idx = cleaned.find("-----BEGIN PRIVATE KEY-----")
        cleaned = cleaned[idx:]
    if "-----END PRIVATE KEY-----" in cleaned:
        end_idx = cleaned.find("-----END PRIVATE KEY-----") + len("-----END PRIVATE KEY-----")
        cleaned = cleaned[:end_idx]

    return cleaned.strip()


class FirebaseManager:
    _instance: Optional["FirebaseManager"] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self.app = None
        self.db = None
        self._initialize_firebase()
        self._initialized = True

    def _resolve_credentials(self) -> Optional[credentials.Certificate]:
        """Resolves Firebase credentials from supported sources in priority order."""
        # 1️⃣ Full service account JSON string (e.g. from environment variable)
        sa_json = (
            os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
            or getattr(settings, "FIREBASE_SERVICE_ACCOUNT_JSON", "")
        )
        if sa_json and sa_json.strip():
            raw_str = sa_json.strip()
            if (raw_str.startswith('"') and raw_str.endswith('"')) or (
                raw_str.startswith("'") and raw_str.endswith("'")
            ):
                raw_str = raw_str[1:-1].strip()
            try:
                cred_dict = json.loads(raw_str)
                if isinstance(cred_dict, dict):
                    if "private_key" in cred_dict:
                        cred_dict["private_key"] = _clean_private_key(cred_dict["private_key"])
                    logger.info("Loaded Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON")
                    return credentials.Certificate(cred_dict)
            except Exception as e:
                logger.error(f"Failed parsing FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
                raise ValueError(f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

        # 2️⃣ Base64-encoded service account JSON string
        sa_b64 = (
            os.environ.get("FIREBASE_SERVICE_ACCOUNT_BASE64")
            or getattr(settings, "FIREBASE_SERVICE_ACCOUNT_BASE64", "")
        )
        if sa_b64 and sa_b64.strip():
            try:
                decoded = base64.b64decode(sa_b64.strip()).decode("utf-8")
                cred_dict = json.loads(decoded)
                if isinstance(cred_dict, dict):
                    if "private_key" in cred_dict:
                        cred_dict["private_key"] = _clean_private_key(cred_dict["private_key"])
                    logger.info("Loaded Firebase credentials from FIREBASE_SERVICE_ACCOUNT_BASE64")
                    return credentials.Certificate(cred_dict)
            except Exception as e:
                logger.error(f"Failed parsing FIREBASE_SERVICE_ACCOUNT_BASE64: {e}")
                raise ValueError(f"Invalid FIREBASE_SERVICE_ACCOUNT_BASE64: {e}")

        # 3️⃣ Individual service-account environment variables (Render standard)
        client_email = (
            os.environ.get("FIREBASE_CLIENT_EMAIL")
            or getattr(settings, "FIREBASE_CLIENT_EMAIL", "")
        ).strip()
        private_key_raw = (
            os.environ.get("FIREBASE_PRIVATE_KEY")
            or getattr(settings, "FIREBASE_PRIVATE_KEY", "")
        ).strip()
        project_id = (
            os.environ.get("FIREBASE_PROJECT_ID")
            or getattr(settings, "FIREBASE_PROJECT_ID", "")
            or "personalized-learning-a2477"
        ).strip()

        if client_email and private_key_raw:
            private_key = _clean_private_key(private_key_raw)
            cert_dict = {
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}",
            }
            pk_id = os.environ.get("FIREBASE_PRIVATE_KEY_ID", "").strip()
            if pk_id:
                cert_dict["private_key_id"] = pk_id
            c_id = os.environ.get("FIREBASE_CLIENT_ID", "").strip()
            if c_id:
                cert_dict["client_id"] = c_id

            try:
                logger.info(
                    f"Loaded Firebase credentials from individual env vars for project: {project_id}, client: {client_email}"
                )
                return credentials.Certificate(cert_dict)
            except Exception as e:
                logger.error(f"Failed creating Certificate from individual env vars: {e}")
                raise ValueError(f"Invalid Firebase private key or client email: {e}")

        # 4️⃣ Service account JSON file path (local development)
        sa_path = (
            os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
            or getattr(settings, "FIREBASE_SERVICE_ACCOUNT_PATH", "")
        ).strip()

        candidate_paths = []
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

        if sa_path:
            if os.path.isabs(sa_path):
                candidate_paths.append(sa_path)
            else:
                candidate_paths.append(os.path.join(project_root, sa_path))
                candidate_paths.append(os.path.abspath(sa_path))
        else:
            # Check standard development paths if present
            candidate_paths.append(os.path.join(project_root, "creds", "firebase-admin.json"))
            candidate_paths.append(os.path.join(project_root, "firebase-admin.json"))

        for path in candidate_paths:
            if path and os.path.isfile(path):
                try:
                    logger.info(f"Loaded Firebase credentials from file: {path}")
                    return credentials.Certificate(path)
                except Exception as e:
                    logger.error(f"Failed loading service account file at {path}: {e}")
                    raise

        # 5️⃣ Google Application Default Credentials
        gac = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        if gac and os.path.isfile(gac):
            try:
                logger.info(f"Loaded Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS: {gac}")
                return credentials.Certificate(gac)
            except Exception as e:
                logger.error(f"Failed loading GOOGLE_APPLICATION_CREDENTIALS: {e}")
                raise

        return None

    def _initialize_firebase(self):
        """Initializes Firebase Admin SDK and obtains a live Firestore client.
        Ensures initialization happens only once.
        Raises RuntimeError if credentials are missing or Firestore is unavailable.
        """
        # If the SDK was already initialized elsewhere, reuse it.
        if firebase_admin._apps:
            self.app = firebase_admin.get_app()
            try:
                self.db = firestore.client(app=self.app)
                logger.info("Reusing existing Firebase Admin app and Firestore client")
                return
            except Exception as e:
                logger.error(f"Could not connect to live Firestore with existing app: {e}")
                raise RuntimeError(f"Firestore client unavailable: {e}")

        cred = self._resolve_credentials()

        if not cred:
            err_msg = (
                "Firebase service-account credentials missing.\n"
                "Please configure one of the following under Render -> Environment:\n"
                "Option A (Recommended for Render):\n"
                "  - FIREBASE_PROJECT_ID\n"
                "  - FIREBASE_CLIENT_EMAIL\n"
                "  - FIREBASE_PRIVATE_KEY\n"
                "Option B (Single JSON variable):\n"
                "  - FIREBASE_SERVICE_ACCOUNT_JSON\n"
                "Option C (Local Development file):\n"
                "  - FIREBASE_SERVICE_ACCOUNT_PATH\n"
            )
            logger.error(err_msg)
            raise RuntimeError(
                "Firebase service-account credentials missing. Set FIREBASE_CLIENT_EMAIL, "
                "FIREBASE_PRIVATE_KEY, and FIREBASE_PROJECT_ID (or FIREBASE_SERVICE_ACCOUNT_JSON)."
            )

        project_id = (
            getattr(cred, "project_id", None)
            or os.environ.get("FIREBASE_PROJECT_ID")
            or getattr(settings, "FIREBASE_PROJECT_ID", "")
            or "personalized-learning-a2477"
        )

        try:
            self.app = firebase_admin.initialize_app(cred, {"projectId": project_id})
            self.db = firestore.client(app=self.app)
            logger.info("Firebase Admin SDK and Cloud Firestore initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin or Firestore client: {e}")
            raise RuntimeError(f"Firestore client unavailable: {e}")

    # -----------------------------------------------------------------
    # Authentication helpers
    # -----------------------------------------------------------------
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token and return decoded claims.
        Supports development bypass token: ``dev-token-<uid>``.
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
            return admin_auth.verify_id_token(token, check_revoked=False)
        except Exception as e:
            logger.warning(f"Firebase token verification failed: {e}")
            return None

    # -----------------------------------------------------------------
    # Firestore CRUD operations – requires live Firestore client.
    # -----------------------------------------------------------------
    def _require_db(self):
        if not self.db:
            raise RuntimeError(
                "Firestore client not initialized – check environment variables"
            )

    def set_document(self, collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Create or update a document in Firestore with merge=True."""
        self._require_db()
        try:
            self.db.collection(collection).document(doc_id).set(data, merge=True)
            return True
        except Exception as e:
            logger.error(f"Firestore set_document error in '{collection}/{doc_id}': {e}")
            raise

    def update_document(self, collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Update a document in Firestore with merge=True."""
        return self.set_document(collection, doc_id, data)

    def get_document(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single document from Firestore. Returns None if missing."""
        self._require_db()
        try:
            doc = self.db.collection(collection).document(doc_id).get()
            if doc.exists:
                data = doc.to_dict() or {}
                if "id" not in data:
                    data["id"] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Firestore get_document error in '{collection}/{doc_id}': {e}")
            raise

    def list_documents(
        self, collection: str, filters: Optional[Dict[str, Any]] = None
    ) -> list:
        """Return a list of documents, optionally filtered by field equality.
        Preserves student data isolation when filtering by student_id or uid.
        """
        self._require_db()
        try:
            query = self.db.collection(collection)
            if filters:
                for k, v in filters.items():
                    query = query.where(k, "==", v)
            return [{**(d.to_dict() or {}), "id": d.id} for d in query.stream()]
        except Exception as e:
            logger.error(f"Firestore list_documents error in '{collection}': {e}")
            raise

    def delete_document(self, collection: str, doc_id: str) -> bool:
        """Delete a document from Firestore. Returns True on success."""
        self._require_db()
        try:
            self.db.collection(collection).document(doc_id).delete()
            return True
        except Exception as e:
            logger.error(f"Firestore delete_document error in '{collection}/{doc_id}': {e}")
            raise


# Global singleton instance used throughout the project
firebase_manager = FirebaseManager()
