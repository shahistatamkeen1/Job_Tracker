"""Gmail integration service for extracting job application emails."""

import base64
import re
from datetime import datetime
from typing import Optional
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from bs4 import BeautifulSoup

from app.config import settings


class GmailService:
    """Service to interact with Gmail API and extract job-related information."""

    SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

    def __init__(self):
        self.service = None
        self.credentials = None

    def get_auth_url(self):
        """Generate the OAuth2 URL for user authorization."""
        flow = Flow.from_client_config(
            {
                "installed": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=self.SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )
        auth_url, state = flow.authorization_url(
            access_type="offline",
            prompt="consent",
        )
        return auth_url, state

    def get_credentials_from_code(self, code: str):
        """Exchange authorization code for credentials."""
        flow = Flow.from_client_config(
            {
                "installed": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=self.SCOPES,
            redirect_uri=settings.google_redirect_uri,
        )
        flow.fetch_token(code=code)
        return flow.credentials

    def set_credentials(self, credentials: Credentials):
        """Set credentials for Gmail API access."""
        self.credentials = credentials
        self.service = build("gmail", "v1", credentials=credentials)

    def get_job_emails(self, max_results: int = 50) -> list[dict]:
        """
        Fetch job-related emails from Gmail.
        Filters for common job keywords in subject lines.
        """
        if not self.service:
            raise ValueError("Gmail service not authenticated")

        # Keywords to identify job-related emails
        keywords = [
            "job",
            "position",
            "application",
            "interview",
            "offer",
            "rejection",
            "hired",
            "opportunity",
            "vacancy",
            "recruitment",
        ]

        # Build Gmail query for job-related emails
        query_parts = [f"subject:{kw}" for kw in keywords]
        query = f"from:noreply@ OR from:careers@ OR from:jobs@ OR from:recruitment@ OR ({' OR '.join(query_parts)})"

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
                    print(f"Extracted job data: {msg_data['company']} - {msg_data['role']}")

            print(f"Successfully extracted {len(job_data)} job applications")
            return job_data

        except Exception as e:
            print(f"Error fetching emails: {e}")
            return []

    def extract_job_info(self, message_id: str) -> Optional[dict]:
        """Extract job information from an email message."""
        try:
            message = self.service.users().messages().get(userId="me", id=message_id).execute()

            headers = message["payload"].get("headers", [])
            subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
            sender = next((h["value"] for h in headers if h["name"] == "From"), "")
            date_str = next((h["value"] for h in headers if h["name"] == "Date"), "")

            print(f"Processing email: {subject} from {sender}")

            # Parse email date
            try:
                from email.utils import parsedate_to_datetime

                email_date = parsedate_to_datetime(date_str).date()
            except:
                email_date = datetime.now().date()

            # Extract body
            body = self._get_message_body(message)

            # Extract job information from subject and body
            company = self._extract_company(subject, sender, body)
            role = self._extract_role(subject, body)
            status = self._extract_status(subject, body)

            print(f"Extracted: Company={company}, Role={role}, Status={status}")

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
        """Extract body text from an email message."""
        try:
            if "parts" in message["payload"]:
                parts = message["payload"]["parts"]
                body_part = next(
                    (p for p in parts if p["mimeType"] == "text/plain"), None
                )
                if not body_part and parts:
                    body_part = parts[0]
            else:
                body_part = message["payload"]

            if "data" in body_part["body"]:
                data = body_part["body"]["data"]
                text = base64.urlsafe_b64decode(data).decode("utf-8")
                # Remove HTML if present
                if "<" in text:
                    text = BeautifulSoup(text, "html.parser").get_text()
                return text.strip()
            return ""
        except Exception as e:
            print(f"Error extracting body: {e}")
            return ""

    def _extract_company(self, subject: str, sender: str, body: str) -> str:
        """Extract company name from email components."""
        # Try to extract from sender email
        if "careers@" in sender or "jobs@" in sender or "recruitment@" in sender:
            company_match = re.search(r"@(\w+)\.", sender)
            if company_match:
                company = company_match.group(1).title()
                return company

        # Try to extract from subject line
        # Look for company name patterns
        patterns = [
            r"from\s+([A-Z][a-zA-Z\s]+)",
            r"at\s+([A-Z][a-zA-Z\s]+)",
            r"(?:Congratulations|Thank you|We appreciate).*?([A-Z][a-zA-Z\s]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, subject, re.IGNORECASE)
            if match:
                company = match.group(1).strip()
                if company and len(company) > 2:
                    return company.title()

        # Try to extract from body (look for company mentions)
        company_patterns = [
            r"[Dd]ear\s+(?:Candidate|Applicant)[,\s]*([A-Z][a-zA-Z\s]+)",
            r"[Tt]hank you for your interest in\s+([A-Z][a-zA-Z\s&]+)",
            r"(?:welcome|join)\s+([A-Z][a-zA-Z\s&]+)",
        ]

        for pattern in company_patterns:
            match = re.search(pattern, body)
            if match:
                company = match.group(1).strip().split("\n")[0]
                if company and len(company) > 2:
                    return company.title()

        return "Unknown Company"

    def _extract_role(self, subject: str, body: str) -> str:
        """Extract job role/position from email components."""
        # Look for common role patterns
        patterns = [
            r"(?:position|role|job|title)\s+(?:of|for)\s+([A-Za-z\s]+)",
            r"([A-Za-z\s]+)\s+(?:position|role|job)",
            r"(?:Congratulations|offer).*?([A-Za-z\s]+)\s+(?:position|role|job)",
        ]

        combined_text = f"{subject} {body}"

        for pattern in patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                role = match.group(1).strip()
                if role and len(role) > 2 and len(role) < 100:
                    return role

        # Default extraction
        if "software" in combined_text.lower():
            return "Software Engineer"
        if "developer" in combined_text.lower():
            return "Developer"
        if "engineer" in combined_text.lower():
            return "Engineer"
        if "analyst" in combined_text.lower():
            return "Analyst"

        return "Position"

    def _extract_status(self, subject: str, body: str) -> str:
        """Extract application status from email content."""
        combined_text = f"{subject} {body}".lower()

        if re.search(
            r"(?:congratulations|offer|accepted|hired|welcome|start date)",
            combined_text,
        ):
            return "offer"

        if re.search(
            r"(?:interview|phone screen|next round|schedule|meet|discuss)",
            combined_text,
        ):
            return "interview"

        if re.search(
            r"(?:rejected|unfortunately|declined|not selected|not a fit)",
            combined_text,
        ):
            return "rejected"

        if re.search(
            r"(?:received|application|submitted|thank you for)",
            combined_text,
        ):
            return "applied"

        return "applied"


gmail_service = GmailService()
