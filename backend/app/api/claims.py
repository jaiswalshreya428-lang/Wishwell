"""
Claims API Router
Handles donor pledging (claims), concurrency serialization, claim release, and stale-claim maintenance.

VIVA DEFENSE NOTES:
1. One Transaction Atomic Pledging:
   - Uses row-locking hints (UPDLOCK, HOLDLOCK on MSSQL) and asyncio per-wish mutex locks.
   - Computes remaining quantity atomically: remaining = qty_requested - sum(active claims).
   - If requested qty > remaining, rejects immediately with HTTP 409 Conflict.
2. Intelligent Deadline Assignment:
   - Deadline defaults to 14 days from creation, but is bounded by min(now + 14 days, wish.needed_by).
3. Donor Claim Release:
   - Donors can release their own pledge, restoring parent wish status and emitting an audit log entry.
4. Administrative Maintenance:
   - Exposes manual trigger for sp_release_stale_claims.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.concurrency import get_wish_lock
from app.core.scheduler import release_stale_claims
from app.models.entities import User, Wish, WishClaim, AuditLog
from app.core.audit import record_audit_event
from app.schemas.claim import ClaimCreate, ClaimResponse, StaleClaimsReleaseResponse

router = APIRouter(tags=["Claims"])

@router.post("/wishes/{wish_id}/claim", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
async def claim_wish(
    wish_id: int,
    payload: ClaimCreate,
    current_user: User = Depends(require_role("donor")),
    db: AsyncSession = Depends(get_db)
):
    """
    Claims a physical item quantity on a wish.
    CONCURRENCY GUARANTEE:
    - Executed in ONE database transaction with row locking (UPDLOCK, HOLDLOCK).
    - If requested quantity is not available, returns HTTP 409 Conflict.
    - Deadline defaults to 14 days, bounded by wish.needed_by.
    """
    async with get_wish_lock(wish_id):
        # 1. Row locking query on the wish
        wish_stmt = (
            select(Wish)
            .where(Wish.id == wish_id)
            .with_hint(Wish, "WITH (UPDLOCK, HOLDLOCK)", dialect_name="mssql")
        )
        wish_res = await db.execute(wish_stmt)
        wish = wish_res.scalar_one_or_none()

        if not wish:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wish #{wish_id} not found."
            )

        # 2. Check wish status
        if wish.status not in ("open", "partially_claimed"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Wish #{wish_id} is not open for claims (current status: '{wish.status}')."
            )

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        if wish.needed_by <= now_utc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Wish fulfillment deadline has passed. This wish can no longer be claimed."
            )

        # 3. Atomically compute sum of active claims
        active_claims_sum = await db.scalar(
            select(func.coalesce(func.sum(WishClaim.qty), 0))
            .where(WishClaim.wish_id == wish.id, WishClaim.status == "active")
        ) or 0

        remaining_qty = wish.qty_requested - active_claims_sum

        # 4. Check quantity availability
        if payload.qty > remaining_qty:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Requested quantity ({payload.qty}) is not available. "
                    f"Only {remaining_qty} item(s) remain open for claims on this wish."
                )
            )

        # 5. Compute deadline: default 14 days, never later than needed_by
        default_deadline = now_utc + timedelta(days=14)
        deadline = min(default_deadline, wish.needed_by)

        # 6. Insert new claim
        new_claim = WishClaim(
            wish_id=wish.id,
            donor_id=current_user.id,
            qty=payload.qty,
            deadline=deadline,
            status="active",
            created_at=now_utc,
            updated_at=now_utc
        )
        db.add(new_claim)
        await db.flush()

        # 7. Synchronize parent wish status
        new_active_total = active_claims_sum + payload.qty
        if new_active_total >= wish.qty_requested:
            wish.status = "claimed"
        else:
            wish.status = "partially_claimed"
        wish.updated_at = now_utc

        # 8. Record audit entry with hash chaining
        await record_audit_event(
            session=db,
            entity_type="wish_claims",
            entity_id=new_claim.id,
            action="CLAIM_CREATED",
            old_status=None,
            new_status="active",
            changed_by=current_user.id,
            details=f"Donor #{current_user.id} claimed {payload.qty} item(s) on wish #{wish.id}.",
            created_at=now_utc
        )

        # 9. Atomic commit
        await db.commit()
        await db.refresh(new_claim)

        return ClaimResponse.model_validate(new_claim)

@router.post("/claims/{claim_id}/release", response_model=ClaimResponse)
@router.post("/wishes/{wish_id}/claims/{claim_id}/release", response_model=ClaimResponse)
async def release_claim(
    claim_id: int,
    wish_id: Optional[int] = None,
    current_user: User = Depends(require_role("donor")),
    db: AsyncSession = Depends(get_db)
):
    """
    Enables a donor to voluntarily release their own active claim.
    Restores the parent wish status and records an audit log entry.
    """
    # 1. Fetch claim
    stmt = select(WishClaim).where(WishClaim.id == claim_id)
    res = await db.execute(stmt)
    claim = res.scalar_one_or_none()

    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim #{claim_id} not found."
        )

    # Optional wish_id check for URL consistency
    if wish_id is not None and claim.wish_id != wish_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Claim #{claim_id} does not belong to wish #{wish_id}."
        )

    # 2. Ownership check: Only the donor who pledged can release it
    if claim.donor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only release your own claims."
        )

    # 3. Status check: Only active claims can be released
    if claim.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot release claim #{claim_id} because its status is already '{claim.status}'."
        )

    # 4. Release claim and re-evaluate wish status atomically
    async with get_wish_lock(claim.wish_id):
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        old_status = claim.status
        claim.status = "released"
        claim.updated_at = now_utc

        # Fetch parent wish
        w_stmt = select(Wish).where(Wish.id == claim.wish_id)
        w_res = await db.execute(w_stmt)
        wish = w_res.scalar_one_or_none()

        if wish and wish.status in ("claimed", "partially_claimed"):
            # Compute remaining active claims excluding this released claim
            other_active_sum = await db.scalar(
                select(func.coalesce(func.sum(WishClaim.qty), 0))
                .where(
                    WishClaim.wish_id == wish.id,
                    WishClaim.status == "active",
                    WishClaim.id != claim.id
                )
            ) or 0

            if other_active_sum == 0:
                wish.status = "open"
            elif other_active_sum < wish.qty_requested:
                wish.status = "partially_claimed"
            else:
                wish.status = "claimed"
            wish.updated_at = now_utc

        # 5. Audit log entry with hash chaining
        await record_audit_event(
            session=db,
            entity_type="wish_claims",
            entity_id=claim.id,
            action="STATUS_CHANGE",
            old_status=old_status,
            new_status="released",
            changed_by=current_user.id,
            details=f"Claim #{claim.id} released by donor #{current_user.id}. Quantity {claim.qty} returned to open pool.",
            created_at=now_utc
        )

        await db.commit()
        await db.refresh(claim)

        return ClaimResponse.model_validate(claim)

@router.post("/admin/claims/release-stale", response_model=StaleClaimsReleaseResponse)
@router.post("/claims/release-stale", response_model=StaleClaimsReleaseResponse)
async def trigger_stale_claim_release(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Administrative endpoint to manually execute sp_release_stale_claims.
    Releases overdue active claims, restores wish statuses, and dispatches notifications.
    """
    expired_count = await release_stale_claims(db)
    return StaleClaimsReleaseResponse(
        message=f"Successfully executed stale claims release job. {expired_count} claim(s) expired.",
        expired_claims_count=expired_count,
        executed_at=datetime.now(timezone.utc)
    )

