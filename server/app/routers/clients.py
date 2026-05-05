from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.session import Document, ProcessingSession
from app.models.user import User
from app.schemas.document import ClientSummary

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientSummary])
async def list_clients(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return one row per distinct client_name (plus a null bucket for unclassified docs).

    Counts only the two statuses the UI cares about:
      - archived_count: docs already filed under this client
      - inbox_count:    docs awaiting user review for this client
    """
    archived_expr = func.sum(case((Document.status == "archived", 1), else_=0))
    inbox_expr = func.sum(case((Document.status == "needs_review", 1), else_=0))

    stmt = (
        select(
            Document.client_name.label("name"),
            archived_expr.label("archived_count"),
            inbox_expr.label("inbox_count"),
        )
        .join(ProcessingSession, ProcessingSession.id == Document.session_id)
        .where(
            ProcessingSession.user_id == user.id,
            Document.status.in_(("archived", "needs_review")),
        )
        .group_by(Document.client_name)
        .order_by(inbox_expr.desc(), archived_expr.desc(), Document.client_name.asc())
    )

    rows = (await db.execute(stmt)).all()
    return [
        ClientSummary(
            name=row.name,
            archived_count=int(row.archived_count or 0),
            inbox_count=int(row.inbox_count or 0),
        )
        for row in rows
    ]
