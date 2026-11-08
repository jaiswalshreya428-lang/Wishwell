"""
Pydantic Schemas for Institutions & Verification Documents
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_type: str
    file_name: str
    blob_name: str
    file_size_bytes: int
    mime_type: str
    sas_download_url: str
    created_at: datetime

class InstitutionVerificationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    registration_number: str
    address: str
    city: str
    state: str
    postal_code: str
    phone: str
    website_url: Optional[str] = None
    description: Optional[str] = None
    status: str
    created_at: datetime
    documents_count: int = 0

class InstitutionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    registration_number: str
    address: str
    city: str
    state: str
    postal_code: str
    phone: str
    website_url: Optional[str] = None
    description: Optional[str] = None
    status: str
    created_at: datetime
    documents: List[DocumentResponse] = []

