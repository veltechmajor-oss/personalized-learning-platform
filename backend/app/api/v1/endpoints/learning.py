from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import datetime
import logging
from app.core.security import get_current_user, AuthenticatedUser
from app.core.firebase import firebase_manager
from app.services.rag_service import rag_service
from app.services.gemini_service import gemini_service
from app.services.assessment_generation_service import assessment_generation_service

logger = logging.getLogger(__name__)
router = APIRouter()


class LearningQueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None
    subject: Optional[str] = "General"
    topic: Optional[str] = None
    mode: Optional[str] = "grounded"  # "grounded" | "general_knowledge"


class RetrievedSourcePassage(BaseModel):
    source: str = "Uploaded Study Notes"
    text: str = ""
    score: float = 0.0
    chunk_index: int = 0
    page_number: int = 1


class LearningQueryResponse(BaseModel):
    query: str
    response: str
    evidence_status: str = "GROUNDED IN UPLOADED MATERIALS"
    is_sufficient_context: bool
    can_use_general_ai: bool = False
    mode: str = "grounded"
    sources: List[str]
    passages: List[RetrievedSourcePassage]
    recommended_topics: List[str]
    timestamp: str


class MarkDoneRequest(BaseModel):
    document_id: str
    subject: Optional[str] = "General"
    topic: Optional[str] = "Course Notes"
    generate_assessment: bool = True


class DocumentAssessmentGenRequest(BaseModel):
    document_id: str
    question_count: int = 5
    total_marks: float = 10.0
    difficulty: str = "Medium"


@router.post("/query", response_model=LearningQueryResponse)
async def query_learning_content(
    request: LearningQueryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question query cannot be empty."
        )

    # Resolve document metadata if provided
    document_name = "Uploaded Study Notes"
    if request.document_id:
        doc = firebase_manager.get_document("documents", request.document_id)
        if doc and "filename" in doc:
            document_name = doc["filename"]

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Branch 1: General Knowledge Mode (Separate from Grounded Mode)
    if request.mode == "general_knowledge":
        gen_result = await gemini_service.generate_general_knowledge_explanation(
            question=request.query,
            subject=request.subject or "General",
            topic=request.topic or "Academic Topic"
        )

        activity_id = str(uuid.uuid4())
        firebase_manager.set_document("activities", activity_id, {
            "id": activity_id,
            "student_id": current_user.uid,
            "type": "general_ai_query",
            "document_id": request.document_id,
            "title": f"General AI: '{request.query[:60]}...'",
            "subject": request.subject or "General",
            "topic": request.topic or "AI Explanation",
            "timestamp": timestamp,
            "is_sufficient": True
        })

        return LearningQueryResponse(
            query=request.query,
            response=gen_result.get("text", ""),
            evidence_status="GENERAL_AI_EXPLANATION",
            is_sufficient_context=True,
            can_use_general_ai=False,
            mode="general_knowledge",
            sources=[f"Google Gemini Academic AI (Subject: {request.subject or 'General'})"],
            passages=[],
            recommended_topics=[
                f"Core Principles of {request.topic or 'Topic'}",
                "Related Examination Problems",
                "Take Conceptual Assessment"
            ],
            timestamp=timestamp
        )

    # Branch 2: Document Grounded RAG Mode
    try:
        chunks, is_sufficient, evidence_hint = await rag_service.retrieve_relevant_contexts(
            query=request.query,
            student_id=current_user.uid,
            document_id=request.document_id,
            top_k=4
        )
    except Exception as e:
        logger.exception("Qdrant RAG context retrieval failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Vector search service (Qdrant) failed: {str(e)}"
        )

    context_texts = [c["text"] for c in chunks if "text" in c]
    sources = list({c.get("source") or document_name for c in chunks})
    passages = [
        RetrievedSourcePassage(
            source=c.get("source") or document_name,
            text=(c.get("text") or "")[:400] + ("..." if len(c.get("text") or "") > 400 else ""),
            score=float(c.get("score") or 0.0),
            chunk_index=int(c.get("chunk_index") or 0),
            page_number=int(c.get("page_number") or 1)
        )
        for c in chunks
    ]

    try:
        explanation_result = await gemini_service.generate_grounded_explanation(
            question=request.query,
            context_chunks=context_texts,
            document_name=document_name,
            subject=request.subject or "General",
            topic=request.topic or "Study Notes"
        )
    except Exception as e:
        logger.exception("Gemini grounded explanation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI explanation generation (Gemini) failed: {str(e)}"
        )

    # Persist query in student's learning activity history
    activity_id = str(uuid.uuid4())
    firebase_manager.set_document("activities", activity_id, {
        "id": activity_id,
        "student_id": current_user.uid,
        "type": "rag_query",
        "document_id": request.document_id,
        "title": f"Explored: '{request.query[:60]}...'",
        "subject": request.subject or "General",
        "topic": request.topic or "RAG Question",
        "timestamp": timestamp,
        "is_sufficient": explanation_result.get("is_sufficient", False),
        "evidence_status": explanation_result.get("evidence_status", "INSUFFICIENT STUDY CONTEXT")
    })

    # Recommended follow-ups
    recommended = [
        f"Review Key Concepts in {document_name}",
        "Verify Related Examination Questions",
        "Take AI Topic Assessment"
    ]

    return LearningQueryResponse(
        query=request.query,
        response=explanation_result.get("text", ""),
        evidence_status=explanation_result.get("evidence_status", "INSUFFICIENT STUDY CONTEXT"),
        is_sufficient_context=explanation_result.get("is_sufficient", False),
        can_use_general_ai=explanation_result.get("can_use_general_ai", False),
        mode="grounded",
        sources=sources,
        passages=passages,
        recommended_topics=recommended,
        timestamp=timestamp
    )


@router.post("/done")
async def mark_document_learning_done(
    payload: MarkDoneRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Registers that the student has reviewed topics/questions for a document,
    records the learning session in Firestore, and auto-generates a topic assessment.
    """
    doc = firebase_manager.get_document("documents", payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    session_id = str(uuid.uuid4())

    # Record completion in Firestore learning sessions
    firebase_manager.set_document("learning_sessions", session_id, {
        "id": session_id,
        "student_id": current_user.uid,
        "document_id": payload.document_id,
        "subject": payload.subject or doc.get("subject", "General"),
        "topic": payload.topic or doc.get("topic", "Course Notes"),
        "completed_at": timestamp,
        "status": "completed"
    })

    # Record activity
    act_id = str(uuid.uuid4())
    firebase_manager.set_document("activities", act_id, {
        "id": act_id,
        "student_id": current_user.uid,
        "type": "document_done",
        "title": f"Completed learning session for '{doc.get('filename')}'",
        "subject": doc.get("subject", "General"),
        "topic": doc.get("topic", "Course Notes"),
        "timestamp": timestamp
    })

    assessment_id = None
    if payload.generate_assessment:
        assessment_id = await generate_document_assessment_internal(
            doc_id=payload.document_id,
            doc=doc,
            student_id=current_user.uid
        )

    return {
        "message": "Learning session marked as Done successfully.",
        "session_id": session_id,
        "assessment_id": assessment_id
    }


async def generate_document_assessment_internal(doc_id: str, doc: dict, student_id: str) -> str:
    """Internal helper to generate a 5-question AI assessment based on document topics."""
    topics = doc.get("topics", [])
    topic_str = ", ".join(topics[:6]) if topics else doc.get("topic", "Course Concepts")
    filename = doc.get("filename", "Course Document")

    # Generate questions using Gemini Assessment Service
    questions = assessment_generation_service.generate_assessment(
        title=f"Assessment: {filename}",
        description=f"Automated Model 1 learning assessment for {filename}",
        learning_objectives=f"Topics covered in document: {topic_str}",
        subject=doc.get("subject", "General Studies"),
        topic=doc.get("topic", "Key Topics"),
        difficulty="Medium",
        question_count=5,
        total_marks=10.0
    )

    assessment_id = str(uuid.uuid4())
    for i, q in enumerate(questions):
        if "id" not in q or not q["id"]:
            q["id"] = f"q_{assessment_id[:8]}_{i}"
        if "marks" not in q:
            q["marks"] = 2.0

    assessment_data = {
        "id": assessment_id,
        "title": f"AI Assessment: {filename}",
        "description": f"Post-study evaluation generated from {filename}. Test your understanding of: {topic_str}.",
        "source_type": "document",
        "document_id": doc_id,
        "video_id": None,
        "subject": doc.get("subject", "General Studies"),
        "topic": doc.get("topic", "Course Notes"),
        "passing_percentage": 60.0,
        "total_marks": 10.0,
        "question_count": len(questions),
        "is_published": True,
        "questions": questions,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "created_by": student_id
    }

    firebase_manager.set_document("assessments", assessment_id, assessment_data)
    return assessment_id


@router.post("/generate-assessment")
async def generate_document_assessment_endpoint(
    payload: DocumentAssessmentGenRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    doc = firebase_manager.get_document("documents", payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    assessment_id = await generate_document_assessment_internal(
        doc_id=payload.document_id,
        doc=doc,
        student_id=current_user.uid
    )

    return {
        "message": "Document assessment generated successfully",
        "assessment_id": assessment_id
    }


@router.get("/history")
async def get_query_history(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Retrieve student's recent explored questions and learning sessions."""
    activities = firebase_manager.list_documents("activities", filters={"student_id": current_user.uid})
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return activities[:20]
