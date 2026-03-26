from fastapi import APIRouter, HTTPException
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


@router.get("/auth/gmail/login")
async def gmail_login():
    """Get Gmail OAuth2 authorization URL"""
    try:
        auth_url, state = gmail_service.get_auth_url()
        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating Gmail auth URL: {str(e)}")


@router.get("/auth/gmail/callback")
async def gmail_callback(code: str):
    """Handle Gmail OAuth2 callback"""
    try:
        credentials = gmail_service.get_credentials_from_code(code)
        
        # Convert credentials to a format we can send to frontend
        return {
            "access_token": credentials.token,
            "token_type": "Bearer",
            "message": "Gmail authorization successful"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error handling Gmail callback: {str(e)}")


