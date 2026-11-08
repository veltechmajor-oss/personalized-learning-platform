"""
Qdrant vector database service for storing and retrieving document chunk vectors.
"""

import uuid
import logging
from typing import List, Dict, Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import UnexpectedResponse, ResponseHandlingException

from app.core.config import settings

logger = logging.getLogger(__name__)


class QdrantServiceError(Exception):
    """Base exception for Qdrant service errors."""
    pass


class QdrantAuthenticationError(QdrantServiceError):
    """Raised when Qdrant Cloud rejects credentials with HTTP 401 or 403."""
    pass


class QdrantCollectionNotFoundError(QdrantServiceError):
    """Raised when the specified collection is missing from Qdrant Cloud."""
    pass


class QdrantDimensionMismatchError(QdrantServiceError):
    """Raised when vector dimension in collection does not match embedding dimension."""
    pass


class QdrantConnectionError(QdrantServiceError):
    """Raised when unable to reach the Qdrant cluster (network / timeout)."""
    pass


class QdrantService:
    def __init__(self):
        self.collection_name = settings.effective_qdrant_collection
        self.client: Optional[QdrantClient] = None
        self._init_client()

    def _init_client(self):
        """Initialise the remote Qdrant client with safe validation."""
        url = settings.effective_qdrant_url
        api_key = settings.effective_qdrant_api_key
        self.collection_name = settings.effective_qdrant_collection

        if not url:
            logger.warning("QDRANT_URL is not set – Qdrant client unavailable")
            self.client = None
            return

        is_cloud = any(domain in url.lower() for domain in [".qdrant.io", ".qdrant.tech", "cloud.qdrant"])

        # Safe key masking for logging (never expose the key)
        if api_key:
            masked_key = f"{api_key[:4]}...{api_key[-4:]} (len: {len(api_key)})"
        else:
            masked_key = "MISSING"

        logger.info(
            "Connecting to Qdrant: url=%s, collection=%s, is_cloud=%s, api_key=%s",
            url,
            self.collection_name,
            is_cloud,
            masked_key,
        )

        if is_cloud and not api_key:
            logger.error(
                "CRITICAL: Qdrant Cloud cluster (%s) requires an API key, but QDRANT_API_KEY is not configured on Render. "
                "Vector operations will be rejected with HTTP 403 Forbidden until QDRANT_API_KEY is set in Render Environment variables.",
                url,
            )

        try:
            self.client = QdrantClient(
                url=url,
                api_key=api_key if api_key else None,
                timeout=15.0,
                check_compatibility=False,
            )
            self._ensure_collection()
            logger.info("Connected to Qdrant cluster successfully")
        except UnexpectedResponse as ur:
            if ur.status_code in (401, 403):
                logger.error(
                    "Qdrant Cloud authentication rejected (HTTP %d Forbidden). Please configure QDRANT_API_KEY in Render dashboard for cluster %s.",
                    ur.status_code,
                    url,
                )
            else:
                logger.error("Failed to connect to Qdrant: %s", ur)
        except Exception as e:
            logger.error("Failed to connect to Qdrant: %s", e)

    def _ensure_collection(self):
        """Ensure collection exists and has matching vector dimensions without destroying existing data."""
        if not self.client:
            return
        try:
            collections = self.client.get_collections().collections
            names = [c.name for c in collections]
            if self.collection_name not in names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=768,
                        distance=qmodels.Distance.COSINE,
                    ),
                )
                logger.info("Created Qdrant collection: %s (size=768, distance=Cosine)", self.collection_name)
            else:
                # Inspect existing collection
                info = self.client.get_collection(self.collection_name)
                v_cfg = info.config.params.vectors
                dim = getattr(v_cfg, "size", None)
                points = getattr(info, "points_count", 0)
                logger.info(
                    "Verified existing Qdrant collection '%s': points=%d, vector_dimension=%s",
                    self.collection_name,
                    points,
                    dim,
                )
                if dim is not None and dim != 768:
                    logger.error(
                        "DIMENSION MISMATCH: Qdrant collection '%s' vector dimension is %d, expected 768",
                        self.collection_name,
                        dim,
                    )

            # Ensure payload indexes exist for document_id and student_id
            for field in ["document_id", "student_id"]:
                try:
                    self.client.create_payload_index(
                        collection_name=self.collection_name,
                        field_name=field,
                        field_schema=qmodels.PayloadSchemaType.KEYWORD,
                    )
                except Exception:
                    pass
        except UnexpectedResponse as ur:
            if ur.status_code in (401, 403):
                raise QdrantAuthenticationError(
                    f"Qdrant Cloud authentication rejected (HTTP {ur.status_code} Forbidden). Check QDRANT_API_KEY."
                ) from ur
            raise
        except Exception as e:
            logger.warning("Error ensuring Qdrant collection: %s", e)

    def check_health(self) -> Dict[str, Any]:
        """
        Safe startup and runtime health probe. Never exposes raw API keys.
        Distinguishes authentication, missing collection, dimension mismatch, and connection failures.
        """
        url = settings.effective_qdrant_url
        api_key = settings.effective_qdrant_api_key
        has_key = bool(api_key)
        masked_key = f"{api_key[:4]}...{api_key[-4:]}" if has_key else "NONE"

        diag = {
            "cluster_url": url,
            "collection": self.collection_name,
            "api_key_configured": has_key,
            "api_key_masked": masked_key,
            "status": "UNKNOWN",
            "message": "",
            "points_count": 0,
            "vector_dimension": 0,
        }

        if not self.client:
            self._init_client()

        if not self.client:
            diag["status"] = "NOT_INITIALIZED"
            diag["message"] = "Qdrant client could not be initialized. Check QDRANT_URL and network."
            return diag

        try:
            cols = self.client.get_collections()
            names = [c.name for c in cols.collections]

            if self.collection_name not in names:
                diag["status"] = "COLLECTION_NOT_FOUND"
                diag["message"] = f"Collection '{self.collection_name}' not found. Available collections: {names}"
                return diag

            info = self.client.get_collection(self.collection_name)
            v_cfg = info.config.params.vectors
            dim = getattr(v_cfg, "size", None)
            points = getattr(info, "points_count", 0)

            diag["points_count"] = points
            diag["vector_dimension"] = dim

            if dim is not None and dim != 768:
                diag["status"] = "DIMENSION_MISMATCH"
                diag["message"] = f"Vector dimension mismatch: collection has {dim}, system requires 768."
                return diag

            diag["status"] = "HEALTHY"
            diag["message"] = f"Connected to collection '{self.collection_name}' ({points} points indexed, dim=768)."
            return diag

        except UnexpectedResponse as ur:
            if ur.status_code in (401, 403):
                diag["status"] = "AUTHENTICATION_FAILED"
                diag["message"] = (
                    f"HTTP {ur.status_code} Forbidden: Qdrant Cloud rejected authentication. "
                    "Please set QDRANT_API_KEY in Render environment variables."
                )
            elif ur.status_code == 404:
                diag["status"] = "COLLECTION_NOT_FOUND"
                diag["message"] = f"HTTP 404: Collection '{self.collection_name}' not found in Qdrant cluster."
            else:
                diag["status"] = "UNEXPECTED_RESPONSE"
                diag["message"] = f"HTTP {ur.status_code}: {ur.content}"
            return diag
        except Exception as e:
            err_str = str(e)
            if "ConnectError" in err_str or "timeout" in err_str.lower():
                diag["status"] = "CONNECTION_FAILED"
                diag["message"] = f"Cannot reach Qdrant cluster: {err_str}"
            else:
                diag["status"] = "ERROR"
                diag["message"] = f"Qdrant health check error: {err_str}"
            return diag

    def upsert_chunks(
        self,
        document_id: str,
        student_id: str,
        source_name: str,
        chunks: List[Dict[str, Any]],
        vectors: List[List[float]],
    ) -> bool:
        """Store chunk vectors and payloads in Qdrant."""
        if not self.client:
            self._init_client()
        if not self.client:
            raise RuntimeError("Qdrant client not available for upsert")

        points = []
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            point_id = str(uuid.uuid4())
            payload = {
                "document_id": document_id,
                "student_id": student_id,
                "source": source_name,
                "chunk_index": chunk.get("chunk_index", i),
                "text": chunk.get("content", ""),
                "page_number": chunk.get("page_number", 1),
                "section_name": chunk.get("section_name", ""),
            }
            points.append(
                qmodels.PointStruct(id=point_id, vector=vector, payload=payload)
            )
        try:
            self.client.upsert(collection_name=self.collection_name, points=points)
            return True
        except Exception as e:
            logger.error(f"Qdrant upsert failed: {e}")
            raise

    def search_similar(
        self,
        query_vector: List[float],
        student_id: str,
        document_id: Optional[str] = None,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """Retrieve the most relevant chunks, optionally filtered by document_id and student isolation."""
        if not self.client:
            self._init_client()
        if not self.client:
            raise QdrantConnectionError("Qdrant client not available for search. Check cluster URL and API key.")

        api_key = settings.effective_qdrant_api_key
        url = settings.effective_qdrant_url
        is_cloud = any(d in url.lower() for d in [".qdrant.io", ".qdrant.tech", "cloud.qdrant"])
        if is_cloud and not api_key:
            raise QdrantAuthenticationError(
                "QDRANT_API_KEY is missing or empty in Render service environment variables. "
                "Qdrant Cloud requires a valid API key to execute vector searches."
            )

        results = []
        try:
            must_conditions = []
            if document_id:
                must_conditions.append(
                    qmodels.FieldCondition(
                        key="document_id", match=qmodels.MatchValue(value=document_id)
                    )
                )

            should_conditions = [
                qmodels.FieldCondition(
                    key="student_id", match=qmodels.MatchValue(value=student_id)
                ),
                qmodels.FieldCondition(
                    key="student_id", match=qmodels.MatchValue(value="shared_curriculum")
                ),
            ]

            query_filter = qmodels.Filter(
                must=must_conditions if must_conditions else None,
                should=should_conditions if not document_id else None,
            )

            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
            )

            for hit in response.points:
                payload = hit.payload or {}
                hit_score = round(float(hit.score), 4) if hit.score is not None else 0.0
                results.append(
                    {
                        "text": payload.get("text") or "",
                        "source": payload.get("source") or "Study Material",
                        "document_id": payload.get("document_id") or "",
                        "chunk_index": int(payload.get("chunk_index") or 0),
                        "page_number": int(payload.get("page_number") or 1),
                        "score": hit_score,
                    }
                )
            return results
        except UnexpectedResponse as ur:
            if ur.status_code in (401, 403):
                logger.error(
                    "Qdrant Cloud search query rejected (HTTP %d Forbidden). Check QDRANT_API_KEY on Render for cluster %s.",
                    ur.status_code,
                    url,
                )
                raise QdrantAuthenticationError(
                    f"Qdrant Cloud authentication failed (HTTP {ur.status_code} Forbidden). "
                    f"Please verify that QDRANT_API_KEY is configured in Render environment variables for cluster {url}."
                ) from ur
            elif ur.status_code == 404:
                raise QdrantCollectionNotFoundError(
                    f"Qdrant collection '{self.collection_name}' not found (HTTP 404)."
                ) from ur
            else:
                logger.error(f"Qdrant search unexpected response: {ur}")
                raise
        except Exception as e:
            if "dimension" in str(e).lower():
                raise QdrantDimensionMismatchError(f"Vector search dimension mismatch: {e}") from e
            logger.error(f"Qdrant search failed: {e}")
            raise

    def delete_document_chunks(self, document_id: str) -> bool:
        """Remove all vector chunks for a specific document."""
        if not self.client:
            self._init_client()
        if not self.client:
            raise RuntimeError("Qdrant client not available for deletion")
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="document_id",
                                match=qmodels.MatchValue(value=document_id),
                            )
                        ]
                    )
                ),
            )
            return True
        except Exception as e:
            logger.error(f"Qdrant chunk deletion failed: {e}")
            raise

    def count_document_chunks(self, document_id: str) -> int:
        """Count how many points are indexed for a document in Qdrant."""
        if not self.client:
            self._init_client()
        if not self.client:
            return 0
        try:
            res = self.client.count(
                collection_name=self.collection_name,
                count_filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="document_id",
                            match=qmodels.MatchValue(value=document_id),
                        )
                    ]
                ),
                exact=True,
            )
            return res.count
        except Exception as e:
            logger.warning(f"Failed to count chunks for document {document_id}: {e}")
            return 0


qdrant_service = QdrantService()
