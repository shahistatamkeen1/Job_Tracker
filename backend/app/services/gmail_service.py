import base64
import json
import re
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Optional

from bs4 import BeautifulSoup
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from openai import OpenAI

from app.config import settings


class GmailService:
    SCOPES = [
        "openid",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    def __init__(self):
        self.service = None
        self.credentials = None
        self.ai_enabled = bool(settings.openai_api_key)
        self.client = OpenAI(api_key=settings.openai_api_key) if self.ai_enabled else None

    def _client_config(self):
        return {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        }

    def get_credentials_from_code(self, code: str):
        flow = Flow.from_client_config(
            self._client_config(),
            scopes=self.SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )
        flow.fetch_token(code=code)
        return flow.credentials

    def set_credentials(self, credentials: Credentials):
        self.credentials = credentials
        self.service = build("gmail", "v1", credentials=credentials)

    def get_job_emails(self, max_results: int = 30) -> list[dict]:
        if not self.service:
            raise ValueError("Gmail is not connected yet.")

        query = (
    'newer_than:365d '
    '("thank you for applying" OR "application received" OR '
    '"application submitted" OR "we received your application" OR '
    '"your application" OR "schedule an interview" OR '
    '"phone screen" OR "next steps" OR "not moving forward" OR '
    '"unfortunately" OR "offer letter")'
)

        results = (
            self.service.users()
            .messages()
            .list(userId="me", q=query, maxResults=max_results)
            .execute()
        )

        messages = results.get("messages", [])
        print("GMAIL RAW MESSAGES FOUND:", len(messages))

        extracted_jobs = []

        for message in messages:
            print("CHECKING EMAIL ID:", message["id"])
            parsed = self.extract_job_info(message["id"])
            print("PARSED RESULT:", parsed)
            if parsed:
                extracted_jobs.append(parsed)

        return extracted_jobs

    def extract_job_info(self, message_id: str) -> Optional[dict]:
        try:
            message = (
                self.service.users()
                .messages()
                .get(userId="me", id=message_id, format="full")
                .execute()
            )

            headers = message["payload"].get("headers", [])
            subject = self._header(headers, "subject")
            sender = self._header(headers, "from")
            date_str = self._header(headers, "date")
            body = self._get_message_body(message)

            print("EMAIL SUBJECT:", subject)
            print("EMAIL FROM:", sender)

            parsed = self._ai_parse_email(subject, sender, body)

            print("AI PARSED:", parsed)

            if not parsed:
                return None

            if not parsed.get("is_job_application"):
                print("SKIPPED REASON:", parsed.get("reason", "Not a job application"))
                return None

            if parsed.get("confidence", 0) < 50:
                print("SKIPPED LOW CONFIDENCE:", parsed.get("confidence"))
                return None

            company = self._clean(parsed.get("company", ""))
            role = self._clean(parsed.get("role", ""))
            status = self._clean(parsed.get("status", "")).lower()

            if not company or not role or status not in {"applied", "interview", "rejected", "offer"}:
                return None

            try:
                email_date = parsedate_to_datetime(date_str).date()
            except Exception:
                email_date = datetime.now().date()

            return {
                "company": company,
                "role": role,
                "status": status,
                "applied_on": email_date,
                "email_subject": subject,
                "email_from": sender,
                "email_body_preview": body[:700],
                "confidence": parsed.get("confidence", 0),
                "source": "gmail",
            }

        except Exception as e:
            print(f"Gmail parse error: {e}")
            return None

    def _ai_parse_email(self, subject: str, sender: str, body: str) -> Optional[dict]:
        if not self.ai_enabled or not self.client:
            return self._fallback_parse(subject, sender, body)

        prompt = """
You are an expert Gmail job-application parser.

Extract job application information from the email.

Return ONLY valid JSON:
{
  "is_job_application": true,
  "company": "",
  "role": "",
  "status": "applied | interview | rejected | offer",
  "confidence": 0,
  "reason": ""
}

Rules:
- Only return is_job_application=true if the email is about a specific job application.
- Ignore newsletters, job alerts, job fairs, marketing, reminders, advice articles, and generic career emails.
- Company must be the employer/company hiring, not the sender platform unless that is the employer.
- Role must be the actual job title.
- Status:
  applied = application received/submitted/thank you for applying
  interview = interview/screen/assessment/next round/schedule
  rejected = unfortunately/not moving forward/not selected
  offer = offer/congratulations/hired/start date
- If company or role is unclear, set is_job_application=false.
- confidence must be 0-100.
"""

        content = f"""
Subject: {subject}
From: {sender}
Body:
{body[:3500]}
"""

        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model or "gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": content},
                ],
                temperature=0.1,
                max_tokens=350,
                response_format={"type": "json_object"},
            )

            return json.loads(response.choices[0].message.content or "{}")

        except Exception as e:
            print(f"AI Gmail parser failed, using fallback: {e}")
            return self._fallback_parse(subject, sender, body)

    def _fallback_parse(self, subject: str, sender: str, body: str) -> Optional[dict]:
        text = f"{subject} {body}".lower()

        junk = ["job fair", "newsletter", "learn how", "we want to give you a boost", "recommended jobs"]
        if any(x in text for x in junk):
            return {"is_job_application": False, "confidence": 0}

        status = ""
        if any(x in text for x in ["not moving forward", "unfortunately", "not selected"]):
            status = "rejected"
        elif any(x in text for x in ["interview", "phone screen", "schedule", "assessment"]):
            status = "interview"
        elif any(x in text for x in ["offer", "congratulations", "hired"]):
            status = "offer"
        elif any(x in text for x in ["thank you for applying", "application received", "submitted"]):
            status = "applied"

        role_match = re.search(
            r"(?:application for|applied for|for the)\s+([A-Za-z0-9&.'+/#\- ]{4,80})",
            f"{subject} {body}",
            re.I,
        )

        role = self._clean(role_match.group(1)) if role_match else ""

        company_match = re.search(
            r"(?:at|with|to)\s+([A-Z][A-Za-z0-9&.'\- ]{2,60})",
            f"{subject} {body}",
        )

        company = self._clean(company_match.group(1)) if company_match else ""

        confidence = 85 if company and role and status else 0

        return {
            "is_job_application": bool(company and role and status),
            "company": company,
            "role": role,
            "status": status,
            "confidence": confidence,
            "reason": "Fallback parser",
        }

    def _header(self, headers: list[dict], name: str) -> str:
        return next((h["value"] for h in headers if h["name"].lower() == name), "")

    def _clean(self, value: str) -> str:
        value = re.sub(r"\s+", " ", value or "").strip()
        value = value.strip(" .,-|:;")
        return value

    def _get_message_body(self, message: dict) -> str:
        try:
            payload = message.get("payload", {})

            def decode(part):
                data = part.get("body", {}).get("data")
                if not data:
                    return ""
                text = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                if "<" in text and ">" in text:
                    text = BeautifulSoup(text, "html.parser").get_text(" ")
                return self._clean(text)

            def walk(part):
                items = []
                if part.get("mimeType") in {"text/plain", "text/html"}:
                    items.append((part.get("mimeType"), decode(part)))
                for child in part.get("parts", []) or []:
                    items.extend(walk(child))
                return items

            parts = walk(payload)
            plain = [text for mime, text in parts if mime == "text/plain" and text]
            html = [text for mime, text in parts if mime == "text/html" and text]

            return "\n".join(plain or html).strip()

        except Exception as e:
            print(f"Body extraction failed: {e}")
            return ""


gmail_service = GmailService()