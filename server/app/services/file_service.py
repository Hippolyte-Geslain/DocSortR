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


def _build_archive_path(
    client_name: str,
    document_type: str,
    date_str: str | None,
    filename: str,
) -> str:
    """Build the full archive path from metadata.
    Structure: {archive_base}/{client}/{type}/{year}/{filename}
    """
    year = "inconnu"
    if date_str:
        try:
            year = str(datetime.fromisoformat(date_str).year)
        except ValueError:
            pass

    safe_client = _sanitize_name(client_name or "sans_client")
    safe_type = _sanitize_name(document_type or "autre")

    archive_dir = os.path.join(
        settings.archive_base_path, safe_client, safe_type, year
    )
    return os.path.join(archive_dir, filename)


def archive_file(
    doc_id: str,
    ext: str,
    client_name: str,
    document_type: str,
    date_str: str | None,
    custom_filename: str | None = None,
) -> str:
    """Move file from staging to archive directory.
    Archive path: {archive_base}/{client}/{type}/{year}/{filename}
    Returns the final archive path.
    """
    ensure_dirs()
    source = get_staging_path(doc_id, ext)
    if not os.path.exists(source):
        raise FileNotFoundError(f"Staging file not found: {source}")

    final_name = (
        _sanitize_name(custom_filename) + ext
        if custom_filename
        else f"{doc_id}{ext}"
    )
    final_path = _build_archive_path(client_name, document_type, date_str, final_name)
    os.makedirs(os.path.dirname(final_path), exist_ok=True)
    shutil.move(source, final_path)
    return final_path


def rename_archived_file(current_path: str, new_filename: str, ext: str) -> str:
    """Rename an archived file without moving it to another folder.
    Returns the new path.
    """
    if not os.path.exists(current_path):
        raise FileNotFoundError(f"Archived file not found: {current_path}")

    parent_dir = os.path.dirname(current_path)
    safe_name = _sanitize_name(new_filename) + ext
    new_path = os.path.join(parent_dir, safe_name)

    if new_path != current_path:
        if os.path.exists(new_path):
            raise FileExistsError(f"A file already exists at: {new_path}")
        os.rename(current_path, new_path)

    return new_path


def move_archived_file(
    current_path: str,
    doc_id: str,
    ext: str,
    client_name: str,
    document_type: str,
    date_str: str | None,
    custom_filename: str | None = None,
) -> str:
    """Move an already-archived file to a new location in the archive tree.
    Optionally rename it at the same time.
    Returns the new path.
    """
    if not os.path.exists(current_path):
        raise FileNotFoundError(f"Archived file not found: {current_path}")

    final_name = (
        _sanitize_name(custom_filename) + ext
        if custom_filename
        else os.path.basename(current_path)  # keep existing filename
    )
    new_path = _build_archive_path(client_name, document_type, date_str, final_name)

    if new_path != current_path:
        if os.path.exists(new_path):
            raise FileExistsError(f"A file already exists at: {new_path}")
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        shutil.move(current_path, new_path)

    return new_path


def delete_staging_file(doc_id: str, ext: str):
    """Remove a file from staging."""
    path = get_staging_path(doc_id, ext)
    if os.path.exists(path):
        os.remove(path)


def _sanitize_name(name: str) -> str:
    """Sanitize a name for use as a directory name."""
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip().replace(" ", "_")
