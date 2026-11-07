"""
Document extraction and text processing service supporting PDF, DOCX, and TXT files.
Includes robust extraction for paragraphs, tables, headings, and question lists.
"""
import io
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
import pypdf
import docx

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB limit


class DocumentService:
    @staticmethod
    def validate_file(filename: str, content: bytes) -> Tuple[bool, str]:
        """Validate file extension and size."""
        if not filename:
            return False, "File name cannot be empty."

        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in SUPPORTED_EXTENSIONS:
            return False, f"Unsupported file extension '{ext}'. Allowed: .pdf, .docx, .txt"

        if len(content) > MAX_FILE_SIZE_BYTES:
            return False, f"File size exceeds 25 MB limit. Received {len(content) / (1024*1024):.1f} MB."

        if len(content) == 0:
            return False, "Uploaded file is empty."

        return True, ""

    @staticmethod
    def extract_text(filename: str, content: bytes) -> Tuple[str, Dict[str, Any]]:
        """Extract clean text and structural metadata from PDF, DOCX, or TXT.

        Preserves paragraphs, tables, numbered lists, and sections.
        """
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        text = ""
        meta: Dict[str, Any] = {
            "page_count": None,
            "paragraph_count": 0,
            "table_count": 0,
            "section_count": 1,
            "char_count": 0,
            "is_scanned_pdf": False,
        }

        try:
            if ext == ".txt":
                try:
                    text = content.decode("utf-8")
                except UnicodeDecodeError:
                    text = content.decode("latin-1", errors="replace")
                meta["paragraph_count"] = len([p for p in text.split("\n\n") if p.strip()])
                meta["page_count"] = None

            elif ext == ".docx":
                doc = docx.Document(io.BytesIO(content))
                elements = []

                # 1. Paragraphs (headings, lists, text)
                para_count = 0
                for p in doc.paragraphs:
                    p_text = p.text.strip()
                    if p_text:
                        elements.append(p_text)
                        para_count += 1
                meta["paragraph_count"] = para_count

                # 2. Tables (including single-column question lists or tabular data)
                table_count = len(doc.tables)
                meta["table_count"] = table_count
                for table in doc.tables:
                    for row in table.rows:
                        # Extract cells, avoiding duplicate merged cells
                        cells = [c.text.strip().replace("\r\n", " ").replace("\n", " ") for c in row.cells if c.text.strip()]
                        unique_cells = []
                        for c in cells:
                            if not unique_cells or c != unique_cells[-1]:
                                unique_cells.append(c)
                        if unique_cells:
                            row_text = " | ".join(unique_cells)
                            elements.append(row_text)

                meta["section_count"] = len(doc.sections) if hasattr(doc, "sections") else 1
                meta["page_count"] = None  # Do NOT invent page counts for DOCX!
                text = "\n\n".join(elements)

            elif ext == ".pdf":
                reader = pypdf.PdfReader(io.BytesIO(content))
                page_count = len(reader.pages)
                meta["page_count"] = page_count
                extracted_pages = []
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        extracted_pages.append(page_text.strip())
                text = "\n\n".join(extracted_pages)
                meta["paragraph_count"] = len([p for p in text.split("\n\n") if p.strip()])

                # Detection for scanned PDFs with no text layer
                if len(text.strip()) < 50 and meta["page_count"] > 0:
                    meta["is_scanned_pdf"] = True
                    text = (
                        "[Notice: Text extraction produced minimal content. "
                        "This document appears to be an image-only or scanned PDF without an embedded OCR text layer.]"
                    )

        except Exception as e:
            logger.error(f"Error parsing document {filename}: {e}")
            raise ValueError(f"Could not parse document contents: {str(e)}")

        # Normalize whitespace
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = text.strip()

        meta["char_count"] = len(text)
        if len(text) < 15:
            raise ValueError(f"Extracted content from '{filename}' is empty or unreadable.")

        return text, meta

    @staticmethod
    def extract_topics(text: str) -> List[str]:
        """Identify key topics, headings, and conceptual themes from the document."""
        if not text:
            return ["Overview", "Key Concepts"]

        topics = []
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # Strategy 1: Formal headings
        for line in lines:
            is_heading = False
            # Numbered headings: 1. Introduction, 2.1 Neural Networks
            if re.match(r"^(\d+(\.\d+)*|[A-Z]\.)\s+[A-Z]", line) and len(line) < 80:
                is_heading = True
            # Markdown headings: # Topic, ## Topic
            elif line.startswith("#") and len(line) < 80:
                line = re.sub(r"^#+\s*", "", line)
                is_heading = True
            # Short lines in Title Case or ALL CAPS
            elif (line.isupper() or line.istitle()) and 5 < len(line) < 60 and not line.endswith((".", "?")):
                is_heading = True
            # Bold labels like "Topic:", "Module 1:", "Unit 1:"
            elif re.match(r"^(Topic|Module|Unit|Chapter|Section)\s*\d*:", line, re.IGNORECASE) and len(line) < 80:
                is_heading = True

            if is_heading:
                clean = re.sub(r"^[\d\.\-\#\*\s]+", "", line).strip()
                if clean and len(clean) > 3 and clean not in topics:
                    topics.append(clean)

        # Strategy 2: If document is composed of questions without formal headings (e.g. question bank)
        if len(topics) < 2:
            for line in lines:
                # Strip leading numbers/bullets
                clean = re.sub(r"^[\d\.\-\#\*\s]+(Q(uestion)?\s*\d*[:\.]\s*)?", "", line).strip()
                # Remove question command verbs to extract underlying topic
                topic_candidate = re.sub(
                    r"^(What is|What are|Define|Describe|Explain|Discuss|Illustrate|Summarize|Apply the concept of|Apply|Demonstrate how|Demonstrate|Find the|Why is|How does|How do|Compare)\s+(the\s+)?",
                    "",
                    clean,
                    flags=re.IGNORECASE
                ).strip()
                topic_candidate = re.sub(r"[\?\.\:]+$", "", topic_candidate).strip()

                # Trim clause qualifiers to get clean concise topic
                if len(topic_candidate) > 60:
                    topic_candidate = re.split(r"\s+(along with|including|in a text|applied for|in multilingual|in neural)\s+", topic_candidate, flags=re.IGNORECASE)[0].strip()

                if 4 < len(topic_candidate) < 70 and topic_candidate not in topics:
                    topics.append(topic_candidate)

        # Strategy 3: Paragraph sentence fallback
        if len(topics) < 2:
            paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
            for p in paragraphs[:5]:
                first_sent = p.split(".")[0].strip()
                if 5 < len(first_sent) < 60 and first_sent not in topics:
                    topics.append(first_sent)

        return topics[:15] if topics else ["General Overview", "Core Concepts"]

    @staticmethod
    def extract_questions(text: str) -> Dict[str, List[str]]:
        """
        Extract explicit questions from document and generate important conceptual questions.
        Returns {'extracted': [...], 'suggested': [...]}
        """
        extracted = []
        suggested = []

        lines = [line.strip() for line in text.split("\n") if line.strip()]

        for line in lines:
            clean_line = re.sub(r"^[\d\.\-\#\*\s]+(Q(uestion)?\s*\d*[:\.]\s*)?", "", line).strip()

            # 1. Explicit questions ending in '?'
            if line.endswith("?") and 10 < len(clean_line) < 250:
                if clean_line and clean_line not in extracted:
                    extracted.append(clean_line)

            # 2. Question statements starting with imperatives (Define, Describe, Explain, etc.)
            elif re.match(r"^(What|How|Why|Explain|Describe|Compare|Define|Discuss|Analyze|Illustrate|Summarize|Demonstrate|Apply)\b", clean_line, re.IGNORECASE) and 12 < len(clean_line) < 250:
                formatted_q = clean_line if clean_line.endswith(("?", ".")) else clean_line + "?"
                if formatted_q not in extracted:
                    extracted.append(formatted_q)

        # 3. High-yield conceptual questions synthesized from topics
        topics = DocumentService.extract_topics(text)
        for t in topics[:6]:
            q = f"What are the fundamental principles and mechanisms of {t}?"
            if q not in extracted and q not in suggested:
                suggested.append(q)

        return {
            "extracted": extracted[:20],
            "suggested": suggested[:10]
        }

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict[str, Any]]:
        """Divide text into meaningful overlapping chunks.

        Avoids empty chunks and preserves sentence/question integrity.
        """
        if not text:
            return []

        # If text is composed of distinct paragraphs or question blocks, chunk by blocks
        blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
        chunks = []

        current_content = []
        current_len = 0
        chunk_idx = 0

        for block in blocks:
            block_len = len(block)
            if current_len + block_len > chunk_size and current_content:
                chunk_str = "\n\n".join(current_content).strip()
                if chunk_str:
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "content": chunk_str,
                        "char_count": len(chunk_str),
                        "section_name": f"Section {chunk_idx + 1}"
                    })
                    chunk_idx += 1
                # Overlap: keep the last block if it's small enough
                if len(current_content[-1]) < overlap:
                    current_content = [current_content[-1], block]
                    current_len = len(current_content[0]) + block_len
                else:
                    current_content = [block]
                    current_len = block_len
            else:
                current_content.append(block)
                current_len += block_len

        if current_content:
            chunk_str = "\n\n".join(current_content).strip()
            if chunk_str:
                chunks.append({
                    "chunk_index": chunk_idx,
                    "content": chunk_str,
                    "char_count": len(chunk_str),
                    "section_name": f"Section {chunk_idx + 1}"
                })

        # Fallback to sliding window if block-chunking yielded 0 chunks (e.g. single giant paragraph)
        if not chunks:
            start = 0
            text_len = len(text)
            while start < text_len:
                end = min(start + chunk_size, text_len)
                if end < text_len:
                    last_punct = max(text.rfind(". ", start, end), text.rfind("\n", start, end))
                    if last_punct != -1 and last_punct > start + (chunk_size // 2):
                        end = last_punct + 1
                chunk_str = text[start:end].strip()
                if chunk_str:
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "content": chunk_str,
                        "char_count": len(chunk_str),
                        "section_name": f"Section {chunk_idx + 1}"
                    })
                    chunk_idx += 1
                if end >= text_len:
                    break
                start = max(end - overlap, start + 1)

        return chunks


document_service = DocumentService()
