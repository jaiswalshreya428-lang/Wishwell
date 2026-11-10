"""
Two-Step Institution Verification Endpoints (/api/verifications)

VIVA NOTES:
- Implements two-step verification governance:
    Step 1: Field Verifier physically reviews facility & recommends ('recommended') or rejects.
    Step 2: System Administrator performs final compliance review & approves ('verified') or rejects.
- Enforces strict finite state machine (FSM) transitions:
    - Verifier can only recommend/reject institutions that are 'pending'.
    - Administrator CANNOT skip Step 1: an attempt to approve directly from 'pending' is rejected (HTTP 400).
    - An institution cannot approve or recommend itself.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.storage import storage_service
from app.models.entities import User, Institution, InstitutionDocument, VerificationRecord, AuditLog
from app.core.audit import record_audit_event
from app.schemas.institution import (
    InstitutionVerificationSummary,
    DocumentResponse,
    InstitutionDocumentItem,
    VerificationRecommendationInfo,
)

router = APIRouter(prefix="/verifications", tags=["Verification"])

class VerificationActionRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)
    decision: Optional[str] = Field("verified", description="'verified' or 'rejected'")

@router.get("/pending", response_model=List[InstitutionVerificationSummary])
async def list_pending_institutions(
    current_user: User = Depends(require_role("verifier", "admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all children's homes awaiting initial field inspection and recommendation.
    Authorized for: Verifiers and Administrators.
    """
    stmt = (
        select(Institution)
        .options(selectinload(Institution.documents))
        .where(Institution.status == "pending")
        .order_by(Institution.created_at.asc())
    )
    result = await db.execute(stmt)
    institutions = result.scalars().all()

    response = []
    for inst in institutions:
        docs = []
        for doc in inst.documents:
            sas_url = storage_service.generate_sas_url(doc.blob_name, expiry_minutes=15)
            docs.append(InstitutionDocumentItem(
                id=doc.id,
                institution_id=doc.institution_id,
                document_type=doc.document_type,
                file_name=doc.file_name,
                original_filename=doc.file_name,
                blob_name=doc.blob_name,
                file_size_bytes=doc.file_size_bytes,
                mime_type=doc.mime_type,
                sas_url=sas_url,
                sas_download_url=sas_url,
                created_at=doc.created_at
            ))

        summary = InstitutionVerificationSummary(
            id=inst.id,
            institution_id=inst.id,
            user_id=inst.user_id,
            name=inst.name,
            registration_number=inst.registration_number,
            address=inst.address,
            city=inst.city,
            state=inst.state,
            postal_code=inst.postal_code,
            phone=inst.phone,
            website_url=inst.website_url,
            description=inst.description,
            status=inst.status,
            created_at=inst.created_at,
            documents_count=len(inst.documents),
            documents=docs,
            recommendation=None
        )
        response.append(summary)
    return response

@router.get("/recommended", response_model=List[InstitutionVerificationSummary])
async def list_recommended_institutions(
    current_user: User = Depends(require_role("admin", "verifier")),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all children's homes recommended by field verifiers, awaiting final admin approval.
    Authorized for: Administrators and Verifiers.
    """
    stmt = (
        select(Institution)
        .options(selectinload(Institution.documents))
        .where(Institution.status == "recommended")
        .order_by(Institution.updated_at.asc())
    )
    result = await db.execute(stmt)
    institutions = result.scalars().all()

    response = []
    for inst in institutions:
        docs = []
        for doc in inst.documents:
            sas_url = storage_service.generate_sas_url(doc.blob_name, expiry_minutes=15)
            docs.append(InstitutionDocumentItem(
                id=doc.id,
                institution_id=doc.institution_id,
                document_type=doc.document_type,
                file_name=doc.file_name,
                original_filename=doc.file_name,
                blob_name=doc.blob_name,
                file_size_bytes=doc.file_size_bytes,
                mime_type=doc.mime_type,
                sas_url=sas_url,
                sas_download_url=sas_url,
                created_at=doc.created_at
            ))

        # Query latest recommendation note
        rec_stmt = (
            select(VerificationRecord)
            .where(VerificationRecord.institution_id == inst.id)
            .order_by(VerificationRecord.id.desc())
        )
        rec_res = await db.execute(rec_stmt)
        rec = rec_res.scalars().first()
        recommendation_info = None
        if rec:
            recommendation_info = VerificationRecommendationInfo(
                recommended_by=rec.recommended_by,
                recommended_at=rec.recommended_at,
                reason=rec.reason
            )

        summary = InstitutionVerificationSummary(
            id=inst.id,
            institution_id=inst.id,
            user_id=inst.user_id,
            name=inst.name,
            registration_number=inst.registration_number,
            address=inst.address,
            city=inst.city,
            state=inst.state,
            postal_code=inst.postal_code,
            phone=inst.phone,
            website_url=inst.website_url,
            description=inst.description,
            status=inst.status,
            created_at=inst.created_at,
            documents_count=len(inst.documents),
            documents=docs,
            recommendation=recommendation_info
        )
        response.append(summary)
    return response

@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_verification_document(
    file: UploadFile = File(...),
    document_type: str = Form(..., max_length=50),
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload verification documentation during onboarding.
    Stores file in private blob container and saves metadata record.
    """
    stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(stmt)
    institution = inst_res.scalar_one_or_none()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    file_bytes = await file.read()
    blob_name, file_size, mime_type = storage_service.upload_document(file_bytes, file.filename or "doc")

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

    sas_url = storage_service.generate_sas_url(blob_name, expiry_minutes=15)

    return DocumentResponse(
        id=doc_entity.id,
        document_type=doc_entity.document_type,
        file_name=doc_entity.file_name,
        original_filename=doc_entity.file_name,
        blob_name=doc_entity.blob_name,
        file_size_bytes=doc_entity.file_size_bytes,
        mime_type=doc_entity.mime_type,
        sas_download_url=sas_url,
        sas_url=sas_url,
        created_at=doc_entity.created_at,
    )

@router.post("/submit", status_code=status.HTTP_200_OK)
async def submit_for_verification(
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Institution submits legal documentation for field inspection.
    Sets status to 'pending' and records an audit log event.
    """
    stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(stmt)
    institution = inst_res.scalar_one_or_none()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    if institution.status == "verified":
        return {"message": "Institution is already verified.", "status": "verified"}

    old_status = institution.status
    institution.status = "pending"
    institution.updated_at = datetime.now(timezone.utc)

    await record_audit_event(
        session=db,
        entity_type="institutions",
        entity_id=institution.id,
        action="SUBMIT_FOR_VERIFICATION",
        old_status=old_status,
        new_status="pending",
        changed_by=current_user.id,
        details="Institution submitted documents for field verification inspection.",
        created_at=datetime.now(timezone.utc),
    )
    await db.commit()

    return {"message": "Successfully submitted for field verification.", "status": "pending"}

@router.post("/{institution_id}/recommend", status_code=status.HTTP_200_OK)
async def recommend_institution(
    institution_id: int,
    payload: VerificationActionRequest,
    current_user: User = Depends(require_role("verifier")),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 1: Field Verifier Recommends Institution.
    - Requires role: 'verifier'.
    - FSM rule: Institution must be in 'pending' status.
    - Self-recommendation prohibited.
    """
    stmt = select(Institution).where(Institution.id == institution_id)
    result = await db.execute(stmt)
    institution = result.scalar_one_or_none()

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution #{institution_id} not found."
        )

    # Self-approval / self-recommendation check
    if institution.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: You cannot verify or recommend an institution you own."
        )

    # State Machine Validation
    if institution.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition: Cannot recommend an institution with status '{institution.status}'. Must be in 'pending' status."
        )

    # Record verification record
    old_status = institution.status
    record = VerificationRecord(
        institution_id=institution.id,
        recommended_by=current_user.id,
        recommended_at=datetime.now(timezone.utc),
        approved_by=None,
        approved_at=None,
        decision="recommended",
        reason=payload.reason,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)

    institution.status = "recommended"
    institution.updated_at = datetime.now(timezone.utc)

    # Audit log with hash chaining
    await record_audit_event(
        session=db,
        entity_type="institutions",
        entity_id=institution.id,
        action="RECOMMEND",
        old_status=old_status,
        new_status="recommended",
        changed_by=current_user.id,
        details=f"Field verifier recommended institution with reason: {payload.reason}",
        created_at=datetime.now(timezone.utc),
    )

    await db.commit()

    return {
        "message": f"Institution '{institution.name}' successfully recommended.",
        "status": "recommended",
        "institution_id": institution.id,
        "recommended_by": current_user.full_name
    }

@router.post("/{institution_id}/reject", status_code=status.HTTP_200_OK)
async def reject_institution(
    institution_id: int,
    payload: VerificationActionRequest,
    current_user: User = Depends(require_role("verifier", "admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Rejects an institution application with an explanatory reason.
    Authorized for: Verifiers (during Step 1) or Administrators (during Step 2).
    """
    stmt = select(Institution).where(Institution.id == institution_id)
    result = await db.execute(stmt)
    institution = result.scalar_one_or_none()

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution #{institution_id} not found."
        )

    # Self-rejection / approval check
    if institution.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: Cannot review an institution you own."
        )

    if institution.status not in ("pending", "recommended"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject institution with status '{institution.status}'."
        )

    old_status = institution.status
    record = VerificationRecord(
        institution_id=institution.id,
        recommended_by=current_user.id if current_user.role == "verifier" else None,
        recommended_at=datetime.now(timezone.utc) if current_user.role == "verifier" else None,
        approved_by=current_user.id if current_user.role == "admin" else None,
        approved_at=datetime.now(timezone.utc) if current_user.role == "admin" else None,
        decision="rejected",
        reason=payload.reason,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)

    institution.status = "rejected"
    institution.updated_at = datetime.now(timezone.utc)

    # Audit log with hash chaining
    await record_audit_event(
        session=db,
        entity_type="institutions",
        entity_id=institution.id,
        action="REJECT",
        old_status=old_status,
        new_status="rejected",
        changed_by=current_user.id,
        details=f"Application rejected with reason: {payload.reason}",
        created_at=datetime.now(timezone.utc),
    )

    await db.commit()

    return {
        "message": f"Institution '{institution.name}' application rejected.",
        "status": "rejected",
        "institution_id": institution.id,
        "decision_by": current_user.full_name
    }

@router.post("/{institution_id}/approve", status_code=status.HTTP_200_OK)
async def approve_institution(
    institution_id: int,
    payload: VerificationActionRequest,
    current_user: User = Depends(require_role("admin", "verifier")),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Administrator Approves Institution (or Verifier/Admin rejects).
    - If decision == 'rejected': Allowed for verifier or admin.
    - If decision == 'verified':
      * Requires role: 'admin'.
      * FSM rule: Institution must be in 'recommended' status.
      * CANNOT skip Step 1: Attempting to approve directly from 'pending' is rejected with HTTP 400.
      * Self-approval prohibited.
    """
    if payload.decision == "rejected":
        return await reject_institution(
            institution_id=institution_id,
            payload=payload,
            current_user=current_user,
            db=db
        )

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: A verifier cannot approve institutions; only administrators can grant final verification approval."
        )

    stmt = select(Institution).where(Institution.id == institution_id)
    result = await db.execute(stmt)
    institution = result.scalar_one_or_none()

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution #{institution_id} not found."
        )

    # Self-approval check
    if institution.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: You cannot approve an institution you own."
        )

    # State machine check: cannot skip step 1!
    if institution.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot skip verification step: Institution must be reviewed and recommended by a field verifier before administrator approval."
        )
    elif institution.status != "recommended":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition: Cannot approve an institution with status '{institution.status}'. Must be in 'recommended' status."
        )

    old_status = institution.status
    record = VerificationRecord(
        institution_id=institution.id,
        recommended_by=None,
        recommended_at=None,
        approved_by=current_user.id,
        approved_at=datetime.now(timezone.utc),
        decision="verified",
        reason=payload.reason,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)

    institution.status = "verified"
    institution.updated_at = datetime.now(timezone.utc)

    # Audit log with hash chaining
    await record_audit_event(
        session=db,
        entity_type="institutions",
        entity_id=institution.id,
        action="APPROVE",
        old_status=old_status,
        new_status="verified",
        changed_by=current_user.id,
        details=f"Administrator approved institution with reason: {payload.reason}",
        created_at=datetime.now(timezone.utc),
    )

    await db.commit()

    return {
        "message": f"Institution '{institution.name}' successfully verified.",
        "status": "verified",
        "institution_id": institution.id,
        "approved_by": current_user.full_name
    }
