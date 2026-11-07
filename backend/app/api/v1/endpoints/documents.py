from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import shutil
import uuid
import datetime
import logging
from app.core.security import get_current_user, AuthenticatedUser
from app.core.firebase import firebase_manager
from app.core.cloudinary import upload_file
from app.services.document_service import document_service
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Permanent local storage fallback if Cloudinary credentials have restricted permissions
LOCAL_STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "uploads", "documents"))
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)


class QuestionCategories(BaseModel):
    extracted: List[str] = []
    suggested: List[str] = []


class DocumentItem(BaseModel):
    id: str
    document_id: Optional[str] = None
    student_id: str
    user_id: Optional[str] = None
    filename: str
    file_type: str
    subject: str
    topic: str
    uploaded_at: str
    page_count: int
    chunk_count: int
    char_count: int
    status: str
    processing_status: str
    cloudinary_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    topics: List[str] = []
    questions: Optional[Dict[str, List[str]]] = None
    error_message: Optional[str] = None
    is_scanned: bool = False


@router.post("/upload", response_model=DocumentItem)
async def upload_document(
    file: UploadFile = File(...),
    subject: str = Form("General Studies"),
    topic: str = Form("Course Notes"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    content = await file.read()
    filename = file.filename or "uploaded_document.txt"
    file_ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".txt"

    # 1. Validate file extension and size
    is_valid, error_msg = document_service.validate_file(filename, content)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    doc_id = str(uuid.uuid4())
    uploaded_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Initial document record with UPLOADING status
    initial_doc = {
        "id": doc_id,
        "document_id": doc_id,
        "student_id": current_user.uid,
        "user_id": current_user.uid,
        "filename": filename,
        "file_type": file_ext,
        "subject": subject,
        "topic": topic,
        "uploaded_at": uploaded_at,
        "page_count": 0,
        "chunk_count": 0,
        "char_count": len(content),
        "status": "UPLOADING",
        "processing_status": "UPLOADING",
        "cloudinary_url": None,
        "cloudinary_public_id": None,
        "topics": [],
        "questions": {"extracted": [], "suggested": []},
        "error_message": None,
        "is_scanned": False,
        "updated_at": uploaded_at,
    }
    firebase_manager.set_document("documents", doc_id, initial_doc)

    tmp_path = None
    try:
        # Step 1: Upload to Cloudinary (with local persistence fallback)
        tmp_dir = "tmp_uploads"
        os.makedirs(tmp_dir, exist_ok=True)
        tmp_path = os.path.join(tmp_dir, f"{doc_id}_{filename}")
        with open(tmp_path, "wb") as f:
            f.write(content)

        cloudinary_url = None
        cloudinary_public_id = None

        try:
            cloud_res = upload_file(tmp_path, public_id=doc_id, resource_type="raw")
            cloudinary_url = cloud_res.get("secure_url")
            cloudinary_public_id = cloud_res.get("public_id")
            logger.info("Cloudinary upload succeeded: %s", cloudinary_url)
        except Exception as cloud_err:
            logger.warning(
                "Cloudinary upload encountered an issue (%s). Preserving original file locally in %s.",
                cloud_err,
                LOCAL_STORAGE_DIR
            )
            # Save original document permanently in local storage
            local_permanent_path = os.path.join(LOCAL_STORAGE_DIR, f"{doc_id}_{filename}")
            shutil.copyfile(tmp_path, local_permanent_path)
            cloudinary_url = f"/uploads/documents/{doc_id}_{filename}"
            cloudinary_public_id = f"local_{doc_id}"

        # Update status: CLOUDINARY_STORED
        firebase_manager.update_document("documents", doc_id, {
            "status": "CLOUDINARY_STORED",
            "processing_status": "CLOUDINARY_STORED",
            "cloudinary_url": cloudinary_url,
            "cloudinary_public_id": cloudinary_public_id,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })

        # Step 2: Extract text and structural metadata
        firebase_manager.update_document("documents", doc_id, {
            "status": "EXTRACTING",
            "processing_status": "EXTRACTING",
        })
        extracted_text, meta = document_service.extract_text(filename, content)

        if not extracted_text or len(extracted_text.strip()) < 10:
            raise ValueError("Document contains empty or unreadable content.")

        # Identify topics and questions
        extracted_topics = document_service.extract_topics(extracted_text)
        extracted_questions = document_service.extract_questions(extracted_text)

        # Step 3: Chunk
        firebase_manager.update_document("documents", doc_id, {
            "status": "CHUNKING",
            "processing_status": "CHUNKING",
        })
        chunks = document_service.chunk_text(extracted_text, chunk_size=600, overlap=120)

        # Step 4: Embed
        firebase_manager.update_document("documents", doc_id, {
            "status": "EMBEDDING",
            "processing_status": "EMBEDDING",
        })
        chunk_texts = [c["content"] for c in chunks]
        vectors = embedding_service.embed_documents(chunk_texts)

        # Step 5: Index into Qdrant
        firebase_manager.update_document("documents", doc_id, {
            "status": "INDEXING",
            "processing_status": "INDEXING",
        })
        if chunks and vectors:
            qdrant_service.upsert_chunks(
                document_id=doc_id,
                student_id=current_user.uid,
                source_name=filename,
                chunks=chunks,
                vectors=vectors,
            )

        # Step 6: Ready
        real_chunk_count = qdrant_service.count_document_chunks(doc_id)
        final_doc_data = {
            "id": doc_id,
            "document_id": doc_id,
            "student_id": current_user.uid,
            "user_id": current_user.uid,
            "filename": filename,
            "file_type": file_ext,
            "subject": subject,
            "topic": topic,
            "uploaded_at": uploaded_at,
            "page_count": meta.get("page_count", 1) if meta.get("page_count") is not None else 1,
            "chunk_count": real_chunk_count if real_chunk_count > 0 else len(chunks),
            "char_count": len(extracted_text),
            "status": "READY",
            "processing_status": "READY",
            "is_scanned": meta.get("is_scanned_pdf", False),
            "cloudinary_url": cloudinary_url,
            "cloudinary_public_id": cloudinary_public_id,
            "topics": extracted_topics,
            "questions": extracted_questions,
            "error_message": None,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        firebase_manager.set_document("documents", doc_id, final_doc_data)

        # Step 6: Record learning activity
        activity_id = str(uuid.uuid4())
        firebase_manager.set_document("activities", activity_id, {
            "id": activity_id,
            "student_id": current_user.uid,
            "type": "document_upload",
            "title": f"Indexed '{filename}' ({len(chunks)} chunks)",
            "subject": subject,
            "topic": topic,
            "timestamp": uploaded_at
        })

        return DocumentItem(**final_doc_data)

    except Exception as e:
        logger.error("Document upload/processing failed: %s", e)
        failed_data = {
            "id": doc_id,
            "document_id": doc_id,
            "student_id": current_user.uid,
            "user_id": current_user.uid,
            "filename": filename,
            "file_type": file_ext,
            "subject": subject,
            "topic": topic,
            "uploaded_at": uploaded_at,
            "page_count": 0,
            "chunk_count": 0,
            "char_count": len(content),
            "status": "FAILED",
            "processing_status": "FAILED",
            "cloudinary_url": None,
            "cloudinary_public_id": None,
            "topics": [],
            "questions": {"extracted": [], "suggested": []},
            "error_message": str(e),
            "is_scanned": False,
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        firebase_manager.set_document("documents", doc_id, failed_data)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


@router.get("", response_model=List[DocumentItem])
async def list_student_documents(current_user: AuthenticatedUser = Depends(get_current_user)):
    docs = firebase_manager.list_documents("documents", filters={"student_id": current_user.uid})
    # If admin, can also view all
    if not docs and current_user.role == "admin":
        docs = firebase_manager.list_documents("documents")

    items = []
    for d in docs:
        doc_id = d.get("id") or d.get("document_id") or ""
        raw_status = (d.get("status") or d.get("processing_status") or "READY").upper()
        if raw_status in ["PROCESSED", "INDEXED", "SUCCESS"]:
            raw_status = "READY"

        chunk_c = d.get("chunk_count", 0)
        if chunk_c == 0 and raw_status == "READY":
            try:
                qc = qdrant_service.count_document_chunks(doc_id)
                if qc > 0:
                    chunk_c = qc
            except Exception:
                pass

        items.append(
            DocumentItem(
                id=doc_id,
                document_id=doc_id,
                student_id=d.get("student_id") or d.get("user_id") or current_user.uid,
                user_id=d.get("user_id") or d.get("student_id") or current_user.uid,
                filename=d.get("filename", "Untitled Document"),
                file_type=d.get("file_type", ".pdf"),
                subject=d.get("subject", "General Studies"),
                topic=d.get("topic", "Course Notes"),
                uploaded_at=d.get("uploaded_at", ""),
                page_count=d.get("page_count", 1) if d.get("page_count") is not None else 1,
                chunk_count=chunk_c,
                char_count=d.get("char_count", 0),
                status=raw_status,
                processing_status=raw_status,
                cloudinary_url=d.get("cloudinary_url"),
                cloudinary_public_id=d.get("cloudinary_public_id"),
                topics=d.get("topics", []),
                questions=d.get("questions") or {"extracted": [], "suggested": []},
                error_message=d.get("error_message"),
                is_scanned=d.get("is_scanned", False)
            )
        )
    return items


@router.post("/{doc_id}/retry", response_model=DocumentItem)
async def retry_document_processing(
    doc_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    d = firebase_manager.get_document("documents", doc_id)
    if not d:
        raise HTTPException(status_code=404, detail="Document not found.")

    if d.get("student_id") != current_user.uid and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to document.")

    filename = d.get("filename", "")
    candidate_paths = [
        os.path.join(LOCAL_STORAGE_DIR, f"{doc_id}_{filename}"),
        os.path.join("tmp_uploads", f"{doc_id}_{filename}"),
    ]
    file_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            file_path = p
            break

    if not file_path and os.path.exists("tmp_uploads"):
        for f in os.listdir("tmp_uploads"):
            if doc_id in f or (filename and filename in f):
                file_path = os.path.join("tmp_uploads", f)
                break

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=400,
            detail="Original document file not found on server for retry. Please upload the file again."
        )

    with open(file_path, "rb") as f:
        content = f.read()

    # Re-run pipeline
    firebase_manager.update_document("documents", doc_id, {
        "status": "EXTRACTING",
        "processing_status": "EXTRACTING",
        "error_message": None,
    })
    extracted_text, meta = document_service.extract_text(filename, content)
    if not extracted_text or len(extracted_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Document text could not be extracted.")

    extracted_topics = document_service.extract_topics(extracted_text)
    extracted_questions = document_service.extract_questions(extracted_text)

    firebase_manager.update_document("documents", doc_id, {
        "status": "CHUNKING",
        "processing_status": "CHUNKING",
    })
    chunks = document_service.chunk_text(extracted_text, chunk_size=600, overlap=120)

    firebase_manager.update_document("documents", doc_id, {
        "status": "EMBEDDING",
        "processing_status": "EMBEDDING",
    })
    chunk_texts = [c["content"] for c in chunks]
    vectors = embedding_service.embed_documents(chunk_texts)

    firebase_manager.update_document("documents", doc_id, {
        "status": "INDEXING",
        "processing_status": "INDEXING",
    })
    if chunks and vectors:
        qdrant_service.upsert_chunks(
            document_id=doc_id,
            student_id=d.get("student_id") or current_user.uid,
            source_name=filename,
            chunks=chunks,
            vectors=vectors,
        )

    real_chunk_count = qdrant_service.count_document_chunks(doc_id)
    final_data = {
        "id": doc_id,
        "document_id": doc_id,
        "student_id": d.get("student_id") or current_user.uid,
        "user_id": d.get("student_id") or current_user.uid,
        "filename": filename,
        "file_type": d.get("file_type", ".docx"),
        "subject": d.get("subject", "General Studies"),
        "topic": d.get("topic", "Course Notes"),
        "uploaded_at": d.get("uploaded_at") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "page_count": meta.get("page_count", 1) if meta.get("page_count") is not None else 1,
        "chunk_count": real_chunk_count if real_chunk_count > 0 else len(chunks),
        "char_count": len(extracted_text),
        "status": "READY",
        "processing_status": "READY",
        "is_scanned": meta.get("is_scanned_pdf", False),
        "cloudinary_url": d.get("cloudinary_url"),
        "cloudinary_public_id": d.get("cloudinary_public_id"),
        "topics": extracted_topics,
        "questions": extracted_questions,
        "error_message": None,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    firebase_manager.update_document("documents", doc_id, final_data)
    return DocumentItem(**final_data)


@router.get("/{doc_id}", response_model=DocumentItem)
async def get_document_details(doc_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    d = firebase_manager.get_document("documents", doc_id)
    if not d:
        raise HTTPException(status_code=404, detail="Document not found.")

    if d.get("student_id") != current_user.uid and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to document.")

    return DocumentItem(
        id=doc_id,
        document_id=doc_id,
        student_id=d.get("student_id") or d.get("user_id") or current_user.uid,
        user_id=d.get("user_id") or d.get("student_id") or current_user.uid,
        filename=d.get("filename", "Untitled Document"),
        file_type=d.get("file_type", ".pdf"),
        subject=d.get("subject", "General Studies"),
        topic=d.get("topic", "Course Notes"),
        uploaded_at=d.get("uploaded_at", ""),
        page_count=d.get("page_count", 1),
        chunk_count=d.get("chunk_count", 0),
        char_count=d.get("char_count", 0),
        status=d.get("status", "READY"),
        processing_status=d.get("processing_status", d.get("status", "READY")),
        cloudinary_url=d.get("cloudinary_url"),
        cloudinary_public_id=d.get("cloudinary_public_id"),
        topics=d.get("topics", []),
        questions=d.get("questions") or {"extracted": [], "suggested": []},
        error_message=d.get("error_message"),
        is_scanned=d.get("is_scanned", False)
    )


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    doc = firebase_manager.get_document("documents", doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.get("student_id") != current_user.uid and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized to delete this document.")

    # Remove vector chunks and document metadata
    qdrant_service.delete_document_chunks(doc_id)
    firebase_manager.delete_document("documents", doc_id)

    return {"message": "Document and associated vector chunks deleted successfully.", "id": doc_id}
