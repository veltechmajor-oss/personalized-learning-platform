import os
import logging
from pathlib import Path

from pdfminer.high_level import extract_text as pdf_extract
import docx

logger = logging.getLogger(__name__)

def extract_text(file_path: str) -> str:
    """Extract raw text from a PDF, DOCX, or TXT file.

    Returns the extracted string, or raises RuntimeError on failure.
    """
    ext = Path(file_path).suffix.lower()
    try:
        if ext == ".pdf":
            return pdf_extract(file_path)
        if ext == ".docx":
            document = docx.Document(file_path)
            return "\n".join(p.text for p in document.paragraphs)
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        raise ValueError(f"Unsupported file type: {ext}")
    except Exception as e:
        logger.error("Failed to extract text from %s: %s", file_path, e)
        raise RuntimeError("Text extraction failed")

