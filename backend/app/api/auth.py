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


@router.get("/auth/gmail/login")
async def gmail_login():
    try:
        auth_url, state = gmail_service.get_auth_url()
        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating Gmail auth URL: {str(e)}")


@router.get("/auth/gmail/callback")
async def gmail_callback(code: str):
    try:
        credentials = gmail_service.get_credentials_from_code(code)

        html = f"""
        <!DOCTYPE html>
        <html>
          <body>
            <script>
              window.opener.postMessage(
                {{
                  type: "gmail-auth-success",
                  access_token: "{credentials.token}",
                  token_type: "Bearer"
                }},
                "http://localhost:5173"
              );
              window.close();
            </script>
            <p>Gmail connected successfully. You can close this window.</p>
          </body>
        </html>
        """

        return HTMLResponse(content=html)

    except Exception as e:
        html = f"""
        <!DOCTYPE html>
        <html>
          <body>
            <script>
              window.opener.postMessage(
                {{
                  type: "gmail-auth-error",
                  error: "{str(e)}"
                }},
                "http://localhost:5173"
              );
              window.close();
            </script>
            <p>Gmail authorization failed.</p>
          </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=500)