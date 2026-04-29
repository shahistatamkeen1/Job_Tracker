from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.jobs import router as jobs_router
from app.api.auth import router as auth_router
from app.api.profile import router as profile_router
from app.config import settings

from app.api.debug_lab import router as debug_lab_router

app = FastAPI(title="AI Job Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}

from urllib.parse import urlencode
from app.config import settings

@app.get("/api/gmail/auth-url")
async def gmail_auth_url():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": "http://127.0.0.1:8000/api/gmail/callback",
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.readonly",
        "access_type": "offline",
        "prompt": "consent",
    }

    return {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    }
@app.get("/api/gmail/callback")
async def gmail_callback(code: str):
    return {"message": "Authorization successful", "code": code}

@app.post("/api/gmail/sync")
async def gmail_sync():
    return {
        "message": "Gmail sync endpoint connected successfully",
        "applications": []
    }

app.include_router(jobs_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(debug_lab_router, prefix="/api")