from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "0.1.0",
        "llm_provider": "mistral",
        "llm_configured": bool(settings.mistral_api_key),
    }
