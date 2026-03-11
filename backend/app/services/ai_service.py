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
            score = self._simple_overlap_score(job_description, resume_text)
            return {
                "score": score,
                "gaps": [
                    "Add more role-specific keywords from the JD.",
                    "Quantify achievements with metrics.",
                    "Highlight tools and frameworks requested by the employer.",
                ],
                "improved_resume": resume_text,
            }

        prompt = (
            "Evaluate resume ATS compatibility for the job description. "
            "Return strict JSON with keys: score (0-100 int), gaps (array of strings), improved_resume (string)."
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
            return {
                "score": int(data.get("score", 0)),
                "gaps": data.get("gaps", []),
                "improved_resume": data.get("improved_resume", resume_text),
            }
        except json.JSONDecodeError:
            score = self._simple_overlap_score(job_description, resume_text)
            return {
                "score": score,
                "gaps": ["Model returned non-JSON output. Using fallback scoring."],
                "improved_resume": resume_text,
            }


ai_service = AIService()
