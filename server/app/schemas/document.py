from datetime import datetime

from pydantic import BaseModel


class ClassificationResult(BaseModel):
    document_type: str
    date: str | None = None
    client_name: str | None = None
    confidence_score: float
    summary: str


class DocumentResponse(BaseModel):
    id: str
    original_filename: str
    file_extension: str
    status: str
    document_type: str | None
    document_date: str | None
    client_name: str | None
    confidence_score: float | None
    summary: str | None
    final_path: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentConfirm(BaseModel):
    document_type: str
    date: str | None = None
    client_name: str | None = None


class UploadResponse(BaseModel):
    session_id: str
    accepted: list[str]
    rejected: list[dict]
