"""
Institutions API Router (/api/institutions)
Handles institutional dashboard and document uploads for verification.

VIVA NOTES:
- Document uploads are stored in Azure / Azurite Blob Storage in a PRIVATE container.
- File bytes are verified against magic byte signatures to prevent malicious content spoofing.
- Files are renamed to random UUIDs.
- Short-lived SAS URLs (15 mins) are issued exclusively to authenticated verifiers and admins.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_user
from app.core.storage import storage_service
from app.models.entities import User, Institution, InstitutionDocument
from app.schemas.institution import DocumentResponse, InstitutionDetailResponse

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("/portal", status_code=status.HTTP_200_OK)
async def get_institution_portal(
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Institution private portal overview.
    Strictly restricted to users with role 'institution'.
    """
    stmt = (
        select(Institution)
        .options(selectinload(Institution.documents))
        .where(Institution.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    institution = result.scalar_one_or_none()

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found for this user."
        )

    return {
        "institution_id": institution.id,
        "name": institution.name,
        "registration_number": institution.registration_number,
        "status": institution.status,
        "contact_person": current_user.full_name,
        "email": current_user.email,
        "city": institution.city,
        "state": institution.state,
        "documents_count": len(institution.documents)
    }

@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_institution_document(
    file: UploadFile = File(...),
    document_type: str = Form(..., examples=["registration_certificate"]),
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload verification documentation (e.g. registration certificate, tax exemption).
    - Checks file size (<= 5 MB).
    - Validates magic bytes (PDF, JPG, PNG).
    - Stores file in private Azurite container under a random UUID.
    - Generates a short-lived SAS download URL.
    """
    # 1. Fetch institution profile
    stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(stmt)
    institution = inst_res.scalar_one_or_none()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    # 2. Validate document_type
    allowed_types = ('registration_certificate', 'license', 'tax_exemption', 'premises_lease', 'audit_report', 'other')
    if document_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document_type '{document_type}'. Allowed types: {', '.join(allowed_types)}"
        )

    # 3. Read and validate file content
    file_bytes = await file.read()
    blob_name, file_size, mime_type = storage_service.upload_document(file_bytes, file.filename or "doc")

    # 4. Save metadata to institution_documents table
    doc_entity = InstitutionDocument(
        institution_id=institution.id,
        document_type=document_type,
        file_name=file.filename or "uploaded_document",
        blob_name=blob_name,
        file_size_bytes=file_size,
        mime_type=mime_type,
        created_at=datetime.now(timezone.utc),
    )
    db.add(doc_entity)
    await db.commit()
    await db.refresh(doc_entity)

    # 5. Generate short-lived SAS download URL
    sas_url = storage_service.generate_sas_url(blob_name, expiry_minutes=15)

    return DocumentResponse(
        id=doc_entity.id,
        document_type=doc_entity.document_type,
        file_name=doc_entity.file_name,
        blob_name=doc_entity.blob_name,
        file_size_bytes=doc_entity.file_size_bytes,
        mime_type=doc_entity.mime_type,
        sas_download_url=sas_url,
        created_at=doc_entity.created_at,
    )

@router.get("/{institution_id}/documents", response_model=List[DocumentResponse])
async def list_institution_documents(
    institution_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists uploaded documents for an institution with freshly generated SAS download URLs.
    Authorized strictly for:
      - Field Verifiers ('verifier')
      - System Administrators ('admin')
      - The institution that owns the documents
    """
    stmt = (
        select(Institution)
        .options(selectinload(Institution.documents))
        .where(Institution.id == institution_id)
    )
    res = await db.execute(stmt)
    institution = res.scalar_one_or_none()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution #{institution_id} not found."
        )

    # Access control: verifier, admin, or owning institution
    is_authorized = (
        current_user.role in ("verifier", "admin")
        or (current_user.role == "institution" and institution.user_id == current_user.id)
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not authorized to view this institution's verification documents."
        )

    # Return documents with fresh short-lived SAS URLs
    documents_response = []
    for doc in institution.documents:
        sas_url = storage_service.generate_sas_url(doc.blob_name, expiry_minutes=15)
        documents_response.append(
            DocumentResponse(
                id=doc.id,
                document_type=doc.document_type,
                file_name=doc.file_name,
                blob_name=doc.blob_name,
                file_size_bytes=doc.file_size_bytes,
                mime_type=doc.mime_type,
                sas_download_url=sas_url,
                created_at=doc.created_at,
            )
        )
    return documents_response
