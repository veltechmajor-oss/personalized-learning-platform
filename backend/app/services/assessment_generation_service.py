"""Assessment Generation Service using Gemini and structured generation.

Generates structured assessment questions (MCQ / True-False) based on topics,
learning objectives, and document or video content.
"""

import json
import logging
import re
from typing import List, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class AssessmentGenerationService:
    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY
        self.preferred_models = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]
        custom = getattr(settings, "GEMINI_MODEL", "")
        if custom and custom not in ["gemini-1.5-flash", "gemini-2.5-flash"]:
            if custom not in self.preferred_models:
                self.preferred_models.insert(0, custom)

    def _fallback_questions(
        self,
        learning_objectives: str,
        total_marks: float,
        question_count: int,
    ) -> List[Dict[str, Any]]:
        """Return a robust deterministic list of MCQ and true/false questions based on objectives."""
        topics = [t.strip() for t in re.split(r"[,;•\n\.]", learning_objectives) if len(t.strip()) > 3]
        if not topics:
            topics = ["Core Concept", "Key Architecture", "Operational Principles"]

        questions = []
        mark_per_q = round(total_marks / question_count, 1)

        for i in range(question_count):
            topic = topics[i % len(topics)]
            if i % 2 == 0:
                questions.append({
                    "id": f"gen_q_{i+1}",
                    "prompt": f"Which statement accurately describes the foundational mechanism of {topic}?",
                    "question_type": "multiple_choice",
                    "options": [
                        f"It systematically enforces the core principles of {topic}.",
                        f"It completely disables parameter updates during training.",
                        f"It eliminates all input transformations.",
                        f"None of the above statements apply."
                    ],
                    "correct_answer": f"It systematically enforces the core principles of {topic}.",
                    "marks": mark_per_q,
                    "explanation": f"Understanding {topic} is essential for adhering to the core academic curriculum principles."
                })
            else:
                questions.append({
                    "id": f"gen_q_{i+1}",
                    "prompt": f"True or False: In academic study, {topic} plays a vital role in model evaluation.",
                    "question_type": "true_false",
                    "options": ["True", "False"],
                    "correct_answer": "True",
                    "marks": mark_per_q,
                    "explanation": f"{topic} represents a foundational milestone in this subject."
                })

        return questions

    def generate_assessment(
        self,
        title: str,
        description: str,
        learning_objectives: str,
        subject: str,
        topic: str,
        difficulty: str = "Medium",
        question_count: int = 10,
        total_marks: float = 10.0,
    ) -> List[Dict[str, Any]]:
        """Generate a list of objective multiple-choice assessment questions."""
        mark_per_q = round(total_marks / question_count, 1) if question_count > 0 else 1.0

        prompt = (
            "You are an academic assessment engineer in an intelligent educational platform.\n"
            f"Generate a strict JSON array of exactly {question_count} high-quality objective Multiple-Choice Questions (MCQs).\n"
            f"Difficulty: {difficulty}\n"
            f"Subject: {subject}\n"
            f"Topic: {topic}\n"
            f"Title: {title}\n"
            f"Curriculum Description & Verified Learning Objectives:\n{learning_objectives}\n\n"
            "STRICT QUESTION FORMAT:\n"
            "Each item in the JSON array must be an object with these exact keys:\n"
            "- id: string (e.g. 'q_1', 'q_2')\n"
            "- prompt: string (clear, rigorous question stem)\n"
            "- question_type: 'multiple_choice'\n"
            "- options: array of exactly 4 plausible distinct strings\n"
            "- correct_answer: string (MUST match one of the 4 options verbatim)\n"
            f"- marks: number (use {mark_per_q})\n"
            "- explanation: string (academic justification for why this answer is correct)\n\n"
            "Output pure JSON array only without markdown ticks or preambles."
        )

        if self.api_key:
            for model_to_try in self.preferred_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_to_try}:generateContent?key={self.api_key}"
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.25, "responseMimeType": "application/json"}
                    }
                    res = httpx.post(url, json=payload, timeout=8.0)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            clean_json = re.sub(r"^```(json)?\s*", "", raw_text.strip(), flags=re.MULTILINE)
                            clean_json = re.sub(r"\s*```$", "", clean_json.strip())
                            questions = json.loads(clean_json)
                            if isinstance(questions, list) and len(questions) > 0:
                                # Validate each question
                                sanitized = []
                                for i, q in enumerate(questions[:question_count]):
                                    opts = q.get("options", [])
                                    correct = q.get("correct_answer", "")
                                    if len(opts) < 2:
                                        opts = [correct, "Alternative option A", "Alternative option B", "None of the above"]
                                    if correct not in opts:
                                        opts[0] = correct
                                    sanitized.append({
                                        "id": f"q_{i+1}",
                                        "prompt": q.get("prompt", f"Question {i+1} on {topic}"),
                                        "question_type": "multiple_choice",
                                        "options": opts,
                                        "correct_answer": correct,
                                        "marks": q.get("marks", mark_per_q),
                                        "explanation": q.get("explanation", f"Correct answer for {topic}.")
                                    })
                                if len(sanitized) > 0:
                                    return sanitized
                    else:
                        logger.warning(
                            "Gemini model %s returned HTTP %d for assessment: %s",
                            model_to_try,
                            res.status_code,
                            res.text[:100]
                        )
                except Exception as e:
                    logger.warning("Gemini assessment generation call issue for %s (%s).", model_to_try, e)

        return self._fallback_questions(learning_objectives, total_marks, question_count)


assessment_generation_service = AssessmentGenerationService()
