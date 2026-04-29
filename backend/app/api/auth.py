from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from google.auth.transport import requests
from google.oauth2 import id_token

from app.config import settings
from app.services.gmail_service import gmail_service

router = APIRouter(tags=["auth"])


class GoogleTokenRequest(BaseModel):
    token: str


class GmailAuthResponse(BaseModel):
    auth_url: str


@router.post("/auth/google")
async def google_login(request: GoogleTokenRequest):
    try:
        google_client_id = settings.google_client_id

        if not google_client_id:
            raise HTTPException(status_code=500, detail="Google Client ID not configured")

        idinfo = id_token.verify_oauth2_token(
            request.token,
            requests.Request(),
            google_client_id,
        )

        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        return {
            "email": email,
            "name": name,
            "picture": picture,
            "message": "Login successful",
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
