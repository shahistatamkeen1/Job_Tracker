from __future__ import annotations

import json
import random
import re
from datetime import datetime
from typing import Any

from openai import OpenAI

from app.config import settings


class AIService:
    def __init__(self) -> None:
        self.enabled = bool(settings.openai_api_key and settings.openai_api_key.strip())
        self.client = OpenAI(api_key=settings.openai_api_key) if self.enabled else None

    def _ensure_ai_enabled(self) -> None:
        if not self.enabled or self.client is None:
            raise ValueError("OPENAI_API_KEY is missing. Add a valid key in backend .env file.")

    def _simple_overlap_score(self, jd: str, resume: str) -> int:
        tokens = {t.lower() for t in re.findall(r"[A-Za-z][A-Za-z0-9+#.]{1,}", jd)}
        if not tokens:
            return 50

        hits = sum(1 for t in tokens if t in resume.lower())
        ratio = hits / len(tokens)
        return max(35, min(98, int(ratio * 100)))

    def _ats_formatted_resume(self, resume_text: str) -> str:
        lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
        summary = " ".join(lines[:2]) if lines else "Candidate with relevant skills and project experience."
        body_points = lines[2:10] if len(lines) > 2 else []

        if not body_points:
            body_points = [
                "Tailor this section with role-specific accomplishments and measurable impact.",
                "Add strong action verbs and quantify outcomes where possible.",
            ]

        def bullets(items: list[str]) -> str:
            return "\n".join(f"- {item}" for item in items)

        return (
            "FULL NAME\n"
            "Email | Phone | Location | LinkedIn\n\n"
            "PROFESSIONAL SUMMARY\n"
            f"{summary}\n\n"
            "CORE SKILLS\n"
            "- Technical Skill 1\n"
            "- Technical Skill 2\n"
            "- Technical Skill 3\n\n"
            "PROFESSIONAL EXPERIENCE\n"
            "Job Title - Company | Start Date - End Date\n"
            f"{bullets(body_points[:4])}\n\n"
            "PROJECTS\n"
            "Project Name | Tech Stack\n"
            f"{bullets(body_points[4:7] if len(body_points) > 4 else body_points[:2])}\n\n"
            "EDUCATION\n"
            "Degree - University | Graduation Date\n\n"
            "CERTIFICATIONS\n"
            "- Certification Name - Issuer\n\n"
            "ACHIEVEMENTS\n"
            "- Add measurable achievements."
        )

    def generate_application_insight(
        self,
        company: str,
        role: str,
        job_description: str,
        status: str,
        notes: str,
        description: str = "",
    ) -> str:
        if not self.enabled:
            return f"Review the role requirements for {role} at {company} and match your resume to the key skills."

        self._ensure_ai_enabled()

        prompt = (
            "You are a friendly career coach. "
            "Give very simple advice for this job application. "
            "Do not write paragraphs. Do not use headings. Do not use markdown bold. "
            "Return only 4 short bullet points. "
            "Each bullet must be one simple action step under 18 words. "
            "Focus only on what the user should do next."
        )

        details = (
            f"Company: {company}\n"
            f"Role: {role}\n"
            f"Status: {status}\n"
            f"Job Description:\n{job_description}\n\n"
            f"Notes:\n{notes}\n"
            f"Application Description:\n{description}"
        )

        response = self.client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": details},
            ],
            max_tokens=180,
            temperature=0.5,
        )

        return (
            (response.choices[0].message.content or "")
            .replace("**", "")
            .replace("###", "")
            .strip()
        )

    def generate_debug_challenge(
        self,
        job_description: str,
        role: str = "",
        company: str = "",
    ) -> dict:
        self._ensure_ai_enabled()

        unique_seed = f"{datetime.now().isoformat()}-{random.randint(1000, 9999)}"

        prompt = """
You are a coding interview coach.

Create ONE personalized Python debugging challenge based on the job description.

Return ONLY valid JSON. No markdown. No explanation outside JSON.

JSON format:
{
  "title": "short title",
  "description": "simple description",
  "difficulty": "easy",
  "topic": "job-related topic",
  "language": "python",
  "bug_type": "short bug type",
  "function_name": "valid_python_function_name",
  "expected_behavior": "what the function should do",
  "starter_code": "buggy python code as a string",
  "tests": [
    {"input": [value1, value2], "expected": expected_value}
  ],
  "hints": ["hint 1", "hint 2", "hint 3"],
  "why_this_matches_job": "simple reason why this challenge fits the job"
}

Rules:
- Keep it beginner friendly.
- Use only simple Python.
- starter_code must contain exactly one bug.
- Tests must match function_name.
- No imports.
- No print().
- No input().
- No files.
- No network.
- No database.
- No external libraries.
- Generate a different challenge every time.
- Vary function name, bug type, logic, and test cases each time.
"""

        details = f"""
Unique Request ID: {unique_seed}

Company: {company}
Role: {role}

Job Description:
{job_description}

IMPORTANT:
Generate a NEW and DIFFERENT challenge every time.
Do not repeat the same logic, same function, or same tests.
"""

        response = self.client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": details},
            ],
            max_tokens=900,
            temperature=0.8,
        )

        text = (response.choices[0].message.content or "").strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            cleaned = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)

        required_keys = [
            "title",
            "description",
            "difficulty",
            "topic",
            "language",
            "bug_type",
            "function_name",
            "expected_behavior",
            "starter_code",
            "tests",
            "hints",
            "why_this_matches_job",
        ]

        for key in required_keys:
            if key not in data:
                raise ValueError(f"AI challenge missing required field: {key}")

        return data

    def chat_about_jd(self, job_description: str, message: str, history: list[dict]) -> str:
        if not self.enabled:
            return "Focus on matching the top job requirements with your strongest projects and experience."

        self._ensure_ai_enabled()

        convo: list[dict[str, Any]] = [
            {
                "role": "system",
                "content": (
                    "You are an expert job application mentor. "
                    "Give concise, practical advice."
                ),
            },
            {"role": "user", "content": f"Job Description:\n{job_description}"},
        ]

        for msg in history[-8:]:
            convo.append(
                {
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                }
            )

        convo.append({"role": "user", "content": message})

        response = self.client.chat.completions.create(
            model=settings.openai_model,
            messages=convo,
            max_tokens=500,
            temperature=0.7,
        )

        return response.choices[0].message.content or ""

    def ats_resume_feedback(self, job_description: str, resume_text: str) -> dict:
        if not self.enabled:
            original_score = self._simple_overlap_score(job_description, resume_text)
            improved_resume = self._ats_formatted_resume(resume_text)
            improved_score = self._simple_overlap_score(job_description, improved_resume)

            return {
                "score": original_score,
                "original_score": original_score,
                "improved_score": improved_score,
                "score_increase": improved_score - original_score,
                "gaps": [
                    "Add more job-specific keywords.",
                    "Quantify achievements with numbers.",
                    "Highlight tools mentioned in the job description.",
                ],
                "improved_resume": improved_resume,
            }

        self._ensure_ai_enabled()

        prompt = (
            "Evaluate resume ATS compatibility for the job description. "
            "Return strict JSON with keys: score, gaps, improved_resume."
        )

        response = self.client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "job_description": job_description,
                            "resume_text": resume_text,
                        }
                    ),
                },
            ],
            max_tokens=1500,
            temperature=0.5,
        )

        text = (response.choices[0].message.content or "").strip()

        try:
            data = json.loads(text)
            original_score = int(data.get("score", 0))
            improved_resume = data.get("improved_resume", self._ats_formatted_resume(resume_text))
            improved_score = self._simple_overlap_score(job_description, improved_resume)

            return {
                "score": original_score,
                "original_score": original_score,
                "improved_score": improved_score,
                "score_increase": improved_score - original_score,
                "gaps": data.get("gaps", []),
                "improved_resume": improved_resume,
            }

        except json.JSONDecodeError:
            original_score = self._simple_overlap_score(job_description, resume_text)
            improved_resume = self._ats_formatted_resume(resume_text)
            improved_score = self._simple_overlap_score(job_description, improved_resume)

            return {
                "score": original_score,
                "original_score": original_score,
                "improved_score": improved_score,
                "score_increase": improved_score - original_score,
                "gaps": ["Model returned non-JSON output. Using fallback scoring."],
                "improved_resume": improved_resume,
            }


ai_service = AIService()