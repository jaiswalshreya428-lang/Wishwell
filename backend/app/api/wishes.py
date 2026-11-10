"""
Wishes API Router (/api/wishes)
Manages the complete lifecycle of item requests posted by verified children's homes.

VIVA DEFENSE NOTES:
1. Dual-Layer Verification Guard:
   - Only institutions with status 'verified' can create wishes.
   - Enforced at API layer (HTTP 403) AND guaranteed at database layer by trigger
     trg_wishes_enforce_verified_institution.
2. Duplicate-Need Detection:
   - Explainable token-overlap & normalized matching prevents accidental duplicate requests.
   - Returns HTTP 409 Conflict with duplicate details unless confirm_duplicate=True flag is supplied.
3. Strict Invariant on Active Claims:
   - A wish CANNOT be edited or cancelled if any active claims exist on it.
4. Database View Integration:
   - Listing reads directly from dbo.v_open_wishes view with server-side pagination and filters.
"""

from datetime import datetime, timezone
from typing import Optional, List
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.duplicate_detector import find_duplicate_wishes
from app.models.entities import User, Institution, Wish, Category, WishClaim, AuditLog, OpenWishView
from app.core.audit import record_audit_event
from app.schemas.wish import (
    WishCreate,
    WishUpdate,
    WishResponse,
    WishListResponse,
    WishDetailResponse,
    OpenWishViewResponse,
)

router = APIRouter(prefix="/wishes", tags=["Wishes"])

@router.post("", response_model=WishResponse, status_code=status.HTTP_201_CREATED)
async def create_wish(
    payload: WishCreate,
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new wish for physical items needed by a children's home.
    RESTRICTIONS:
    - Only verified institutions can post wishes.
    - Needed-by date must be strictly in the future.
    - Duplicate check: flags similar open wishes unless confirm_duplicate=true.
    """
    # 1. Fetch institution record for the authenticated user
    inst_stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(inst_stmt)
    institution = inst_res.scalar_one_or_none()

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    # 2. Dual-layer guard: Enforce verified status in API
    if institution.status != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: Only verified institutions can post wishes. Your current institution status is '{institution.status}'."
        )

    # 3. Check category exists
    cat_stmt = select(Category).where(Category.id == payload.category_id)
    cat_res = await db.execute(cat_stmt)
    category = cat_res.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category #{payload.category_id} not found."
        )

    # 4. Check needed_by date is strictly in the future
    now = datetime.now(timezone.utc)
    needed_by = payload.needed_by
    if needed_by.tzinfo is None:
        needed_by = needed_by.replace(tzinfo=timezone.utc)

    if needed_by <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The needed_by date must be strictly in the future."
        )

    # 5. Explainable Duplicate-Need Check
    # Query all open/partially_claimed wishes posted by the same institution in the same category
    if not payload.confirm_duplicate:
        dup_stmt = select(Wish).where(
            Wish.institution_id == institution.id,
            Wish.category_id == payload.category_id,
            Wish.status.in_(["open", "partially_claimed"])
        )
        dup_res = await db.execute(dup_stmt)
        open_wishes = list(dup_res.scalars().all())

        duplicates = find_duplicate_wishes(payload.item_name, open_wishes, similarity_threshold=0.5)
        if duplicates:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Potential duplicate wish detected. Similar open wishes already exist in this category for your institution.",
                    "duplicate_detected": True,
                    "similar_wishes": [
                        {
                            "id": d.wish_id,
                            "title": d.title,
                            "item_name": d.item_name,
                            "qty_requested": d.qty_requested,
                            "status": d.status,
                            "similarity_score": d.similarity_score,
                            "match_reason": d.match_reason,
                        }
                        for d in duplicates
                    ],
                    "action_required": "Set confirm_duplicate=true in your request payload to bypass this warning and create the wish anyway."
                }
            )

    # 6. Insert Wish entity
    utc_timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
    new_wish = Wish(
        institution_id=institution.id,
        category_id=category.id,
        title=payload.title,
        description=payload.description,
        item_name=payload.item_name,
        qty_requested=payload.qty_requested,
        needed_by=needed_by.replace(tzinfo=None),
        status="open",
        created_at=utc_timestamp,
        updated_at=utc_timestamp,
    )
    db.add(new_wish)
    await db.commit()
    await db.refresh(new_wish)

    return WishResponse.model_validate(new_wish)

@router.put("/{wish_id}", response_model=WishResponse)
async def edit_wish(
    wish_id: int,
    payload: WishUpdate,
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Edits a wish.
    RESTRICTION: strictly only permitted while NO active claims exist on the wish.
    """
    # 1. Fetch institution profile
    inst_stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(inst_stmt)
    institution = inst_res.scalar_one_or_none()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    # 2. Fetch target wish
    wish_stmt = select(Wish).where(Wish.id == wish_id)
    wish_res = await db.execute(wish_stmt)
    wish = wish_res.scalar_one_or_none()
    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wish #{wish_id} not found."
        )

    # 3. Ownership check: Only the owning institution can edit
    if wish.institution_id != institution.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only edit wishes created by your own institution."
        )

    # 4. Check wish status
    if wish.status in ("cancelled", "expired", "delivered"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit wish because its current status is '{wish.status}'."
        )

    # 5. CORE INVARIANT: Strictly cannot edit if active claims exist
    active_claims_count = await db.scalar(
        select(func.count())
        .select_from(WishClaim)
        .where(WishClaim.wish_id == wish.id, WishClaim.status == "active")
    ) or 0

    if active_claims_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit wish #{wish_id}: There are {active_claims_count} active donor claims on this wish."
        )

    # 6. Validate updated category if provided
    if payload.category_id is not None:
        cat_stmt = select(Category).where(Category.id == payload.category_id)
        cat_res = await db.execute(cat_stmt)
        if not cat_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category #{payload.category_id} not found."
            )
        wish.category_id = payload.category_id

    # 7. Validate updated needed_by if provided
    if payload.needed_by is not None:
        now = datetime.now(timezone.utc)
        needed_by = payload.needed_by
        if needed_by.tzinfo is None:
            needed_by = needed_by.replace(tzinfo=timezone.utc)
        if needed_by <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The needed_by date must be strictly in the future."
            )
        wish.needed_by = needed_by.replace(tzinfo=None)

    # 8. Apply remaining updates
    if payload.title is not None:
        wish.title = payload.title
    if payload.description is not None:
        wish.description = payload.description
    if payload.item_name is not None:
        wish.item_name = payload.item_name
    if payload.qty_requested is not None:
        wish.qty_requested = payload.qty_requested

    wish.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(wish)

    return WishResponse.model_validate(wish)

@router.post("/{wish_id}/cancel", response_model=WishResponse)
@router.delete("/{wish_id}", response_model=WishResponse)
async def cancel_wish(
    wish_id: int,
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancels a wish.
    RESTRICTION: strictly only permitted while NO active claims exist on the wish.
    """
    # 1. Fetch institution profile
    inst_stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(inst_stmt)
    institution = inst_res.scalar_one_or_none()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    # 2. Fetch target wish
    wish_stmt = select(Wish).where(Wish.id == wish_id)
    wish_res = await db.execute(wish_stmt)
    wish = wish_res.scalar_one_or_none()
    if not wish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wish #{wish_id} not found."
        )

    # 3. Ownership check
    if wish.institution_id != institution.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only cancel wishes created by your own institution."
        )

    # 4. Check if already cancelled
    if wish.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wish is already cancelled."
        )

    if wish.status in ("delivered", "expired"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a wish that has status '{wish.status}'."
        )

    # 5. CORE INVARIANT: Strictly cannot cancel if active claims exist
    active_claims_count = await db.scalar(
        select(func.count())
        .select_from(WishClaim)
        .where(WishClaim.wish_id == wish.id, WishClaim.status == "active")
    ) or 0

    if active_claims_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel wish #{wish_id}: There are {active_claims_count} active donor claims on this wish."
        )

    # 6. Mark wish as cancelled and write audit entry
    old_status = wish.status
    wish.status = "cancelled"
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    wish.updated_at = now_utc

    # Record audit entry with hash chaining
    await record_audit_event(
        session=db,
        entity_type="wish",
        entity_id=wish.id,
        action="cancel",
        old_status=old_status,
        new_status="cancelled",
        changed_by=current_user.id,
        details="Wish cancelled by institution.",
        created_at=now_utc,
    )

    await db.commit()
    await db.refresh(wish)

    return WishResponse.model_validate(wish)

@router.get("", response_model=WishListResponse)
async def list_open_wishes(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    institution_id: Optional[int] = Query(None, description="Filter by institution ID"),
    needed_by_from: Optional[datetime] = Query(None, description="Filter wishes needed on or after this UTC timestamp"),
    needed_by_to: Optional[datetime] = Query(None, description="Filter wishes needed on or before this UTC timestamp"),
    needed_by_after: Optional[datetime] = Query(None, description="Alias for needed_by_from"),
    needed_by_before: Optional[datetime] = Query(None, description="Alias for needed_by_to"),
    search: Optional[str] = Query(None, description="Search keyword across item name, title, or description"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Alias for page_size"),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists open wishes for public and donor browsing.
    VIVA REQUIREMENT: Directly reads from dbo.v_open_wishes view with server-side pagination.
    """
    effective_page_size = limit if limit is not None else page_size
    from_date = needed_by_after if needed_by_after is not None else needed_by_from
    to_date = needed_by_before if needed_by_before is not None else needed_by_to

    stmt = select(OpenWishView)
    count_stmt = select(func.count()).select_from(OpenWishView)

    filters = []

    if category_id is not None:
        filters.append(OpenWishView.category_id == category_id)

    if institution_id is not None:
        filters.append(OpenWishView.institution_id == institution_id)

    if from_date is not None:
        from_utc = from_date.replace(tzinfo=None) if from_date.tzinfo else from_date
        filters.append(OpenWishView.needed_by >= from_utc)

    if to_date is not None:
        to_utc = to_date.replace(tzinfo=None) if to_date.tzinfo else to_date
        filters.append(OpenWishView.needed_by <= to_utc)

    if search:
        search_pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                OpenWishView.item_name.ilike(search_pattern),
                OpenWishView.wish_title.ilike(search_pattern),
                OpenWishView.wish_description.ilike(search_pattern)
            )
        )

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    # Total count
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    total_pages = ceil(total / effective_page_size) if total > 0 else 1

    # Order by needed_by ASC (urgent first) and wish_id ASC
    offset = (page - 1) * effective_page_size
    stmt = stmt.order_by(OpenWishView.needed_by.asc(), OpenWishView.wish_id.asc()).offset(offset).limit(effective_page_size)

    records_res = await db.execute(stmt)
    records = records_res.scalars().all()

    items = [OpenWishViewResponse.model_validate(r) for r in records]

    return WishListResponse(
        items=items,
        total=total,
        page=page,
        page_size=effective_page_size,
        limit=effective_page_size,
        total_pages=total_pages
    )

@router.get("/{wish_id}", response_model=WishDetailResponse)
async def get_wish_detail(
    wish_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves complete details for a specific wish.
    Includes category details, institution details, and active claim statistics.
    """
    stmt = (
        select(Wish, Category, Institution)
        .join(Category, Wish.category_id == Category.id)
        .join(Institution, Wish.institution_id == Institution.id)
        .where(Wish.id == wish_id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wish #{wish_id} not found."
        )

    wish, category, institution = row

    # Compute sum of active claims dynamically
    claims_sum = await db.scalar(
        select(func.coalesce(func.sum(WishClaim.qty), 0))
        .where(WishClaim.wish_id == wish.id, WishClaim.status == "active")
    ) or 0

    qty_remaining = max(0, wish.qty_requested - claims_sum)

    return WishDetailResponse(
        id=wish.id,
        institution_id=wish.institution_id,
        category_id=wish.category_id,
        title=wish.title,
        description=wish.description,
        item_name=wish.item_name,
        qty_requested=wish.qty_requested,
        qty_claimed=claims_sum,
        qty_remaining=qty_remaining,
        needed_by=wish.needed_by,
        status=wish.status,
        created_at=wish.created_at,
        updated_at=wish.updated_at,
        institution_name=institution.name,
        institution_city=institution.city,
        institution_state=institution.state,
        institution_status=institution.status,
        category_name=category.name
    )
