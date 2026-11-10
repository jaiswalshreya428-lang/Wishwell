"""
Pydantic Schemas for Institutions & Verification Documents
Enforces output escaping and safe representation of institutional data.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.core.sanitizer import escape_html

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_type: str
    file_name: str
    original_filename: Optional[str] = None
    blob_name: str
    file_size_bytes: int
    mime_type: str
    sas_download_url: str
    sas_url: Optional[str] = None
    created_at: datetime

    @model_validator(mode="after")
    def populate_aliases(self):
        if not self.original_filename:
            self.original_filename = self.file_name
        if not self.sas_url:
            self.sas_url = self.sas_download_url
        return self

    @field_validator("file_name", "original_filename", mode="after")
    @classmethod
    def escape_doc_name(cls, v: Optional[str]) -> Optional[str]:
        return escape_html(v) if v is not None else None

class InstitutionDocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: int
    document_type: str
    file_name: str
    original_filename: Optional[str] = None
    blob_name: str
    file_size_bytes: int
    mime_type: Optional[str] = None
    sas_url: Optional[str] = None
    sas_download_url: Optional[str] = None
    created_at: datetime

    @model_validator(mode="after")
    def populate_aliases(self):
        if not self.original_filename:
            self.original_filename = self.file_name
        if not self.sas_url and self.sas_download_url:
            self.sas_url = self.sas_download_url
        elif not self.sas_download_url and self.sas_url:
            self.sas_download_url = self.sas_url
        return self

    @field_validator("file_name", "original_filename", mode="after")
    @classmethod
    def escape_doc_name(cls, v: Optional[str]) -> Optional[str]:
        return escape_html(v) if v is not None else None

class VerificationRecommendationInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    recommended_by: Optional[int] = None
    recommended_at: Optional[datetime] = None
    reason: Optional[str] = None

class InstitutionVerificationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: Optional[int] = None
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
    documents: List[InstitutionDocumentItem] = []
    recommendation: Optional[VerificationRecommendationInfo] = None

    @model_validator(mode="after")
    def populate_institution_id(self):
        if self.institution_id is None:
            self.institution_id = self.id
        return self

    @field_validator("name", "address", "city", "state", "description", mode="after")
    @classmethod
    def escape_summary_text(cls, v: Optional[str]) -> Optional[str]:
        return escape_html(v) if v is not None else None

class InstitutionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: Optional[int] = None
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

    @model_validator(mode="after")
    def populate_institution_id(self):
        if self.institution_id is None:
            self.institution_id = self.id
        return self

    @field_validator("name", "address", "city", "state", "description", mode="after")
    @classmethod
    def escape_detail_text(cls, v: Optional[str]) -> Optional[str]:
        return escape_html(v) if v is not None else None
