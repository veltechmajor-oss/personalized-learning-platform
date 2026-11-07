"""
RAG Service orchestrating document retrieval via Qdrant and embeddings.
Performs semantic filtering, deduplication, and evidence evaluation.
"""
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service

logger = logging.getLogger(__name__)


class RAGService:
    async def retrieve_relevant_contexts(
        self,
        query: str,
        student_id: str,
        document_id: Optional[str] = None,
        top_k: int = 4
    ) -> Tuple[List[Dict[str, Any]], bool, str]:
        """
        Embed the student question and retrieve relevant chunks from Qdrant.
        Strictly isolates retrieval to document_id (when provided) and student_id.
        Deduplicates overlapping passages and evaluates evidence sufficiency.

        Returns: (filtered_chunks, is_sufficient_context, preliminary_evidence_hint)
        """
        if not query.strip():
            return [], False, "EMPTY_QUERY"

        # 1. Generate 768-dim embedding for the full query
        query_vector = embedding_service.embed_query(query)

        # 2. Retrieve top-k similar chunks filtered by document_id and student_id
        raw_chunks = qdrant_service.search_similar(
            query_vector=query_vector,
            student_id=student_id,
            document_id=document_id,
            top_k=top_k * 2  # fetch slightly more to allow deduplication
        )

        if not raw_chunks:
            return [], False, "NO_MATCHES"

        # 3. Deduplicate and filter out low relevance chunks
        seen_texts = set()
        deduped_chunks = []

        for c in raw_chunks:
            text = (c.get("text") or "").strip()
            if not text:
                continue

            # Normalized fingerprint for deduplication
            norm_fingerprint = re.sub(r"\s+", " ", text[:120].lower())
            if norm_fingerprint in seen_texts:
                continue
            seen_texts.add(norm_fingerprint)
            deduped_chunks.append(c)

        # Truncate to desired top_k
        final_chunks = deduped_chunks[:top_k]

        if not final_chunks:
            return [], False, "INSUFFICIENT"

        # 4. Evidence quality assessment
        # Check if chunks contain actual explanatory prose or only question prompts / topic labels
        has_substantive_prose = False
        total_substantive_words = 0

        for c in final_chunks:
            t = c.get("text", "").strip()
            # Split into lines
            lines = [l.strip() for l in t.split("\n") if l.strip()]
            for line in lines:
                # If a line is longer than 50 chars and doesn't end with ?, it's likely expository
                if len(line) > 50 and not line.endswith("?"):
                    words = len(line.split())
                    total_substantive_words += words
                    if total_substantive_words >= 35:
                        has_substantive_prose = True
                        break

        best_score = final_chunks[0].get("score", 0.0)

        if has_substantive_prose and best_score >= 0.50:
            evidence_hint = "SUFFICIENT"
            is_sufficient = True
        elif total_substantive_words > 15 or best_score >= 0.60:
            evidence_hint = "PARTIAL"
            is_sufficient = True
        else:
            evidence_hint = "INSUFFICIENT"
            is_sufficient = False

        return final_chunks, is_sufficient, evidence_hint


rag_service = RAGService()
