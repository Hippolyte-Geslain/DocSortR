"""Health & dependency probes used by the installer wizard and status badge."""
import os
from pathlib import Path

import httpx
from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.config import get_settings
from app.database import get_db

router = APIRouter(tags=["health"])
settings = get_settings()

APP_VERSION = "0.1.0"


@router.get("/health")
async def health_check():
    """Lightweight liveness probe (fast, no external calls)."""
    return {"status": "ok", "version": APP_VERSION}


@router.get("/health/deps")
async def health_deps(db: AsyncSession = Depends(get_db)):
    """Full dependency probe consumed by the installer wizard and status badge.

    Returns a JSON object where each field is the status of one dependency.
    Never raises — failures are reported as `false`.
    """
    result: dict = {"version": APP_VERSION, "ollama_port": None}

    # 1. Ollama reachable?
    ollama_reachable = False
    model_present = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.ollama_url}/api/tags")
            if resp.status_code == 200:
                ollama_reachable = True
                try:
                    result["ollama_port"] = int(settings.ollama_url.rsplit(":", 1)[-1])
                except (ValueError, IndexError):
                    pass
                # Model presence
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                # Ollama names include ":tag" suffix; match prefix
                target = settings.ollama_model
                model_present = any(
                    name == target or name.startswith(f"{target}:") for name in models
                )
    except Exception:
        pass
    result["ollama_reachable"] = ollama_reachable
    result["model_present"] = model_present

    # 2. OCR model weights present?
    #    RapidOCR caches under user's home on first init. We check whether the
    #    engine can be imported AND the cache dir exists with .onnx files.
    ocr_models_present = False
    try:
        import rapidocr_onnxruntime  # noqa: F401
        # rapidocr bundles weights inside the wheel, so import success == ok
        ocr_models_present = True
    except Exception:
        ocr_models_present = False
    result["ocr_models_present"] = ocr_models_present

    # 3. Archive path writable?
    archive_writable = False
    try:
        archive_root = Path(settings.archive_base_path)
        archive_root.mkdir(parents=True, exist_ok=True)
        probe = archive_root / ".docsortr-write-test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        archive_writable = True
    except Exception:
        pass
    result["archive_writable"] = archive_writable

    # 4. Database reachable?
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    result["db_ok"] = db_ok

    # Aggregate overall health
    result["healthy"] = all(
        [ollama_reachable, model_present, ocr_models_present, archive_writable, db_ok]
    )
    return result


@router.get("/health/warm-ocr")
async def warm_ocr():
    """Force RapidOCR to initialize and download ONNX weights if not cached.

    Called once during the installer wizard (Step 6).
    """
    try:
        from rapidocr_onnxruntime import RapidOCR
        # Instantiating the engine triggers the model load / download.
        _engine = RapidOCR()
        return {"status": "ready"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
