"""Gmail integration service for extracting job application emails."""

import base64
import re
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import settings


class GmailService:
    """Service to interact with Gmail API and extract job-related information."""

    SCOPES = [
        "openid",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    def __init__(self):
        self.service = None
        self.credentials = None

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

    def get_auth_url(self):
        flow = Flow.from_client_config(
            self._client_config(),
            scopes=self.SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )

        auth_url, state = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            include_granted_scopes="true",
        )
        return auth_url, state

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

    def get_job_emails(self, max_results: int = 10) -> list[dict]:
        if not self.service:
            raise ValueError("Gmail service not authenticated")

        query = (
            'newer_than:180d '
            '(subject:application OR subject:interview OR subject:position OR '
            'subject:job OR subject:offer OR subject:rejection OR subject:"thank you for applying")'
        )

        print(f"Gmail query: {query}")

        try:
            results = (
                self.service.users()
                .messages()
                .list(userId="me", q=query, maxResults=max_results)
                .execute()
            )

            messages = results.get("messages", [])
            print(f"Found {len(messages)} messages matching query")

            job_data = []

            for message in messages:
                msg_data = self.extract_job_info(message["id"])
                if msg_data:
                    job_data.append(msg_data)
                    print(
                        f"Extracted job data: "
                        f"{msg_data['company']} - {msg_data['role']} - {msg_data['status']}"
                    )

            return job_data

        except Exception as e:
            print(f"Error fetching emails: {e}")
            return []

    def extract_job_info(self, message_id: str) -> Optional[dict]:
        try:
            message = (
                self.service.users()
                .messages()
                .get(userId="me", id=message_id, format="full")
                .execute()
            )

            headers = message["payload"].get("headers", [])
            subject = next((h["value"] for h in headers if h["name"].lower() == "subject"), "")
            sender = next((h["value"] for h in headers if h["name"].lower() == "from"), "")
            date_str = next((h["value"] for h in headers if h["name"].lower() == "date"), "")

            print(f"Processing email: {subject} from {sender}")

            try:
                from email.utils import parsedate_to_datetime

                email_date = parsedate_to_datetime(date_str).date()
            except Exception:
                email_date = datetime.now().date()

            body = self._get_message_body(message)

            company = self._extract_company(subject, sender, body)
            role = self._extract_role(subject, body)
            status = self._extract_status(subject, body)

            return {
                "company": company,
                "role": role,
                "status": status,
                "applied_on": email_date,
                "email_subject": subject,
                "email_from": sender,
                "email_body_preview": body[:500],
                "source": "gmail",
            }

        except Exception as e:
            print(f"Error extracting job info from message {message_id}: {e}")
            return None

    def _get_message_body(self, message: dict) -> str:
        try:
            payload = message.get("payload", {})

            def decode_body(part):
                data = part.get("body", {}).get("data")
                if not data:
                    return ""
                text = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                if "<" in text and ">" in text:
                    text = BeautifulSoup(text, "html.parser").get_text(" ")
                return text.strip()

            if "parts" not in payload:
                return decode_body(payload)

            text_parts = []
            html_parts = []

            for part in payload.get("parts", []):
                mime_type = part.get("mimeType", "")

                if mime_type == "text/plain":
                    text_parts.append(decode_body(part))
                elif mime_type == "text/html":
                    html_parts.append(decode_body(part))

                for subpart in part.get("parts", []):
                    sub_mime_type = subpart.get("mimeType", "")
                    if sub_mime_type == "text/plain":
                        text_parts.append(decode_body(subpart))
                    elif sub_mime_type == "text/html":
                        html_parts.append(decode_body(subpart))

            body = "\n".join([p for p in text_parts if p]).strip()
            if not body:
                body = "\n".join([p for p in html_parts if p]).strip()

            return body

        except Exception as e:
            print(f"Error extracting body: {e}")
            return ""

    def _clean_value(self, value: str) -> str:
        value = re.sub(r"\s+", " ", value or "").strip()
        value = value.strip(" .,-|:")
        return value

    def _extract_company(self, subject: str, sender: str, body: str) -> str:
        sender_lower = sender.lower()

        ignored_domains = {
            "gmail",
            "google",
            "workday",
            "greenhouse",
            "lever",
            "smartrecruiters",
            "icims",
            "ashbyhq",
            "linkedin",
            "indeed",
            "ziprecruiter",
            "noreply",
            "mail",
            "myworkdayjobs",
        }

        email_match = re.search(r"@([a-zA-Z0-9.-]+)", sender_lower)
        if email_match:
            domain_parts = email_match.group(1).split(".")
            domain = domain_parts[0]
            if domain not in ignored_domains:
                return domain.replace("-", " ").replace("_", " ").title()

        text = f"{subject}\n{body}"

        patterns = [
            r"Thank you for applying to\s+([A-Z][A-Za-z0-9&.,'\s-]{2,80})",
            r"Thank you for your interest in\s+([A-Z][A-Za-z0-9&.,'\s-]{2,80})",
            r"Your application to\s+([A-Z][A-Za-z0-9&.,'\s-]{2,80})",
            r"application with\s+([A-Z][A-Za-z0-9&.,'\s-]{2,80})",
            r"application at\s+([A-Z][A-Za-z0-9&.,'\s-]{2,80})",
            r"interview with\s+([A-Z][A-Za-z0-9&.,'\s-]{2,80})",
            r"from\s+([A-Z][A-Za-z0-9&.,'\s-]{2,80})",
        ]

        stop_words = [
            "for",
            "regarding",
            "has",
            "was",
            "is",
            "we",
            "team",
            "careers",
            "recruiting",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                company = self._clean_value(match.group(1).split("\n")[0])
                for word in stop_words:
                    company = re.split(rf"\b{word}\b", company, flags=re.IGNORECASE)[0].strip()
                if 2 < len(company) < 80:
                    return company.title()

        return "Unknown Company"

    def _extract_role(self, subject: str, body: str) -> str:
        text = f"{subject}\n{body}"

        patterns = [
            r"your application for\s+([A-Za-z0-9&.,'\s/-]{3,90})",
            r"application for\s+([A-Za-z0-9&.,'\s/-]{3,90})",
            r"applied for\s+([A-Za-z0-9&.,'\s/-]{3,90})",
            r"for the\s+([A-Za-z0-9&.,'\s/-]{3,90})\s+(?:position|role|job)",
            r"position:\s*([A-Za-z0-9&.,'\s/-]{3,90})",
            r"role:\s*([A-Za-z0-9&.,'\s/-]{3,90})",
            r"job title:\s*([A-Za-z0-9&.,'\s/-]{3,90})",
            r"re:\s*([A-Za-z0-9&.,'\s/-]{3,90})",
        ]

        stop_phrases = [
            "at",
            "with",
            "has",
            "was",
            "is",
            "thank",
            "received",
            "submitted",
            "interview",
            "application",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                role = self._clean_value(match.group(1).split("\n")[0])
                for phrase in stop_phrases:
                    role = re.split(rf"\b{phrase}\b", role, flags=re.IGNORECASE)[0].strip()
                role = self._clean_value(role)
                if 3 < len(role) < 90:
                    return role.title()

        lower = text.lower()

        role_keywords = [
            ("full stack developer", "Full Stack Developer"),
            ("fullstack developer", "Full Stack Developer"),
            ("software engineer", "Software Engineer"),
            ("software developer", "Software Developer"),
            ("frontend developer", "Frontend Developer"),
            ("front-end developer", "Frontend Developer"),
            ("backend developer", "Backend Developer"),
            ("back-end developer", "Backend Developer"),
            ("data analyst", "Data Analyst"),
            ("data scientist", "Data Scientist"),
            ("machine learning engineer", "Machine Learning Engineer"),
            ("ai engineer", "AI Engineer"),
            ("ai developer", "AI Developer"),
            ("business analyst", "Business Analyst"),
            ("developer", "Developer"),
            ("engineer", "Engineer"),
            ("analyst", "Analyst"),
        ]

        for keyword, label in role_keywords:
            if keyword in lower:
                return label

        return "Position"

    def _extract_status(self, subject: str, body: str) -> str:
        combined_text = f"{subject} {body}".lower()

        if re.search(r"(offer|congratulations|accepted|hired|welcome|start date)", combined_text):
            return "offer"

        if re.search(r"(interview|phone screen|next round|schedule|meet|discuss)", combined_text):
            return "interview"

        if re.search(r"(unfortunately|not selected|not moving forward|declined|rejected|not a fit)", combined_text):
            return "rejected"

        if re.search(r"(application received|received your application|submitted|thank you for applying|thank you for your application)", combined_text):
            return "applied"

        return "applied"


gmail_service = GmailService()