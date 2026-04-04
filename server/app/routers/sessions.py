from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, SessionDetailResponse
from app.services import session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(
    data: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await session_service.create_session(db, user.id, data.name)
    return SessionResponse(
        id=session.id,
        name=session.name,
        status=session.status,
        created_at=session.created_at,
        completed_at=session.completed_at,
        document_count=0,
    )


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await session_service.get_user_sessions(db, user.id)
    return [SessionResponse(**s) for s in sessions]


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await session_service.get_session_detail(db, session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "name": session.name,
        "status": session.status,
        "created_at": session.created_at,
        "completed_at": session.completed_at,
        "document_count": len(session.documents),
        "documents": session.documents,
    }
