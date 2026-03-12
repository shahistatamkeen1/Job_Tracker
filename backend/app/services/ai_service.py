from __future__ import annotations

import json
import re
from typing import Any

from openai import OpenAI

from app.config import settings


class AIService:
    def __init__(self) -> None:
        self.enabled = bool(settings.openai_api_key)
        self.client = OpenAI(api_key=settings.openai_api_key) if self.enabled else None

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
            "- Add measurable achievements (awards, impact, rankings, outcomes)."
        )

    def analyze_rejection(self, job_description: str, user_notes: str, status_history: list[dict]) -> str:
        if not self.enabled:
            return (
                "Most likely rejection reasons: insufficient keyword alignment with the job description, "
                "limited measurable achievements in your application, and weak role-specific tailoring. "
                "Improve by matching required skills, quantifying impact, and customizing each application."
            )

        prompt = (
            "You are a career coach. Analyze why this job application may have been rejected. "
            "Provide a concise paragraph with practical suggestions."
        )
        details = {
            "job_description": job_description,
            "user_notes": user_notes,
            "status_history": status_history,
        }
        response = self.client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(details)},
            ],
        )
        return response.output_text

    def chat_about_jd(self, job_description: str, message: str, history: list[dict]) -> str:
        if not self.enabled:
            return (
                "I can help with JD analysis. Focus first on the top 5 required skills, "
                "then map each skill to a specific achievement from your projects or work."
            )

        convo: list[dict[str, Any]] = [
            {
                "role": "system",
                "content": (
                    "You are an expert job application mentor. Answer questions about job descriptions, "
                    "skills, interview prep, and application strategy with concise actionable guidance."
                ),
            },
            {"role": "user", "content": f"Job Description:\n{job_description}"},
        ]
        convo.extend(history[-8:])
        convo.append({"role": "user", "content": message})

        response = self.client.responses.create(model=settings.openai_model, input=convo)
        return response.output_text

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
                    "Add more role-specific keywords from the JD.",
                    "Quantify achievements with metrics.",
                    "Highlight tools and frameworks requested by the employer.",
                ],
                "improved_resume": improved_resume,
            }

        prompt = (
            "Evaluate resume ATS compatibility for the job description. "
            "Return strict JSON with keys: score (0-100 int), gaps (array of strings), improved_resume (string). "
            "The improved_resume must be ATS-friendly plain text (no markdown tables) with these exact section headers: "
            "PROFESSIONAL SUMMARY, CORE SKILLS, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS, ACHIEVEMENTS. "
            "Use concise bullets and quantified impact where possible."
        )
        response = self.client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps({"job_description": job_description, "resume_text": resume_text}),
                },
            ],
        )

        text = response.output_text.strip()
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
