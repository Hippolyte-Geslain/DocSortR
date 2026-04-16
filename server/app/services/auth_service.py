from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import User

settings = get_settings()

LOCAL_USER_EMAIL = "local@docsortr.local"
LOCAL_USER_NAME = "Utilisateur local"
LOCAL_PROVIDER = "local"
LOCAL_PROVIDER_ID = "1"


async def get_or_create_local_user(db: AsyncSession) -> User:
    """Return the single local user, creating it on first run."""
    result = await db.execute(
        select(User).where(
            User.provider == LOCAL_PROVIDER,
            User.provider_id == LOCAL_PROVIDER_ID,
        )
    )
    user = result.scalar_one_or_none()

    if user:
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        return user

    user = User(
        email=LOCAL_USER_EMAIL,
        name=LOCAL_USER_NAME,
        avatar_url=None,
        provider=LOCAL_PROVIDER,
        provider_id=LOCAL_PROVIDER_ID,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def create_tokens(user: User) -> dict:
    """Create an access + refresh token pair for *user*."""
    now = datetime.now(timezone.utc)

    access_payload = {
        "sub": user.id,
        "email": user.email,
        "type": "access",
        "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
    }
    refresh_payload = {
        "sub": user.id,
        "email": user.email,
        "type": "refresh",
        "exp": now + timedelta(days=settings.jwt_refresh_token_expire_days),
    }

    access_token = jwt.encode(
        access_payload, settings.secret_key, algorithm=settings.jwt_algorithm
    )
    refresh_token = jwt.encode(
        refresh_payload, settings.secret_key, algorithm=settings.jwt_algorithm
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
    }


def verify_refresh_token(token: str) -> dict | None:
    """Decode and validate a refresh token. Returns the payload or None."""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.InvalidTokenError:
        return None

    if payload.get("type") != "refresh":
        return None

    return payload
