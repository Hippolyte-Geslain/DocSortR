import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import httpx
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import ApiKey, User

settings = get_settings()


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    """Exchange a Google authorization code for user info."""
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        # Fetch user profile
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo_resp.raise_for_status()
        info = userinfo_resp.json()

    return {
        "email": info["email"],
        "name": info.get("name", info["email"]),
        "avatar_url": info.get("picture"),
        "provider_id": str(info["id"]),
    }


# ---------------------------------------------------------------------------
# GitHub OAuth
# ---------------------------------------------------------------------------

async def exchange_github_code(code: str) -> dict:
    """Exchange a GitHub authorization code for user info."""
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        auth_headers = {"Authorization": f"Bearer {access_token}"}

        # Fetch user profile
        user_resp = await client.get(
            "https://api.github.com/user",
            headers=auth_headers,
        )
        user_resp.raise_for_status()
        user_data = user_resp.json()

        # Fetch primary verified email
        emails_resp = await client.get(
            "https://api.github.com/user/emails",
            headers=auth_headers,
        )
        emails_resp.raise_for_status()
        emails = emails_resp.json()

    # Prefer primary verified email, fall back to first verified, then any
    email = None
    for entry in emails:
        if entry.get("primary") and entry.get("verified"):
            email = entry["email"]
            break
    if email is None:
        for entry in emails:
            if entry.get("verified"):
                email = entry["email"]
                break
    if email is None and emails:
        email = emails[0]["email"]

    return {
        "email": email,
        "name": user_data.get("name") or user_data.get("login", ""),
        "avatar_url": user_data.get("avatar_url"),
        "provider_id": str(user_data["id"]),
    }


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

async def get_or_create_user(
    db: AsyncSession, provider: str, user_info: dict
) -> User:
    """Find an existing user by provider + provider_id, or create a new one."""
    result = await db.execute(
        select(User).where(
            User.provider == provider,
            User.provider_id == user_info["provider_id"],
        )
    )
    user = result.scalar_one_or_none()

    if user:
        # Update profile fields that may have changed upstream
        user.name = user_info["name"]
        user.avatar_url = user_info.get("avatar_url")
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        return user

    user = User(
        email=user_info["email"],
        name=user_info["name"],
        avatar_url=user_info.get("avatar_url"),
        provider=provider,
        provider_id=user_info["provider_id"],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------

async def create_api_key(
    db: AsyncSession, user_id: str, name: str
) -> tuple[ApiKey, str]:
    """Generate a new API key for *user_id*. Returns (model, full_key)."""
    raw_key = secrets.token_urlsafe(32)
    key_prefix = raw_key[:8]
    key_hash = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt()).decode()

    api_key = ApiKey(
        user_id=user_id,
        name=name,
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return api_key, raw_key


async def list_api_keys(db: AsyncSession, user_id: str) -> list[ApiKey]:
    """Return all non-revoked API keys for *user_id*."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.user_id == user_id,
            ApiKey.revoked_at.is_(None),
        )
    )
    return list(result.scalars().all())


async def revoke_api_key(db: AsyncSession, user_id: str, key_id: str) -> bool:
    """Soft-revoke an API key. Returns True if the key was found and revoked."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == user_id,
            ApiKey.revoked_at.is_(None),
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        return False

    api_key.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return True
