"""
Comprehensive test suite verifying platform API endpoints, security, RAG, video gate, assessments, and progress.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

STUDENT_AUTH_HEADER = {"Authorization": "Bearer dev-token-student1"}
ADMIN_AUTH_HEADER = {"Authorization": "Bearer dev-token-admin1"}


def test_health_check():
    """Verify system health endpoint."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "qdrant" in data
    assert "status" in data["qdrant"]


def test_auth_unauthorized():
    """Verify protected endpoints reject missing or invalid authorization tokens."""
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_student_profile():
    """Verify student profile fetching with bearer token."""
    res = client.get("/api/auth/me", headers=STUDENT_AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "student"


def test_admin_only_access():
    """Verify student cannot access admin-only endpoints."""
    # Student attempting to list all users
    res = client.get("/api/users", headers=STUDENT_AUTH_HEADER)
    assert res.status_code == 403

    # Admin accessing users list
    res_admin = client.get("/api/users", headers=ADMIN_AUTH_HEADER)
    assert res_admin.status_code == 200


def test_document_validation_and_upload():
    """Verify document upload validation and vector storage."""
    # Invalid extension
    res_bad = client.post(
        "/api/documents/upload",
        headers=STUDENT_AUTH_HEADER,
        files={"file": ("test.exe", b"binary content", "application/octet-stream")},
        data={"subject": "CS", "topic": "Security"}
    )
    assert res_bad.status_code == 400

    # Valid text document upload
    sample_text = (
        "Vector databases index dense embedding vectors for similarity retrieval. "
        "Cosine similarity measures the orientation angle between two non-zero vectors. "
        "In a RAG pipeline, the retriever fetches top-k relevant document chunks to ground LLM generation."
    )
    res_good = client.post(
        "/api/documents/upload",
        headers=STUDENT_AUTH_HEADER,
        files={"file": ("curriculum_notes.txt", sample_text.encode("utf-8"), "text/plain")},
        data={"subject": "Computer Science", "topic": "Vector DB & RAG"}
    )
    assert res_good.status_code == 200
    doc_data = res_good.json()
    assert doc_data["chunk_count"] >= 1
    assert doc_data["status"] in ["READY", "processed"]


def test_rag_query_grounding():
    """Verify Model 1 question answering grounds responses in retrieved documents."""
    res = client.post(
        "/api/learning/query",
        headers=STUDENT_AUTH_HEADER,
        json={"query": "How does cosine similarity evaluate vectors?", "subject": "Computer Science"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert len(data["sources"]) > 0


def test_video_creation_and_progress_gate():
    """Verify Model 2 video lesson management and completion gate."""
    # Admin creates video
    video_payload = {
        "title": "Introduction to Vector Retrieval",
        "description": "Understanding high dimensional spaces and similarity metrics",
        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "subject": "Computer Science",
        "topic": "Information Retrieval",
        "completion_threshold_percentage": 80.0,
        "is_published": True
    }
    create_res = client.post("/api/videos", headers=ADMIN_AUTH_HEADER, json=video_payload)
    assert create_res.status_code == 200
    video_id = create_res.json()["id"]

    # Student updates progress to 50% (under 80% threshold)
    prog_res_1 = client.post(
        f"/api/videos/{video_id}/progress",
        headers=STUDENT_AUTH_HEADER,
        json={"watched_seconds": 50.0, "total_seconds": 100.0}
    )
    assert prog_res_1.status_code == 200
    assert prog_res_1.json()["is_completed"] is False
    assert prog_res_1.json()["assessment_unlocked"] is False

    # Student updates progress to 85% (satisfies threshold)
    prog_res_2 = client.post(
        f"/api/videos/{video_id}/progress",
        headers=STUDENT_AUTH_HEADER,
        json={"watched_seconds": 85.0, "total_seconds": 100.0}
    )
    assert prog_res_2.status_code == 200
    assert prog_res_2.json()["is_completed"] is True
    assert prog_res_2.json()["assessment_unlocked"] is True


def test_assessment_creation_and_grading():
    """Verify objective assessment creation, anti-cheat protection, and auto-grading."""
    # Create prerequisite video first
    v_res = client.post(
        "/api/videos",
        headers=ADMIN_AUTH_HEADER,
        json={
            "title": "Search Engines 101",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "subject": "CS",
            "topic": "Search Algorithms",
            "completion_threshold_percentage": 80.0,
            "is_published": True
        }
    )
    vid_id = v_res.json()["id"]

    # Admin authors objective assessment
    ass_payload = {
        "title": "Search Engines Objective Quiz",
        "description": "Evaluates inverted indexes and vector ranking",
        "video_id": vid_id,
        "subject": "CS",
        "topic": "Search Algorithms",
        "passing_percentage": 50.0,
        "is_published": True,
        "questions": [
            {
                "id": "q1",
                "prompt": "What does an inverted index map?",
                "question_type": "multiple_choice",
                "options": ["Words to document IDs", "IP addresses to ports", "Pixels to RGB", "Keys to hashes"],
                "correct_answer": "Words to document IDs",
                "marks": 2.0
            },
            {
                "id": "q2",
                "prompt": "BM25 is a ranking function used in information retrieval.",
                "question_type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "True",
                "marks": 2.0
            }
        ]
    }
    ass_create_res = client.post("/api/assessments", headers=ADMIN_AUTH_HEADER, json=ass_payload)
    assert ass_create_res.status_code == 200
    ass_id = ass_create_res.json()["id"]

    # Student fetches assessment: Verify correct_answer is NEVER exposed
    student_view_res = client.get(f"/api/assessments/{ass_id}", headers=STUDENT_AUTH_HEADER)
    assert student_view_res.status_code == 200
    student_data = student_view_res.json()
    for q in student_data["questions"]:
        assert "correct_answer" not in q

    # Unlock video threshold for student
    client.post(
        f"/api/videos/{vid_id}/progress",
        headers=STUDENT_AUTH_HEADER,
        json={"watched_seconds": 90.0, "total_seconds": 100.0}
    )

    # Student submits answers (1 correct, 1 incorrect)
    submit_res = client.post(
        f"/api/assessments/{ass_id}/submit",
        headers=STUDENT_AUTH_HEADER,
        json={
            "answers": [
                {"question_id": "q1", "selected_answer": "Words to document IDs"},
                {"question_id": "q2", "selected_answer": "False"}
            ]
        }
    )
    assert submit_res.status_code == 200
    result = submit_res.json()
    assert result["marks_obtained"] == 2.0
    assert result["total_marks"] == 4.0
    assert result["score_percentage"] == 50.0
    assert result["passed"] is True

    # Duplicate attempt test: single attempt policy must reject second submission
    dup_res = client.post(
        f"/api/assessments/{ass_id}/submit",
        headers=STUDENT_AUTH_HEADER,
        json={"answers": [{"question_id": "q1", "selected_answer": "Words to document IDs"}]}
    )
    assert dup_res.status_code == 400


def test_academic_progress_and_recommendations():
    """Verify academic progress computation and transparent revision advice."""
    res = client.get("/api/progress/me", headers=STUDENT_AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert "completion_rate_percentage" in data
    assert "topic_performance" in data
    assert "revision_recommendations" in data
    assert "recent_activities" in data


def test_cors_preflight_and_origin_headers():
    """Verify CORS preflight OPTIONS request and CORS headers for deployed frontend."""
    frontend_origin = "https://personalized-learning-platform-1-l82p.onrender.com"

    # Preflight OPTIONS request
    preflight_res = client.options(
        "/api/learning/query",
        headers={
            "Origin": frontend_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization, content-type",
        }
    )
    assert preflight_res.status_code == 200
    assert preflight_res.headers.get("access-control-allow-origin") == frontend_origin
    assert preflight_res.headers.get("access-control-allow-credentials") == "true"
    allow_methods = preflight_res.headers.get("access-control-allow-methods", "")
    assert "POST" in allow_methods
    assert "OPTIONS" in allow_methods

    # Authenticated GET with Origin header
    get_res = client.get(
        "/api/auth/me",
        headers={
            "Origin": frontend_origin,
            **STUDENT_AUTH_HEADER
        }
    )
    assert get_res.status_code == 200
    assert get_res.headers.get("access-control-allow-origin") == frontend_origin


def test_learning_query_general_knowledge_and_cors():
    """Verify /api/learning/query in general knowledge mode returns proper structure and CORS headers."""
    frontend_origin = "https://personalized-learning-platform-1-l82p.onrender.com"
    res = client.post(
        "/api/learning/query",
        headers={
            "Origin": frontend_origin,
            **STUDENT_AUTH_HEADER
        },
        json={
            "query": "What is Natural Language Processing?",
            "mode": "general_knowledge",
            "subject": "Computer Science"
        }
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == frontend_origin
    data = res.json()
    assert data["mode"] == "general_knowledge"
    assert "response" in data
    assert len(data["response"]) > 20


def test_qdrant_service_diagnostics():
    """Verify safe Qdrant diagnostics without exposing secrets."""
    from app.services.qdrant_service import qdrant_service
    diag = qdrant_service.check_health()
    assert "status" in diag
    assert "cluster_url" in diag
    assert "collection" in diag
    assert "api_key_configured" in diag
    # Ensure raw API key is never in diagnostic output
    assert diag.get("api_key") is None
    if diag.get("api_key_masked"):
        assert "..." in diag["api_key_masked"] or diag["api_key_masked"] == "NONE"
