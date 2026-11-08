"""
Donor Impact API Router
Aggregates donation metrics, category distributions, institutions supported, and chronological timeline.

VIVA DEFENSE NOTES:
1. Transparency & Donor Retention:
   - Donors see tangible verification that their physical items arrived safely.
   - Calculates verified impact from confirmed deliveries (never unconfirmed pledges).
2. Multi-Dimensional Metrics:
   - Total distinct wishes fulfilled.
   - Total physical item count delivered.
   - Items categorized by need domain (Educational Supplies, Bedding, Hygiene, etc.).
   - Distinct verified institutions supported.
   - Rich chronological timeline of confirmations and thank-you notes.
"""

from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.storage import storage_service
from app.models.entities import User, Wish, WishClaim, Delivery, ThankYouNote, Category, Institution
from app.schemas.delivery import (
    DonorImpactResponse,
    CategoryImpact,
    ImpactTimelineItem,
)

router = APIRouter(tags=["Impact"])

@router.get("/donors/impact", response_model=DonorImpactResponse)
@router.get("/donors/me/impact", response_model=DonorImpactResponse)
@router.get("/impact", response_model=DonorImpactResponse)
async def get_donor_impact(
    current_user: User = Depends(require_role("donor")),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns comprehensive impact statistics for the authenticated donor.
    Calculates verified statistics based strictly on confirmed deliveries.
    """
    # 1. Total wishes fulfilled (distinct wishes with confirmed deliveries)
    wishes_fulfilled = await db.scalar(
        select(func.count(func.distinct(WishClaim.wish_id)))
        .join(Delivery, WishClaim.id == Delivery.wish_claim_id)
        .where(WishClaim.donor_id == current_user.id, Delivery.status == "confirmed")
    ) or 0

    # 2. Total items delivered (sum of claimed qty for confirmed deliveries)
    items_delivered = await db.scalar(
        select(func.coalesce(func.sum(WishClaim.qty), 0))
        .join(Delivery, WishClaim.id == Delivery.wish_claim_id)
        .where(WishClaim.donor_id == current_user.id, Delivery.status == "confirmed")
    ) or 0

    # 3. Distinct institutions helped
    institutions_helped = await db.scalar(
        select(func.count(func.distinct(Wish.institution_id)))
        .join(WishClaim, Wish.id == WishClaim.wish_id)
        .join(Delivery, WishClaim.id == Delivery.wish_claim_id)
        .where(WishClaim.donor_id == current_user.id, Delivery.status == "confirmed")
    ) or 0

    # 4. Items delivered by category
    cat_stmt = (
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.sum(WishClaim.qty).label("items_count")
        )
        .join(Wish, Category.id == Wish.category_id)
        .join(WishClaim, Wish.id == WishClaim.wish_id)
        .join(Delivery, WishClaim.id == Delivery.wish_claim_id)
        .where(WishClaim.donor_id == current_user.id, Delivery.status == "confirmed")
        .group_by(Category.id, Category.name)
        .order_by(func.sum(WishClaim.qty).desc())
    )
    cat_res = await db.execute(cat_stmt)
    category_rows = cat_res.all()

    category_impact = [
        CategoryImpact(
            category_id=row.category_id,
            category_name=row.category_name,
            items_count=row.items_count
        )
        for row in category_rows
    ]

    # 5. Timeline construction
    timeline_items: List[ImpactTimelineItem] = []

    # 5a. Confirmed Deliveries
    del_stmt = (
        select(Delivery, WishClaim, Wish, Institution)
        .join(WishClaim, Delivery.wish_claim_id == WishClaim.id)
        .join(Wish, WishClaim.wish_id == Wish.id)
        .join(Institution, Wish.institution_id == Institution.id)
        .where(WishClaim.donor_id == current_user.id, Delivery.status == "confirmed")
        .order_by(Delivery.confirmed_at.desc())
    )
    del_res = await db.execute(del_stmt)
    for delivery, claim, wish, institution in del_res.all():
        sas_url = storage_service.generate_delivery_proof_sas_url(delivery.photo_url) if delivery.photo_url else None
        timeline_items.append(
            ImpactTimelineItem(
                id=delivery.id,
                date=delivery.confirmed_at or delivery.created_at,
                event_type="delivery_confirmed",
                title=f"Delivery Confirmed by {institution.name}",
                description=f"Received {claim.qty}x '{wish.item_name}'. {delivery.confirmation_notes or 'Items verified in good condition.'}",
                wish_title=wish.title,
                institution_name=institution.name,
                qty=claim.qty,
                photo_sas_url=sas_url
            )
        )

    # 5b. Thank-You Notes
    ty_stmt = (
        select(ThankYouNote, Wish, Institution)
        .join(Wish, ThankYouNote.wish_id == Wish.id)
        .join(Institution, ThankYouNote.institution_id == Institution.id)
        .where(ThankYouNote.donor_id == current_user.id)
        .order_by(ThankYouNote.created_at.desc())
    )
    ty_res = await db.execute(ty_stmt)
    for ty_note, wish, institution in ty_res.all():
        sas_url = storage_service.generate_delivery_proof_sas_url(ty_note.photo_url) if ty_note.photo_url else None
        timeline_items.append(
            ImpactTimelineItem(
                id=ty_note.id,
                date=ty_note.created_at,
                event_type="thank_you_received",
                title=f"Thank-You Note from {institution.name}",
                description=ty_note.message,
                wish_title=wish.title,
                institution_name=institution.name,
                qty=0,
                photo_sas_url=sas_url
            )
        )

    # Sort combined timeline by date descending
    timeline_items.sort(key=lambda t: t.date, reverse=True)

    return DonorImpactResponse(
        total_wishes_fulfilled=wishes_fulfilled,
        total_items_delivered=items_delivered,
        institutions_helped=institutions_helped,
        items_delivered_by_category=category_impact,
        timeline=timeline_items
    )

