import base64
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models import User
from app.schemas.auth import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

@router.get("/google")
async def google_login(redirect_uri: str = Query(...)):
    """Redirect the user to Google's consent screen."""
    state = base64.urlsafe_b64encode(redirect_uri.encode()).decode()
    params = urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": _google_callback_url(),
        "response_type": "code",
        "scope": "email profile",
        "state": state,
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle the OAuth callback from Google."""
    redirect_uri = base64.urlsafe_b64decode(state.encode()).decode()

    try:
        user_info = await auth_service.exchange_google_code(
            code, _google_callback_url()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth failed: {exc}",
        )

    user = await auth_service.get_or_create_user(db, "google", user_info)
    tokens = auth_service.create_tokens(user)

    params = urlencode({
        "token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    })
    return RedirectResponse(f"{redirect_uri}?{params}")


# ---------------------------------------------------------------------------
# GitHub OAuth
# ---------------------------------------------------------------------------

@router.get("/github")
async def github_login(redirect_uri: str = Query(...)):
    """Redirect the user to GitHub's authorization screen."""
    state = base64.urlsafe_b64encode(redirect_uri.encode()).decode()
    params = urlencode({
        "client_id": settings.github_client_id,
        "redirect_uri": _github_callback_url(),
        "scope": "user:email",
        "state": state,
    })
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle the OAuth callback from GitHub."""
    redirect_uri = base64.urlsafe_b64decode(state.encode()).decode()

    try:
        user_info = await auth_service.exchange_github_code(code)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub OAuth failed: {exc}",
        )

    user = await auth_service.get_or_create_user(db, "github", user_info)
    tokens = auth_service.create_tokens(user)

    params = urlencode({
        "token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    })
    return RedirectResponse(f"{redirect_uri}?{params}")


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new access token from a valid refresh token."""
    payload = auth_service.verify_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    from sqlalchemy import select
    from app.models import User as UserModel

    result = await db.execute(
        select(UserModel).where(UserModel.id == payload["sub"])
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return auth_service.create_tokens(user)


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return user


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------

@router.post("/api-keys", response_model=ApiKeyCreatedResponse)
async def create_api_key(
    body: ApiKeyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key for the authenticated user."""
    api_key, raw_key = await auth_service.create_api_key(db, user.id, body.name)
    return ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        created_at=api_key.created_at,
        last_used_at=api_key.last_used_at,
        key=raw_key,
    )


@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the authenticated user's non-revoked API keys."""
    return await auth_service.list_api_keys(db, user.id)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an API key."""
    revoked = await auth_service.revoke_api_key(db, user.id, key_id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _google_callback_url() -> str:
    return f"http://{settings.server_host}:{settings.server_port}/auth/google/callback"


def _github_callback_url() -> str:
    return f"http://{settings.server_host}:{settings.server_port}/auth/github/callback"
