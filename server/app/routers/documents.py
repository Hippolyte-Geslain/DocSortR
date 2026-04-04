import os
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.session import ProcessingSession, Document
from app.schemas.document import UploadResponse, DocumentResponse, DocumentConfirm
from app.services import file_service, ocr_service, llm_service
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


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
        accepted.append(file.filename)

        background_tasks.add_task(
            process_document, doc_id, ext, file_path, session.id, user.id
        )

    await db.commit()
    return UploadResponse(
        session_id=session.id, accepted=accepted, rejected=rejected
    )


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

        try:
            # Step 1: OCR
            doc.status = "ocr"
            await db.commit()
            await ws_manager.send_to_user(user_id, {
                "type": "processing_update",
                "session_id": session_id,
                "document_id": doc_id,
                "filename": doc.original_filename,
                "step": "ocr",
            })

            ocr_text = await ocr_service.extract_text(file_path)
            doc.ocr_text = ocr_text

            # Step 2: LLM Classification
            doc.status = "llm"
            await db.commit()
            await ws_manager.send_to_user(user_id, {
                "type": "processing_update",
                "session_id": session_id,
                "document_id": doc_id,
                "filename": doc.original_filename,
                "step": "llm",
            })

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
                "filename": doc.original_filename,
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
                "filename": doc.original_filename,
                "message": str(e),
            })


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

    try:
        final_path = file_service.archive_file(
            doc.id, doc.file_extension, data.client_name or "", data.document_type, data.date
        )
        doc.final_path = final_path
        doc.status = "archived"
        doc.archived_at = datetime.now(timezone.utc)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Staging file not found")

    await db.commit()
    return {"status": "archived", "final_path": final_path}


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
