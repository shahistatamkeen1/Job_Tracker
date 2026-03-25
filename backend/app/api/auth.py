from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.auth.transport import requests
from google.oauth2 import id_token
from app.config import settings

router = APIRouter(tags=["auth"])


class GoogleTokenRequest(BaseModel):
    token: str


@router.post("/auth/google")
async def google_login(request: GoogleTokenRequest):
    """Verify Google ID token and return user email"""
    try:
        # Get Google Client ID from settings
        google_client_id = settings.google_client_id
        
        if not google_client_id:
            raise HTTPException(status_code=500, detail="Google Client ID not configured")
        
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            request.token,
            requests.Request(),
            google_client_id
        )
        
        # Token is valid, extract user info
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")
        
        # TODO: Save or update user in MongoDB
        # For now, just return the email
        return {
            "email": email,
            "name": name,
            "picture": picture,
            "message": "Login successful"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
