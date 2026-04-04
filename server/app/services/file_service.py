import os
import shutil
import uuid
from pathlib import Path
from datetime import datetime

from app.config import get_settings

settings = get_settings()


def ensure_dirs():
    """Create data directories if they don't exist."""
    for path in [settings.staging_path, settings.review_path, settings.archive_base_path]:
        os.makedirs(path, exist_ok=True)


def save_to_staging(filename: str, content: bytes) -> tuple[str, str]:
    """Save uploaded file to staging directory.
    Returns (doc_id, file_path).
    """
    ensure_dirs()
    doc_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower()
    staged_name = f"{doc_id}{ext}"
    file_path = os.path.join(settings.staging_path, staged_name)
    with open(file_path, "wb") as f:
        f.write(content)
    return doc_id, file_path


def get_staging_path(doc_id: str, ext: str) -> str:
    """Get the staging file path for a document."""
    return os.path.join(settings.staging_path, f"{doc_id}{ext}")


def archive_file(
    doc_id: str,
    ext: str,
    client_name: str,
    document_type: str,
    date_str: str | None,
) -> str:
    """Move file from staging to archive directory.
    Archive path: {archive_base}/{client}/{type}/{year}/{filename}
    Returns the final archive path.
    """
    ensure_dirs()
    source = get_staging_path(doc_id, ext)
    if not os.path.exists(source):
        raise FileNotFoundError(f"Staging file not found: {source}")

    year = "inconnu"
    if date_str:
        try:
            year = str(datetime.fromisoformat(date_str).year)
        except ValueError:
            pass

    # Sanitize directory names
    safe_client = _sanitize_name(client_name or "sans_client")
    safe_type = _sanitize_name(document_type or "autre")

    archive_dir = os.path.join(
        settings.archive_base_path, safe_client, safe_type, year
    )
    os.makedirs(archive_dir, exist_ok=True)

    final_name = f"{doc_id}{ext}"
    final_path = os.path.join(archive_dir, final_name)
    shutil.move(source, final_path)
    return final_path


def delete_staging_file(doc_id: str, ext: str):
    """Remove a file from staging."""
    path = get_staging_path(doc_id, ext)
    if os.path.exists(path):
        os.remove(path)


def _sanitize_name(name: str) -> str:
    """Sanitize a name for use as a directory name."""
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip().replace(" ", "_")
