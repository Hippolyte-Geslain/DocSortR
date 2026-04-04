from datetime import datetime

from pydantic import BaseModel

from app.schemas.document import DocumentResponse


class SessionCreate(BaseModel):
    name: str | None = None


class SessionResponse(BaseModel):
    id: str
    name: str | None
    status: str
    created_at: datetime
    completed_at: datetime | None
    document_count: int = 0

    model_config = {"from_attributes": True}


class SessionDetailResponse(SessionResponse):
    documents: list[DocumentResponse] = []
