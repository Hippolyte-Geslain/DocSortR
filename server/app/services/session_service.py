from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.session import ProcessingSession, Document


async def create_session(db: AsyncSession, user_id: str, name: str | None = None) -> ProcessingSession:
    session = ProcessingSession(user_id=user_id, name=name)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_user_sessions(db: AsyncSession, user_id: str) -> list[dict]:
    stmt = (
        select(
            ProcessingSession,
            func.count(Document.id).label("doc_count"),
        )
        .outerjoin(Document)
        .where(ProcessingSession.user_id == user_id)
        .group_by(ProcessingSession.id)
        .order_by(ProcessingSession.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "id": session.id,
            "name": session.name,
            "status": session.status,
            "created_at": session.created_at,
            "completed_at": session.completed_at,
            "document_count": count,
        }
        for session, count in rows
    ]


async def get_session_detail(db: AsyncSession, session_id: str, user_id: str) -> ProcessingSession | None:
    stmt = (
        select(ProcessingSession)
        .options(selectinload(ProcessingSession.documents))
        .where(ProcessingSession.id == session_id, ProcessingSession.user_id == user_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
