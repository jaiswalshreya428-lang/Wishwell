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
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.entities import User, Institution, VerificationRecord, AuditLog
from app.core.audit import record_audit_event
from app.schemas.institution import InstitutionVerificationSummary

router = APIRouter(prefix="/verifications", tags=["Verification"])

class VerificationActionRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)

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
        summary = InstitutionVerificationSummary(
            id=inst.id,
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
            documents_count=len(inst.documents)
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
        summary = InstitutionVerificationSummary(
            id=inst.id,
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
            documents_count=len(inst.documents)
        )
        response.append(summary)
    return response

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

@router.post("/{institution_id}/approve", status_code=status.HTTP_200_OK)
async def approve_institution(
    institution_id: int,
    payload: VerificationActionRequest,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Administrator Approves Institution.
    - Requires role: 'admin'.
    - FSM rule: Institution must be in 'recommended' status.
    - CANNOT skip Step 1: Attempting to approve directly from 'pending' is rejected with HTTP 400.
    - Self-approval prohibited.
    """
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
