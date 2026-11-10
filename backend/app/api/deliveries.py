"""
Deliveries & Thank-You Notes API Router
Handles physical item delivery tracking, proof photo validation, receipt confirmation,
and thank-you notes.

Engineering Design Notes:
1. Strict Role Authorization:
   - Donor marks claim as delivered.
   - ONLY the institution owning the wish can confirm receipt.
   - Donors are strictly prevented from confirming their own delivery (HTTP 403).
2. Privacy & Safety Protection:
   - Delivery proof photo content type is verified.
   - Re-encoded via Pillow, stripping all EXIF (including GPS data) to safeguard children.
   - Stored in a private Blob container and served via short-lived SAS URLs.
3. One Thank-You Note Per Delivery:
   - Enforced by unique constraint and API check.
   - Dispatches a notification to the donor.
"""

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.storage import storage_service
from app.core.cosmos import cosmos_service
from app.models.entities import User, Institution, Wish, WishClaim, Delivery, ThankYouNote, Notification, AuditLog
from app.core.audit import record_audit_event
from app.schemas.delivery import (
    DeliveryCreate,
    DeliveryResponse,
    ThankYouNoteCreate,
    ThankYouNoteResponse,
)

router = APIRouter(tags=["Deliveries"])

@router.post("/claims/{claim_id}/deliver", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED)
async def mark_claim_as_delivered(
    claim_id: int,
    payload: Optional[DeliveryCreate] = None,
    current_user: User = Depends(require_role("donor")),
    db: AsyncSession = Depends(get_db)
):
    """
    Donor marks a pledged claim as dispatched/delivered.
    Creates a delivery tracking record and notifies the children's home.
    """
    if payload is None:
        payload = DeliveryCreate()
    # 1. Fetch claim with parent wish and institution
    stmt = (
        select(WishClaim, Wish, Institution)
        .join(Wish, WishClaim.wish_id == Wish.id)
        .join(Institution, Wish.institution_id == Institution.id)
        .where(WishClaim.id == claim_id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim #{claim_id} not found."
        )

    claim, wish, institution = row

    # 2. Ownership check: Only the donor who pledged can mark delivered
    if claim.donor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only mark your own claims as delivered."
        )

    # 3. Status check: Only active claims can be delivered
    if claim.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot deliver claim #{claim_id} because its current status is '{claim.status}'."
        )

    # 4. Check if delivery record already exists
    del_stmt = select(Delivery).where(Delivery.wish_claim_id == claim.id)
    del_res = await db.execute(del_stmt)
    delivery = del_res.scalar_one_or_none()

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    if not delivery:
        delivery = Delivery(
            wish_claim_id=claim.id,
            tracking_number=payload.tracking_number,
            carrier=payload.carrier,
            status="delivered",
            delivered_at=now_utc,
            created_at=now_utc,
            updated_at=now_utc
        )
        db.add(delivery)
    else:
        delivery.status = "delivered"
        delivery.delivered_at = now_utc
        if payload.tracking_number:
            delivery.tracking_number = payload.tracking_number
        if payload.carrier:
            delivery.carrier = payload.carrier
        delivery.updated_at = now_utc

    # 5. Transition claim status to delivered
    claim.status = "delivered"
    claim.updated_at = now_utc

    # 6. Notify the children's home director
    notif = Notification(
        user_id=institution.user_id,
        title="Items Marked as Delivered",
        message=(
            f"Donor {current_user.full_name} has dispatched {claim.qty} item(s) "
            f"for wish '{wish.title}'. Please confirm receipt once received."
        ),
        type="delivery_update",
        is_read=False,
        created_at=now_utc
    )
    db.add(notif)
    await db.flush()  # Flush so delivery.id is populated

    # 7. Write audit log with hash chaining
    await record_audit_event(
        session=db,
        entity_type="deliveries",
        entity_id=delivery.id,
        action="MARKED_DELIVERED",
        old_status="in_transit",
        new_status="delivered",
        changed_by=current_user.id,
        details=f"Claim #{claim.id} marked as delivered by donor #{current_user.id}.",
        created_at=now_utc
    )

    # 8. Store semi-structured delivery metadata in Cosmos DB (partition key: /claim_id)
    try:
        await cosmos_service.store_delivery_metadata(
            claim_id=claim.id,
            delivery_id=delivery.id,
            status="delivered",
            tracking_number=delivery.tracking_number,
            carrier=delivery.carrier,
            notes=None,
            extra_info={
                "donor_id": current_user.id,
                "wish_id": wish.id,
                "dispatched_at": now_utc.isoformat(),
            }
        )
    except Exception as exc:
        pass  # Resilient fallback: API action succeeds even if Cosmos DB encounters an issue

    await db.commit()
    await db.refresh(delivery)

    return DeliveryResponse(
        id=delivery.id,
        wish_claim_id=claim.id,
        wish_id=wish.id,
        donor_id=claim.donor_id,
        institution_id=institution.id,
        tracking_number=delivery.tracking_number,
        carrier=delivery.carrier,
        photo_url=delivery.photo_url,
        photo_sas_url=None,
        proof_photo_blob_name=delivery.photo_url,
        proof_photo_sas_url=None,
        status=delivery.status,
        delivered_at=delivery.delivered_at,
        confirmed_by=delivery.confirmed_by,
        confirmed_at=delivery.confirmed_at,
        confirmation_notes=delivery.confirmation_notes,
        created_at=delivery.created_at,
        updated_at=delivery.updated_at,
        item_name=wish.item_name,
        qty=claim.qty,
        wish_title=wish.title
    )

@router.post("/deliveries/{delivery_id}/confirm", response_model=DeliveryResponse)
async def confirm_delivery(
    delivery_id: int,
    file: Optional[UploadFile] = File(None, description="Proof photo of received physical items"),
    photo: Optional[UploadFile] = File(None, description="Proof photo alias from frontend form data"),
    notes: Optional[str] = Form(None, max_length=1000, description="Optional delivery confirmation notes"),
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Institution confirms receipt of physical items by uploading photo proof.
    SECURITY & PRIVACY:
    - ONLY the institution owning the wish can confirm.
    - Donors CANNOT confirm their own deliveries (HTTP 403).
    - Image is validated, re-encoded with Pillow, all EXIF/GPS data stripped, and saved to private blob container.
    """
    proof_file = photo or file
    if proof_file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery proof photo is required."
        )

    # 1. Fetch institution profile of the authenticated user
    inst_stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(inst_stmt)
    current_institution = inst_res.scalar_one_or_none()

    if not current_institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    # 2. Fetch delivery joined with claim and wish
    del_stmt = (
        select(Delivery, WishClaim, Wish)
        .join(WishClaim, Delivery.wish_claim_id == WishClaim.id)
        .join(Wish, WishClaim.wish_id == Wish.id)
        .where(Delivery.id == delivery_id)
    )
    res = await db.execute(del_stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery #{delivery_id} not found."
        )

    delivery, claim, wish = row

    # 3. CORE SECURITY RULE: Only the owning institution can confirm
    if wish.institution_id != current_institution.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the institution that posted the wish can confirm delivery receipt."
        )

    # 4. Check if already confirmed
    if delivery.status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery #{delivery_id} has already been confirmed."
        )

    # 5. Process proof photo: Validate, re-encode with Pillow, strip EXIF/GPS
    file_bytes = await proof_file.read()
    blob_name, file_size, mime_type = storage_service.upload_delivery_proof(
        file_bytes=file_bytes,
        original_filename=proof_file.filename or "delivery_proof.jpg"
    )

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    old_status = delivery.status

    # 6. Update delivery record
    delivery.photo_url = blob_name
    delivery.status = "confirmed"
    delivery.confirmed_by = current_user.id
    delivery.confirmed_at = now_utc
    delivery.confirmation_notes = notes
    delivery.updated_at = now_utc

    # 7. Check if wish is completely delivered
    # Sum of confirmed delivered quantities on this wish
    confirmed_qty = await db.scalar(
        select(func.coalesce(func.sum(WishClaim.qty), 0))
        .join(Delivery, WishClaim.id == Delivery.wish_claim_id)
        .where(
            WishClaim.wish_id == wish.id,
            Delivery.status == "confirmed"
        )
    ) or 0

    if confirmed_qty >= wish.qty_requested:
        wish.status = "delivered"
        wish.updated_at = now_utc

    # 8. Notify the donor that their items arrived safely
    notif = Notification(
        user_id=claim.donor_id,
        title="Delivery Confirmed!",
        message=(
            f"{current_institution.name} has confirmed safe receipt of your donated items "
            f"for wish '{wish.title}'. Thank you for your kindness!"
        ),
        type="delivery_update",
        is_read=False,
        created_at=now_utc
    )
    db.add(notif)

    # 9. Write audit log with hash chaining
    await record_audit_event(
        session=db,
        entity_type="deliveries",
        entity_id=delivery.id,
        action="CONFIRMED",
        old_status=old_status,
        new_status="confirmed",
        changed_by=current_user.id,
        details=f"Delivery #{delivery.id} confirmed with photo proof by institution director #{current_user.id}.",
        created_at=now_utc
    )

    # 10. Store semi-structured delivery confirmation metadata in Cosmos DB (partition key: /claim_id)
    try:
        await cosmos_service.store_delivery_metadata(
            claim_id=claim.id,
            delivery_id=delivery.id,
            status="confirmed",
            tracking_number=delivery.tracking_number,
            carrier=delivery.carrier,
            photo_blob=blob_name,
            notes=notes,
            extra_info={
                "confirmed_by": current_user.id,
                "institution_id": current_institution.id,
                "confirmed_at": now_utc.isoformat(),
                "photo_size_bytes": file_size,
                "mime_type": mime_type,
            }
        )
    except Exception as exc:
        pass  # Resilient fallback: API action succeeds even if Cosmos DB encounters an issue

    await db.commit()
    await db.refresh(delivery)

    sas_url = storage_service.generate_delivery_proof_sas_url(blob_name)

    return DeliveryResponse(
        id=delivery.id,
        wish_claim_id=claim.id,
        wish_id=wish.id,
        donor_id=claim.donor_id,
        institution_id=current_institution.id,
        tracking_number=delivery.tracking_number,
        carrier=delivery.carrier,
        photo_url=delivery.photo_url,
        photo_sas_url=sas_url,
        proof_photo_blob_name=delivery.photo_url,
        proof_photo_sas_url=sas_url,
        status=delivery.status,
        delivered_at=delivery.delivered_at,
        confirmed_by=delivery.confirmed_by,
        confirmed_at=delivery.confirmed_at,
        confirmation_notes=delivery.confirmation_notes,
        created_at=delivery.created_at,
        updated_at=delivery.updated_at,
        item_name=wish.item_name,
        qty=claim.qty,
        wish_title=wish.title
    )

@router.get("/deliveries/institution/pending", response_model=List[DeliveryResponse])
async def get_pending_deliveries_for_institution(
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all incoming deliveries dispatched by donors awaiting receipt confirmation by the institution.
    """
    inst_stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(inst_stmt)
    current_institution = inst_res.scalar_one_or_none()

    if not current_institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    stmt = (
        select(Delivery, WishClaim, Wish)
        .join(WishClaim, Delivery.wish_claim_id == WishClaim.id)
        .join(Wish, WishClaim.wish_id == Wish.id)
        .where(
            Wish.institution_id == current_institution.id,
            Delivery.status.in_(["delivered", "pending_confirmation"])
        )
        .order_by(Delivery.created_at.desc())
    )
    res = await db.execute(stmt)
    deliveries_list = []
    for delivery, claim, wish in res.all():
        sas_url = storage_service.generate_delivery_proof_sas_url(delivery.photo_url) if delivery.photo_url else None
        deliveries_list.append(DeliveryResponse(
            id=delivery.id,
            wish_claim_id=claim.id,
            wish_id=wish.id,
            donor_id=claim.donor_id,
            institution_id=current_institution.id,
            tracking_number=delivery.tracking_number,
            carrier=delivery.carrier,
            photo_url=delivery.photo_url,
            photo_sas_url=sas_url,
            proof_photo_blob_name=delivery.photo_url,
            proof_photo_sas_url=sas_url,
            status=delivery.status,
            delivered_at=delivery.delivered_at,
            confirmed_by=delivery.confirmed_by,
            confirmed_at=delivery.confirmed_at,
            confirmation_notes=delivery.confirmation_notes,
            created_at=delivery.created_at,
            updated_at=delivery.updated_at,
            item_name=wish.item_name,
            qty=claim.qty,
            wish_title=wish.title
        ))
    return deliveries_list

@router.post("/deliveries/{delivery_id}/thank-you", response_model=ThankYouNoteResponse, status_code=status.HTTP_201_CREATED)
async def post_thank_you_note(
    delivery_id: int,
    payload: ThankYouNoteCreate,
    current_user: User = Depends(require_role("institution")),
    db: AsyncSession = Depends(get_db)
):
    """
    Institution posts a thank-you note to the donor for a confirmed delivery.
    SYSTEM INVARIANT: Exactly one thank-you note permitted per delivery.
    """
    # 1. Fetch institution profile
    inst_stmt = select(Institution).where(Institution.user_id == current_user.id)
    inst_res = await db.execute(inst_stmt)
    current_institution = inst_res.scalar_one_or_none()

    if not current_institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution profile not found."
        )

    # 2. Fetch delivery joined with claim and wish
    del_stmt = (
        select(Delivery, WishClaim, Wish)
        .join(WishClaim, Delivery.wish_claim_id == WishClaim.id)
        .join(Wish, WishClaim.wish_id == Wish.id)
        .where(Delivery.id == delivery_id)
    )
    res = await db.execute(del_stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery #{delivery_id} not found."
        )

    delivery, claim, wish = row

    # 3. Ownership check
    if wish.institution_id != current_institution.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only post thank-you notes for deliveries to your institution."
        )

    # 4. Check delivery status: Must be confirmed
    if delivery.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot post a thank-you note for delivery #{delivery_id} because its status is '{delivery.status}' (must be 'confirmed')."
        )

    # 5. Core Invariant: One thank-you note per delivery
    existing_stmt = select(ThankYouNote).where(ThankYouNote.delivery_id == delivery.id)
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A thank-you note has already been posted for delivery #{delivery_id}."
        )

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # 6. Create ThankYouNote entity
    thank_you = ThankYouNote(
        wish_id=wish.id,
        institution_id=current_institution.id,
        donor_id=claim.donor_id,
        delivery_id=delivery.id,
        message=payload.message,
        impact_summary=payload.impact_summary,
        photo_url=delivery.photo_url,
        created_at=now_utc
    )
    db.add(thank_you)

    # 7. Notify donor
    notif = Notification(
        user_id=claim.donor_id,
        title="You received a Thank-You Note!",
        message=(
            f"{current_institution.name} posted a thank-you note for your donation to "
            f"wish '{wish.title}': \"{payload.message[:100]}...\""
        ),
        type="thank_you",
        is_read=False,
        created_at=now_utc
    )
    db.add(notif)

    await db.commit()
    await db.refresh(thank_you)

    sas_url = storage_service.generate_delivery_proof_sas_url(thank_you.photo_url) if thank_you.photo_url else None

    return ThankYouNoteResponse(
        id=thank_you.id,
        delivery_id=thank_you.delivery_id,
        wish_id=thank_you.wish_id,
        institution_id=thank_you.institution_id,
        donor_id=thank_you.donor_id,
        message=thank_you.message,
        impact_summary=thank_you.impact_summary,
        photo_url=thank_you.photo_url,
        photo_sas_url=sas_url,
        created_at=thank_you.created_at
    )

