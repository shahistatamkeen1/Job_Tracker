from urllib.parse import urlencode
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.debug_lab import router as debug_lab_router
from app.api.jobs import router as jobs_router
from app.api.profile import router as profile_router
from app.config import settings
from app.db import get_jobs_collection
from app.services.gmail_service import gmail_service

app = FastAPI(title="AI Job Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/gmail/auth-url")
async def gmail_auth_url():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly",
        "access_type": "offline",
        "prompt": "consent",
    }

    return {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?"
        + urlencode(params)
    }


@app.get("/api/auth/gmail/callback")
async def gmail_callback(code: str):
    try:
        credentials = gmail_service.get_credentials_from_code(code)
        gmail_service.set_credentials(credentials)

        html = """
        <!DOCTYPE html>
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage(
                  { type: "gmail-auth-success" },
                  "http://localhost:5173"
                );
                window.close();
              } else {
                window.location.href = "http://localhost:5173/?gmail=connected";
              }
            </script>
            <p>Gmail connected successfully. You can close this window.</p>
          </body>
        </html>
        """
        return HTMLResponse(content=html)

    except Exception as e:
        print("GMAIL AUTH ERROR:", str(e))
        html = f"""
        <!DOCTYPE html>
        <html>
          <body>
            <script>
              if (window.opener) {{
                window.opener.postMessage(
                  {{ type: "gmail-auth-error", error: "{str(e)}" }},
                  "http://localhost:5173"
                );
                window.close();
              }}
            </script>
            <p>Gmail authorization failed: {str(e)}</p>
          </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=500)


@app.get("/api/gmail/callback")
async def gmail_callback_new(code: str):
    return await gmail_callback(code)

@app.post("/api/gmail/sync")
async def gmail_sync():
    try:
        job_emails = gmail_service.get_job_emails(max_results=10)

        if not job_emails:
            return {
                "message": "No high-confidence job application emails found.",
                "applications": [],
                "synced": 0,
            }

        collection = get_jobs_collection()
        created_jobs = []
        now = datetime.utcnow()

        for email_data in job_emails:
            existing = await collection.find_one(
                {
                    "company": email_data["company"],
                    "role": email_data["role"],
                    "source": "gmail",
                }
            )

            if existing:
                continue

            doc = {
                "company": email_data["company"],
                "role": email_data["role"],
                "status": email_data["status"],
                "job_description": email_data.get("email_body_preview", ""),
                "applied_on": datetime.combine(
                    email_data["applied_on"], datetime.min.time()
                ),
                "notes": f"Imported from Gmail: {email_data['email_subject']}",
                "ai_rejection_reason": "",
                "status_history": [
                    {
                        "status": email_data["status"],
                        "note": "Imported from Gmail AI parser",
                        "at": now.isoformat(),
                    }
                ],
                "source": "gmail",
                "email_subject": email_data["email_subject"],
                "email_from": email_data["email_from"],
                "confidence": email_data.get("confidence", 0),
                "created_at": now,
                "updated_at": now,
            }

            result = await collection.insert_one(doc)
            created = await collection.find_one({"_id": result.inserted_id})
            created["id"] = str(created.pop("_id"))
            created_jobs.append(created)

        return {
            "message": f"Imported {len(created_jobs)} high-confidence applications from Gmail.",
            "applications": created_jobs,
            "synced": len(created_jobs),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail sync failed: {str(e)}")


app.include_router(jobs_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(debug_lab_router, prefix="/api")