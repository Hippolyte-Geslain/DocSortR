"""Runtime configuration endpoint.

Lets the Electron installer wizard push user-chosen values (archive path,
Ollama URL/model) to the live server process without requiring a restart.

The values are also persisted to `config.json` in the server's working
directory so they survive restarts.
"""
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(prefix="/config", tags=["config"])

CONFIG_FILE = Path("config.json")


class ConfigUpdate(BaseModel):
    archive_base_path: Optional[str] = None
    staging_path: Optional[str] = None
    ollama_url: Optional[str] = None
    ollama_model: Optional[str] = None


def _load_persisted() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _persist(data: dict) -> None:
    try:
        CONFIG_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception:
        pass


def apply_persisted_config() -> None:
    """Apply persisted config to the live settings object. Called once at startup."""
    s = get_settings()
    persisted = _load_persisted()
    for key, value in persisted.items():
        if value is not None and hasattr(s, key):
            setattr(s, key, value)


@router.get("")
async def get_config():
    s = get_settings()
    return {
        "archive_base_path": s.archive_base_path,
        "staging_path": s.staging_path,
        "ollama_url": s.ollama_url,
        "ollama_model": s.ollama_model,
    }


@router.post("")
async def update_config(update: ConfigUpdate):
    """Apply a config patch at runtime and persist it.

    Creates target directories if they don't exist.
    """
    s = get_settings()
    data = update.model_dump(exclude_none=True)

    for key, value in data.items():
        setattr(s, key, value)

    # Ensure new paths exist on disk
    for key in ("archive_base_path", "staging_path"):
        if key in data:
            Path(data[key]).mkdir(parents=True, exist_ok=True)

    # Merge with existing persisted config
    persisted = _load_persisted()
    persisted.update(data)
    _persist(persisted)

    return {"status": "ok", "applied": data}
