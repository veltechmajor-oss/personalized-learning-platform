import logging
from typing import List

logger = logging.getLogger(__name__)

def split_into_chunks(text: str, size: int = 500, overlap: int = 50) -> List[str]:
    """Split the given text into overlapping chunks.

    * ``size`` – maximum token count per chunk (roughly words).
    * ``overlap`` – number of tokens to overlap between consecutive chunks.
    Returns a list of string chunks.
    """
    if not text:
        return []
    words = text.split()
    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = start + size
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        start = end - overlap
    logger.debug("Created %d chunks (size=%d, overlap=%d)", len(chunks), size, overlap)
    return chunks

