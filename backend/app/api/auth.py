from fastapi import APIRouter, Request
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth

from app.config import settings
from app.services.auth_service import create_jwt_for_user

router = APIRouter()

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/auth/login")
async def login(request: Request):
    redirect_uri = str(request.url_for("auth_callback"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/callback", name="auth_callback")
async def auth_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user = await oauth.google.parse_id_token(request, token)
    jwt = create_jwt_for_user(user)
    # Redirect back to frontend with token (frontend should store it securely)
    redirect_url = f"{settings.frontend_origin}/?token={jwt}"
    return RedirectResponse(redirect_url)


@router.get("/auth/me")
async def me(request: Request):
    # placeholder - frontend should call with authorization header
    return {"status": "ok"}
