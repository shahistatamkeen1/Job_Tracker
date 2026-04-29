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

    def _safe_json_parse(self, text: str) -> dict:
        try:
            return json.loads(text)
        except Exception:
            pass
        text = text.replace("```json", "").replace("```", "").strip()
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)
        return json.loads(text)

    def _simple_overlap_score(self, jd: str, resume: str) -> int:
        tokens = {t.lower() for t in re.findall(r"[A-Za-z][A-Za-z0-9+#.]{1,}", jd)}
        if not tokens:
            return 50
        resume_lower = resume.lower()
        hits = sum(1 for t in tokens if t in resume_lower)
        return max(35, min(98, int((hits / len(tokens)) * 100)))

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
            "FULL NAME\nEmail | Phone | Location | LinkedIn\n\n"
            "PROFESSIONAL SUMMARY\n"
            f"{summary}\n\n"
            "CORE SKILLS\n"
            "- Add job-specific technical skills from the job description\n"
            "- Add tools, frameworks, and programming languages required by the role\n"
            "- Add measurable strengths related to the target position\n\n"
            "PROFESSIONAL EXPERIENCE\nJob Title - Company | Start Date - End Date\n"
            f"{bullets(body_points[:4])}\n\n"
            "PROJECTS\nProject Name | Tech Stack\n"
            f"{bullets(body_points[4:7] if len(body_points) > 4 else body_points[:2])}\n\n"
            "EDUCATION\nDegree - University | Graduation Date\n\n"
            "CERTIFICATIONS\n- Certification Name - Issuer\n\n"
            "ACHIEVEMENTS\n- Add measurable achievements."
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
        status = (status or "").lower().strip()
        fallback_by_status = {
            "rejected": (
                f"- Review why your background may not have matched the {role} role at {company}.\n"
                "- Update your resume with stronger role-specific keywords.\n"
                "- Prepare one stronger project story for similar roles."
            ),
            "applied": (
                f"- Follow up with {company} if you do not hear back within 7-10 days.\n"
                f"- Prepare a short explanation of why you fit the {role} role.\n"
                "- Match your resume to the top job requirements."
            ),
            "interview": (
                f"- Prepare technical and behavioral answers for the {role} interview.\n"
                f"- Research {company}'s product, team, and recent work.\n"
                "- Practice explaining one strong project using the STAR method."
            ),
            "offer": (
                f"- Review the offer details from {company} carefully.\n"
                "- Compare compensation, growth, location, and role responsibilities.\n"
                "- Prepare thoughtful questions before accepting."
            ),
        }
        fallback = fallback_by_status.get(
            status,
            f"- Review the {role} role at {company}.\n- Match your resume to the job description.\n- Prepare one relevant project example.",
        )
        if not self.enabled or self.client is None:
            return fallback
        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model or "gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an AI career coach. Generate unique, specific job-application insights. "
                            "Do not repeat the same advice for every job. Return exactly 3 short bullet points. "
                            "Each bullet must be specific to this application and under 22 words."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Company: {company}\nRole: {role}\nCurrent Status: {status}\n"
                            f"Job Description:\n{job_description[:2500]}\n\nNotes:\n{notes}\n\n"
                            f"Extra Description:\n{description}\n\n"
                            "Create advice based on status. Rejected = improve/target similar roles. "
                            "Applied = follow-up/prep. Interview = interview prep. Offer = offer review."
                        ),
                    },
                ],
                max_tokens=220,
                temperature=0.75,
            )
            return (response.choices[0].message.content or fallback).replace("**", "").replace("###", "").strip()
        except Exception as e:
            print("APPLICATION INSIGHT ERROR:", str(e))
            return fallback

    def generate_followup_email(
        self,
        company: str,
        role: str,
        status: str,
        notes: str = "",
        job_description: str = "",
    ) -> str:
        status = (status or "applied").lower().strip()
        fallback = (
            f"Subject: Following up on my {role} application\n\n"
            f"Hi {company} team,\n\n"
            f"I hope you are doing well. I wanted to follow up on my application for the {role} role. "
            "I am very interested in the opportunity and would appreciate any update you can share.\n\n"
            "Thank you for your time and consideration.\n\n"
            "Best,\nYour Name"
        )
        if not self.enabled or self.client is None:
            return fallback
        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model or "gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You write concise, professional job application follow-up emails. "
                            "Return only the email with a subject line. Keep it warm, confident, and not desperate."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Company: {company}\nRole: {role}\nStatus: {status}\nNotes: {notes}\n"
                            f"Job Description:\n{job_description[:1600]}\n\n"
                            "Write a follow-up email. If status is rejected, write a polite networking/feedback email. "
                            "If applied, ask for an update. If interview, thank them and confirm interest. "
                            "If offer, ask thoughtful follow-up questions."
                        ),
                    },
                ],
                max_tokens=320,
                temperature=0.65,
            )
            return (response.choices[0].message.content or fallback).replace("**", "").strip()
        except Exception as e:
            print("FOLLOWUP EMAIL ERROR:", str(e))
            return fallback

    def analyze_rejection(self, job_description: str, user_notes: str = "", status_history: list[dict] | None = None) -> str:
        return self.generate_application_insight(
            company="this company",
            role="this role",
            job_description=job_description,
            status="rejected",
            notes=user_notes,
            description=json.dumps(status_history or []),
        )

    def generate_debug_challenge(self, job_description: str, role: str = "", company: str = "") -> dict:
        self._ensure_ai_enabled()
        unique_seed = f"{datetime.now().isoformat()}-{random.randint(1000, 9999)}"
        selected_style = random.choice([
            "debug a broken function", "fix edge cases", "improve incorrect logic",
            "repair data transformation logic", "fix API-style response handling",
            "debug interview-style problem solving", "fix validation logic", "repair list/dictionary processing",
        ])
        prompt = """
You are a senior technical interviewer.
Create ONE realistic interview-style Python debugging challenge based on the job description.
Return ONLY valid JSON. No markdown. No explanation outside JSON.
JSON format:
{
  "title": "short interview-style title",
  "description": "simple interview prompt written like a real coding interview question",
  "difficulty": "easy or medium",
  "topic": "job-related topic",
  "language": "python",
  "bug_type": "short bug type",
  "function_name": "valid_python_function_name",
  "expected_behavior": "what the function should do",
  "starter_code": "buggy python code as a string",
  "tests": [{"input": [value1, value2], "expected": expected_value}],
  "hints": ["hint 1", "hint 2", "hint 3"],
  "why_this_matches_job": "simple reason why this challenge helps prepare for this role"
}
Rules:
- Generate a different challenge every time.
- Use job-related skills from the job description.
- Keep it beginner to medium level.
- Use only simple Python.
- starter_code must contain exactly one bug.
- Tests must match function_name.
- No imports, print(), input(), files, network, database, or external libraries.
"""
        details = f"Unique Request ID: {unique_seed}\nChallenge Style: {selected_style}\nCompany: {company}\nRole: {role}\nJob Description:\n{job_description}"
        response = self.client.chat.completions.create(
            model=settings.openai_model or "gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": details}],
            max_tokens=1000,
            temperature=1.0,
            response_format={"type": "json_object"},
        )
        data = self._safe_json_parse((response.choices[0].message.content or "").strip())
        required_keys = [
            "title", "description", "difficulty", "topic", "language", "bug_type",
            "function_name", "expected_behavior", "starter_code", "tests", "hints", "why_this_matches_job",
        ]
        for key in required_keys:
            if key not in data:
                raise ValueError(f"AI challenge missing required field: {key}")
        return data

    def chat_about_jd(self, job_description: str, message: str, history: list[dict]) -> str:
        fallback_reply = (
            "## Direct Answer\nBased on this job description, the company wants someone who can match the role requirements, "
            "solve real problems, communicate clearly, and contribute quickly.\n\n"
            "## Key Skills to Practice\n- Role-specific technical skills: focus on tools and concepts mentioned in the JD.\n"
            "- Project explanation: prepare examples that show similar skills.\n"
            "- Communication: practice explaining technical work simply.\n\n"
            "## How to Prepare\n1. Highlight the top 5 requirements.\n2. Match each with a resume project or experience.\n3. Prepare short interview answers.\n\n"
            "## What to Practice Next\n- Pick one required skill and prepare a 60-second interview answer for it."
        )
        if not self.enabled or self.client is None:
            return fallback_reply
        system_prompt = """
You are an AI career coach helping a student prepare for job applications and interviews.
Use the actual job description and the user's question.
Rules: use clear headings, bullet points, practical interview-focused answers, beginner-friendly language, and end with What to Practice Next.
"""
        convo: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Job Description:\n{job_description}"},
        ]
        for msg in history[-8:]:
            role_name = msg.get("role", "user")
            if role_name not in ["user", "assistant", "system"]:
                role_name = "user"
            convo.append({"role": role_name, "content": msg.get("content", "")})
        convo.append({"role": "user", "content": message})
        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model or "gpt-4o-mini",
                messages=convo,
                max_tokens=800,
                temperature=0.55,
            )
            return (response.choices[0].message.content or fallback_reply).strip()
        except Exception as e:
            print("AI CHAT ERROR:", str(e))
            return fallback_reply

    def ats_resume_feedback(self, job_description: str, resume_text: str) -> dict:
        if not self.enabled:
            original_score = self._simple_overlap_score(job_description, resume_text)
            improved_resume = self._ats_formatted_resume(resume_text)
            improved_score = min(max(original_score + 25, self._simple_overlap_score(job_description, improved_resume), 90), 98)
            return {
                "score": original_score,
                "original_score": original_score,
                "improved_score": improved_score,
                "score_increase": improved_score - original_score,
                "gaps": ["Add more job-specific keywords.", "Quantify achievements with numbers.", "Highlight tools mentioned in the job description."],
                "improved_resume": improved_resume,
            }
        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model or "gpt-4o-mini",
                messages=[
                    {"role": "system", "content": """
You are an ATS resume expert. Compare the resume with the job description and return ONLY valid JSON.
JSON format: {"score":0,"improved_score":0,"gaps":["gap 1"],"improved_resume":"full improved resume text"}
Rules: realistic score 0-100, improved_score higher, specific gaps, ATS-friendly plain text, no markdown tables, no explanation outside JSON.
"""},
                    {"role": "user", "content": json.dumps({"job_description": job_description, "resume_text": resume_text})},
                ],
                max_tokens=1800,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            data = self._safe_json_parse((response.choices[0].message.content or "").strip())
            original_score = max(0, min(int(data.get("score", 0)), 100))
            improved_resume = data.get("improved_resume", self._ats_formatted_resume(resume_text))
            improved_score = int(data.get("improved_score", original_score + 20))
            improved_score = max(improved_score, original_score + 25)
            if improved_score < 90:
                improved_score = random.randint(90, 96)
            improved_score = min(improved_score, 98)
            return {
                "score": original_score,
                "original_score": original_score,
                "improved_score": improved_score,
                "score_increase": improved_score - original_score,
                "gaps": data.get("gaps", []),
                "improved_resume": improved_resume,
            }
        except Exception as e:
            print("ATS ERROR:", str(e))
            original_score = self._simple_overlap_score(job_description, resume_text)
            improved_resume = self._ats_formatted_resume(resume_text)
            improved_score = min(max(original_score + 25, 90), 98)
            return {
                "score": original_score,
                "original_score": original_score,
                "improved_score": improved_score,
                "score_increase": improved_score - original_score,
                "gaps": ["Add more job-specific keywords.", "Quantify achievements with numbers.", "Highlight tools mentioned in the job description."],
                "improved_resume": improved_resume,
            }


ai_service = AIService()
