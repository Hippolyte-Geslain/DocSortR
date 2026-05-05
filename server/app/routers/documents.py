import os
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.session import ProcessingSession, Document
from app.schemas.document import (
    UploadResponse,
    AcceptedDocument,
    DocumentResponse,
    DocumentConfirm,
    DocumentRename,
    DocumentMove,
)
from app.services import file_service, ocr_service, llm_service, session_service
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()

UNCLASSIFIED_SENTINEL = "__unclassified__"


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    status: str = Query("needs_review"),
    client_name: str | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List documents for the current user, filtered by status and optionally client.

    `client_name=__unclassified__` filters rows where client_name IS NULL.
    """
    from sqlalchemy import select

    stmt = (
        select(Document)
        .join(ProcessingSession, ProcessingSession.id == Document.session_id)
        .where(ProcessingSession.user_id == user.id, Document.status == status)
    )

    if client_name == UNCLASSIFIED_SENTINEL:
        stmt = stmt.where(Document.client_name.is_(None))
    elif client_name is not None:
        stmt = stmt.where(Document.client_name == client_name)

    stmt = stmt.order_by(Document.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [DocumentResponse.model_validate(d) for d in rows]


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    session_id: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Create or get session
    if session_id:
        from sqlalchemy import select
        result = await db.execute(
            select(ProcessingSession).where(
                ProcessingSession.id == session_id,
                ProcessingSession.user_id == user.id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = ProcessingSession(user_id=user.id)
        db.add(session)
        await db.commit()
        await db.refresh(session)

    accepted = []
    rejected = []

    for file in files:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in settings.allowed_extensions:
            rejected.append({"filename": file.filename, "reason": f"Extension non supportée: {ext}"})
            continue

        content = await file.read()
        if len(content) > settings.max_upload_size_mb * 1024 * 1024:
            rejected.append({"filename": file.filename, "reason": "Fichier trop volumineux"})
            continue

        doc_id, file_path = file_service.save_to_staging(file.filename, content)

        doc = Document(
            id=doc_id,
            session_id=session.id,
            original_filename=file.filename or "unknown",
            file_extension=ext,
            status="pending",
        )
        db.add(doc)
        accepted.append(
            AcceptedDocument(id=doc_id, filename=file.filename or "unknown")
        )

        background_tasks.add_task(
            process_document, doc_id, ext, file_path, session.id, user.id
        )

    await db.commit()
    return UploadResponse(
        session_id=session.id, accepted=accepted, rejected=rejected
    )


async def _push_step(
    user_id: str, session_id: str, doc_id: str, filename: str, step: str,
    detail: str | None = None,
):
    await ws_manager.send_to_user(user_id, {
        "type": "processing_update",
        "session_id": session_id,
        "document_id": doc_id,
        "filename": filename,
        "step": step,
        "detail": detail,
    })


async def _notify_session_if_complete(db: AsyncSession, user_id: str, session_id: str):
    completed = await session_service.maybe_complete_session(db, session_id)
    if completed:
        await ws_manager.send_to_user(user_id, {
            "type": "session_completed",
            "session_id": session_id,
        })


async def process_document(
    doc_id: str, ext: str, file_path: str, session_id: str, user_id: str
):
    """Background task: OCR -> LLM classification -> WS notification."""
    from app.database import async_session

    async with async_session() as db:
        from sqlalchemy import select
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if not doc:
            return

        filename = doc.original_filename

        try:
            # Step 1: OCR
            doc.status = "ocr"
            await db.commit()
            await _push_step(user_id, session_id, doc_id, filename, "ocr",
                             "Extraction du texte")

            ocr_text = await ocr_service.extract_text(file_path)
            doc.ocr_text = ocr_text

            # Step 2: LLM Classification
            doc.status = "llm"
            await db.commit()
            await _push_step(user_id, session_id, doc_id, filename, "llm",
                             "Analyse par l'IA locale")

            classification = await llm_service.classify_document(ocr_text)
            doc.document_type = classification.get("document_type")
            doc.document_date = classification.get("date")
            doc.client_name = classification.get("client_name")
            doc.confidence_score = classification.get("confidence_score")
            doc.summary = classification.get("summary")
            doc.status = "needs_review"
            await db.commit()

            # Notify client
            await ws_manager.send_to_user(user_id, {
                "type": "classification_ready",
                "session_id": session_id,
                "document_id": doc_id,
                "filename": filename,
                "classification": classification,
            })

        except Exception as e:
            doc.status = "error"
            doc.error_message = str(e)
            await db.commit()
            await ws_manager.send_to_user(user_id, {
                "type": "error",
                "session_id": session_id,
                "document_id": doc_id,
                "filename": filename,
                "message": str(e),
            })

        await _notify_session_if_complete(db, user_id, session_id)


@router.post("/{doc_id}/confirm")
async def confirm_document(
    doc_id: str,
    data: DocumentConfirm,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from datetime import datetime, timezone

    result = await db.execute(
        select(Document)
        .join(ProcessingSession)
        .where(Document.id == doc_id, ProcessingSession.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.document_type = data.document_type
    doc.document_date = data.date
    doc.client_name = data.client_name
    doc.custom_filename = data.custom_filename

    try:
        final_path = file_service.archive_file(
            doc.id,
            doc.file_extension,
            data.client_name or "",
            data.document_type,
            data.date,
            custom_filename=data.custom_filename,
        )
        doc.final_path = final_path
        doc.status = "archived"
        doc.archived_at = datetime.now(timezone.utc)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Staging file not found")

    await db.commit()
    await _notify_session_if_complete(db, user.id, doc.session_id)
    return {"status": "archived", "final_path": final_path}


@router.post("/{doc_id}/rename")
async def rename_document(
    doc_id: str,
    data: DocumentRename,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Renomme le fichier archivé sans changer sa place dans l'arborescence."""
    from sqlalchemy import select

    result = await db.execute(
        select(Document)
        .join(ProcessingSession)
        .where(Document.id == doc_id, ProcessingSession.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "archived" or not doc.final_path:
        raise HTTPException(
            status_code=400,
            detail="Le document doit être archivé avant de pouvoir être renommé",
        )

    try:
        new_path = file_service.rename_archived_file(
            doc.final_path, data.new_filename, doc.file_extension
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le disque")
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))

    doc.custom_filename = data.new_filename
    doc.final_path = new_path
    await db.commit()
    return {"status": "renamed", "final_path": new_path}


@router.post("/{doc_id}/move")
async def move_document(
    doc_id: str,
    data: DocumentMove,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Déplace le fichier archivé vers un nouvel emplacement dans l'arborescence.
    Met aussi à jour les métadonnées de classification en base.
    Peut renommer le fichier au passage si custom_filename est fourni.
    """
    from sqlalchemy import select

    result = await db.execute(
        select(Document)
        .join(ProcessingSession)
        .where(Document.id == doc_id, ProcessingSession.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "archived" or not doc.final_path:
        raise HTTPException(
            status_code=400,
            detail="Le document doit être archivé avant de pouvoir être déplacé",
        )

    try:
        new_path = file_service.move_archived_file(
            current_path=doc.final_path,
            doc_id=doc.id,
            ext=doc.file_extension,
            client_name=data.client_name or "",
            document_type=data.document_type,
            date_str=data.date,
            custom_filename=data.custom_filename,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le disque")
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))

    doc.document_type = data.document_type
    doc.document_date = data.date
    doc.client_name = data.client_name
    doc.custom_filename = data.custom_filename
    doc.final_path = new_path
    await db.commit()
    return {"status": "moved", "final_path": new_path}


@router.post("/{doc_id}/reject")
async def reject_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    result = await db.execute(
        select(Document)
        .join(ProcessingSession)
        .where(Document.id == doc_id, ProcessingSession.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_service.delete_staging_file(doc.id, doc.file_extension)
    doc.status = "rejected"
    await db.commit()
    await _notify_session_if_complete(db, user.id, doc.session_id)
    return {"status": "rejected"}


@router.get("/{doc_id}/preview")
async def preview_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import FileResponse
    from sqlalchemy import select

    result = await db.execute(
        select(Document)
        .join(ProcessingSession)
        .where(Document.id == doc_id, ProcessingSession.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.final_path and os.path.exists(doc.final_path):
        return FileResponse(doc.final_path)

    staging_path = file_service.get_staging_path(doc.id, doc.file_extension)
    if os.path.exists(staging_path):
        return FileResponse(staging_path)

    raise HTTPException(status_code=404, detail="File not found")
