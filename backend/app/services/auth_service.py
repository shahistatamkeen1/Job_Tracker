from datetime import datetime, timedelta
from jose import jwt

from app.config import settings


def create_jwt_for_user(user: dict, expires_minutes: int = 60 * 24 * 7):
    now = datetime.utcnow()
    payload = {
        "sub": user.get("email"),
        "name": user.get("name"),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    return token
