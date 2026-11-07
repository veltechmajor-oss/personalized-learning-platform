from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import datetime
from app.core.security import get_current_user, require_admin, AuthenticatedUser
from app.core.firebase import firebase_manager

router = APIRouter()


class QuestionModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str = Field(..., min_length=5)
    question_type: str = "multiple_choice"  # "multiple_choice" or "true_false"
    options: List[str] = Field(..., min_length=2)
    correct_answer: str
    marks: float = 1.0


class AssessmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = ""
    video_id: str
    subject: str = "Computer Science"
    topic: str = "Core Concepts"
    passing_percentage: float = 60.0
    is_published: bool = True
    questions: List[QuestionModel] = Field(..., min_length=1)


class StudentQuestionModel(BaseModel):
    id: str
    prompt: str
    question_type: str
    options: List[str]
    marks: float


class AssessmentStudentView(BaseModel):
    id: str
    title: str
    description: str
    video_id: Optional[str] = None
    document_id: Optional[str] = None
    source_type: Optional[str] = "video"
    subject: str
    topic: str
    passing_percentage: float
    total_marks: float
    question_count: int
    questions: List[StudentQuestionModel]
    is_eligible: bool
    has_attempted: bool
    student_score: Optional[float] = None
    passed: Optional[bool] = None


class AnswerSubmission(BaseModel):
    question_id: str
    selected_answer: str


class AssessmentSubmitRequest(BaseModel):
    answers: List[AnswerSubmission]


class GradedQuestionFeedback(BaseModel):
    question_id: str
    prompt: str
    selected_answer: str
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    is_correct: bool
    marks_awarded: float
    max_marks: float


class AssessmentResultResponse(BaseModel):
    attempt_id: str
    assessment_id: str
    student_id: str
    marks_obtained: float
    total_marks: float
    score_percentage: float
    passed: bool
    submitted_at: str
    breakdown: List[GradedQuestionFeedback]


@router.post("", response_model=Dict[str, Any])
async def create_assessment(
    payload: AssessmentCreateRequest,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    # Verify associated video lesson exists
    video = firebase_manager.get_document("videos", payload.video_id)
    if not video:
        raise HTTPException(status_code=400, detail="Associated video lesson does not exist.")

    assessment_id = str(uuid.uuid4())
    total_marks = sum(q.marks for q in payload.questions)

    assessment_data = {
        "id": assessment_id,
        "title": payload.title,
        "description": payload.description,
        "video_id": payload.video_id,
        "subject": payload.subject,
        "topic": payload.topic,
        "passing_percentage": payload.passing_percentage,
        "total_marks": total_marks,
        "question_count": len(payload.questions),
        "is_published": payload.is_published,
        "questions": [q.model_dump() for q in payload.questions],
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "created_by": current_admin.uid
    }

    firebase_manager.set_document("assessments", assessment_id, assessment_data)
    return {"message": "Assessment created successfully", "id": assessment_id, "total_marks": total_marks}


@router.get("", response_model=List[Dict[str, Any]])
async def list_assessments(current_user: AuthenticatedUser = Depends(get_current_user)):
    filters = None if current_user.role == "admin" else {"is_published": True}
    assessments = firebase_manager.list_documents("assessments", filters=filters)

    # Fetch attempts by this student to determine status
    student_attempts = {
        a.get("assessment_id"): a
        for a in firebase_manager.list_documents("attempts", filters={"student_id": current_user.uid})
    }

    # Fetch video progress records to determine eligibility
    student_progress = {
        p.get("video_id"): p
        for p in firebase_manager.list_documents("video_progress", filters={"student_id": current_user.uid})
    }

    results = []
    for a in assessments:
        aid = a.get("id")
        vid_id = a.get("video_id")
        is_doc_assessment = a.get("source_type") == "document" or not vid_id
        attempt = student_attempts.get(aid)
        prog = student_progress.get(vid_id, {}) if vid_id else {}
        is_completed_video = prog.get("is_completed", False) if vid_id else True

        item = {
            "id": aid,
            "title": a.get("title", "Untitled Assessment"),
            "description": a.get("description", ""),
            "video_id": vid_id,
            "document_id": a.get("document_id"),
            "source_type": a.get("source_type", "video"),
            "subject": a.get("subject", "General"),
            "topic": a.get("topic", "General"),
            "total_marks": a.get("total_marks", 0),
            "question_count": a.get("question_count", len(a.get("questions", []))),
            "passing_percentage": a.get("passing_percentage", 60.0),
            "is_published": a.get("is_published", True),
            "is_eligible": is_doc_assessment or is_completed_video or current_user.role == "admin",
            "has_attempted": bool(attempt),
            "student_score": attempt.get("score_percentage") if attempt else None,
            "passed": attempt.get("passed") if attempt else None,
        }

        # If admin, also include question definitions
        if current_user.role == "admin":
            item["questions"] = a.get("questions", [])

        results.append(item)

    return results


@router.get("/{assessment_id}", response_model=AssessmentStudentView)
async def get_assessment(assessment_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    a = firebase_manager.get_document("assessments", assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    vid_id = a.get("video_id")
    is_doc_assessment = a.get("source_type") == "document" or not vid_id
    prog = firebase_manager.get_document("video_progress", f"{current_user.uid}_{vid_id}") or {} if vid_id else {}
    is_eligible = is_doc_assessment or prog.get("is_completed", False) or current_user.role == "admin"

    # Check attempt
    attempt_doc = firebase_manager.get_document("attempts", f"{current_user.uid}_{assessment_id}")

    # Strip correct answers before sending to student
    student_questions = [
        StudentQuestionModel(
            id=q.get("id", str(i)),
            prompt=q.get("prompt", ""),
            question_type=q.get("question_type", "multiple_choice"),
            options=q.get("options", []),
            marks=q.get("marks", 1.0)
        )
        for i, q in enumerate(a.get("questions", []))
    ]

    return AssessmentStudentView(
        id=assessment_id,
        title=a.get("title", ""),
        description=a.get("description", ""),
        video_id=vid_id,
        document_id=a.get("document_id"),
        source_type=a.get("source_type", "video"),
        subject=a.get("subject", ""),
        topic=a.get("topic", ""),
        passing_percentage=a.get("passing_percentage", 60.0),
        total_marks=a.get("total_marks", 0.0),
        question_count=len(student_questions),
        questions=student_questions,
        is_eligible=is_eligible,
        has_attempted=bool(attempt_doc),
        student_score=attempt_doc.get("score_percentage") if attempt_doc else None,
        passed=attempt_doc.get("passed") if attempt_doc else None
    )


@router.post("/{assessment_id}/submit", response_model=AssessmentResultResponse)
async def submit_assessment(
    assessment_id: str,
    payload: AssessmentSubmitRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    a = firebase_manager.get_document("assessments", assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # 1. Server-side single attempt enforcement
    attempt_key = f"{current_user.uid}_{assessment_id}"
    existing_attempt = firebase_manager.get_document("attempts", attempt_key)
    if existing_attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already completed this assessment. Single-attempt policy is strictly enforced."
        )

    # 2. Server-side eligibility check
    vid_id = a.get("video_id")
    is_doc_assessment = a.get("source_type") == "document" or not vid_id
    if not is_doc_assessment and vid_id:
        prog = firebase_manager.get_document("video_progress", f"{current_user.uid}_{vid_id}") or {}
        if not prog.get("is_completed", False) and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assessment is locked. You must reach the video lesson completion threshold first."
            )

    # 3. Objective auto-grading against stored answer key
    questions_map = {q["id"]: q for q in a.get("questions", [])}
    answers_map = {ans.question_id: ans.selected_answer.strip() for ans in payload.answers}

    marks_obtained = 0.0
    total_marks = a.get("total_marks", 0.0) or sum(q.get("marks", 1.0) for q in a.get("questions", []))
    breakdown = []

    for qid, q in questions_map.items():
        correct = q.get("correct_answer", "").strip().lower()
        selected = answers_map.get(qid, "").strip().lower()
        max_marks = q.get("marks", 1.0)

        is_match = (selected == correct) and (selected != "")
        awarded = max_marks if is_match else 0.0
        marks_obtained += awarded

        breakdown.append(GradedQuestionFeedback(
            question_id=qid,
            prompt=q.get("prompt", ""),
            selected_answer=answers_map.get(qid, "Unanswered"),
            correct_answer=q.get("correct_answer", ""),
            explanation=q.get("explanation", ""),
            is_correct=is_match,
            marks_awarded=awarded,
            max_marks=max_marks
        ))

    score_percentage = round((marks_obtained / total_marks * 100.0) if total_marks > 0 else 0.0, 2)
    passing_threshold = a.get("passing_percentage", 60.0)
    passed = score_percentage >= passing_threshold
    submitted_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    attempt_record = {
        "id": attempt_key,
        "assessment_id": assessment_id,
        "video_id": vid_id,
        "document_id": a.get("document_id"),
        "source_type": a.get("source_type", "video"),
        "student_id": current_user.uid,
        "student_name": current_user.name,
        "student_email": current_user.email,
        "subject": a.get("subject", "General"),
        "topic": a.get("topic", "General"),
        "marks_obtained": marks_obtained,
        "total_marks": total_marks,
        "score_percentage": score_percentage,
        "passed": passed,
        "submitted_at": submitted_at,
        "breakdown": [b.model_dump() for b in breakdown]
    }

    # Persist attempt record
    firebase_manager.set_document("attempts", attempt_key, attempt_record)

    # Record academic activity
    act_id = str(uuid.uuid4())
    firebase_manager.set_document("activities", act_id, {
        "id": act_id,
        "student_id": current_user.uid,
        "type": "assessment_attempt",
        "title": f"Took '{a.get('title')}' - Scored {score_percentage}% ({'Passed' if passed else 'Needs Review'})",
        "subject": a.get("subject", "General"),
        "topic": a.get("topic", "General"),
        "timestamp": submitted_at,
        "score": score_percentage
    })

    return AssessmentResultResponse(
        attempt_id=attempt_key,
        assessment_id=assessment_id,
        student_id=current_user.uid,
        marks_obtained=marks_obtained,
        total_marks=total_marks,
        score_percentage=score_percentage,
        passed=passed,
        submitted_at=submitted_at,
        breakdown=breakdown
    )


@router.delete("/{assessment_id}")
async def delete_assessment(assessment_id: str, current_admin: AuthenticatedUser = Depends(require_admin)):
    existing = firebase_manager.get_document("assessments", assessment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Assessment not found")
    firebase_manager.delete_document("assessments", assessment_id)
    return {"message": "Assessment deleted successfully", "id": assessment_id}


@router.get("/{assessment_id}/admin")
async def get_assessment_for_admin(
    assessment_id: str,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    a = firebase_manager.get_document("assessments", assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    attempts = firebase_manager.list_documents("attempts", filters={"assessment_id": assessment_id})
    a["attempts_count"] = len(attempts)
    a["attempts"] = attempts
    return a


@router.put("/{assessment_id}/publish")
async def toggle_assessment_publish(
    assessment_id: str,
    payload: Dict[str, Any],
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    a = firebase_manager.get_document("assessments", assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    is_pub = payload.get("is_published", not a.get("is_published", True))
    firebase_manager.update_document("assessments", assessment_id, {"is_published": is_pub})
    return {"id": assessment_id, "is_published": is_pub}
