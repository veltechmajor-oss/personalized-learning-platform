"""
Qdrant vector database service for storing and retrieving document chunk vectors.
"""

import uuid
import logging
from typing import List, Dict, Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import settings

logger = logging.getLogger(__name__)


class QdrantService:
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION or "learning_materials"
        self.client: Optional[QdrantClient] = None
        self._init_client()
        if not self.client:
            logger.warning(
                "Qdrant client could not be initialized at startup – checking QDRANT_URL and API key"
            )

    def _init_client(self):
        """Initialise the remote Qdrant client."""
        if settings.QDRANT_URL:
            try:
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                    timeout=15.0,
                )
                self._ensure_collection()
                logger.info("Connected to Qdrant cluster successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Qdrant: {e}")
                self.client = None

    def _ensure_collection(self):
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
                logger.info(f"Created Qdrant collection: {self.collection_name}")

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
        except Exception as e:
            logger.warning(f"Error ensuring Qdrant collection: {e}")

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
            raise RuntimeError("Qdrant client not available for search")

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
                results.append(
                    {
                        "text": payload.get("text", ""),
                        "source": payload.get("source", "Study Material"),
                        "document_id": payload.get("document_id", ""),
                        "chunk_index": payload.get("chunk_index", 0),
                        "page_number": payload.get("page_number", 1),
                        "score": round(hit.score, 4),
                    }
                )
            return results
        except Exception as e:
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
