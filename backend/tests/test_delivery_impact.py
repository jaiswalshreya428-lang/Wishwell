"""
Test Suite for Delivery, Receipt Confirmation, Privacy/EXIF Stripping,
Thank-You Notes, Notifications, and Donor Impact (Task 6)

Covers:
1. Donor marking claim as delivered (dispatch tracking).
2. Protection: Donors cannot mark other donors' claims as delivered.
3. Institution confirming receipt by uploading proof photo of items.
4. Security & Privacy: Image verified, re-encoded with Pillow, all EXIF/GPS stripped, private container storage.
5. Invariant: Donor CANNOT confirm their own delivery (HTTP 403 Forbidden).
6. Invariant: Unauthorized institution cannot confirm delivery.
7. Rejection of corrupted / non-image files masquerading as photos.
8. Institution posting thank-you note (and rejection of multiple notes on same delivery).
9. Donor notification listing, unread count tracking, and mark-as-read transitions.
10. Donor impact endpoint: total wishes fulfilled, total items, category breakdowns, and timeline.
"""

import io
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select, update

from app.core.security import hash_password, create_access_token
from app.core.storage import storage_service
from app.models.entities import User, Institution, Wish, WishClaim, Delivery, ThankYouNote, Notification
from tests.conftest import TestAsyncSessionLocal

future_date = (datetime.now(timezone.utc) + timedelta(days=20)).replace(tzinfo=None)

def create_sample_jpeg_with_exif() -> bytes:
    """Generates an authentic JPEG image containing EXIF metadata to test stripping."""
    img = Image.new("RGB", (120, 120), color=(50, 150, 200))
    exif = img.getexif()
    exif[0x010E] = "Children Home Donation Items"
    exif[0x0131] = "WishWell Camera v1.0"
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()

async def setup_delivery_context(donor_user_id: int = 4):
    """Sets up a verified institution, wish, and active claim ready for delivery."""
    async with TestAsyncSessionLocal() as session:
        await session.execute(update(Institution).where(Institution.id == 1).values(status="verified"))
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        wish = Wish(
            institution_id=1,
            category_id=1,
            title="School Drawing Books",
            description="A3 art sketchbooks for children",
            item_name="A3 Drawing Sketchbooks",
            qty_requested=20,
            needed_by=future_date,
            status="partially_claimed",
            created_at=now,
            updated_at=now
        )
        session.add(wish)
        await session.flush()

        claim = WishClaim(
            wish_id=wish.id,
            donor_id=donor_user_id,
            qty=10,
            deadline=now + timedelta(days=14),
            status="active",
            created_at=now,
            updated_at=now
        )
        session.add(claim)
        await session.commit()
        await session.refresh(claim)
        return wish.id, claim.id

@pytest.mark.asyncio
async def test_donor_marks_claim_as_delivered_success(async_client: AsyncClient, donor_token: str):
    wish_id, claim_id = await setup_delivery_context()

    payload = {
        "tracking_number": "TRACK-WW-98765",
        "carrier": "BlueDart Express"
    }

    resp = await async_client.post(
        f"/api/claims/{claim_id}/deliver",
        json=payload,
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "delivered"
    assert data["tracking_number"] == "TRACK-WW-98765"
    assert data["carrier"] == "BlueDart Express"
    assert data["wish_claim_id"] == claim_id

    # Verify claim status in database
    async with TestAsyncSessionLocal() as session:
        claim = await session.get(WishClaim, claim_id)
        assert claim.status == "delivered"

        # Verify notification created for institution user (user_id=3)
        notif = await session.scalar(
            select(Notification).where(
                Notification.user_id == 3,
                Notification.type == "delivery_update"
            )
        )
        assert notif is not None
        assert "dispatched" in notif.message

@pytest.mark.asyncio
async def test_donor_cannot_deliver_other_donor_claim(async_client: AsyncClient, donor_token: str):
    wish_id, claim_id = await setup_delivery_context()

    # Create another donor account and token
    async with TestAsyncSessionLocal() as session:
        other_user = User(
            email="other.donor2@example.com",
            password_hash=hash_password("Pass123!"),
            full_name="Other Donor Two",
            role="donor"
        )
        session.add(other_user)
        await session.commit()
        await session.refresh(other_user)
        other_id = other_user.id

    other_token = create_access_token({"sub": str(other_id), "email": "other.donor2@example.com", "role": "donor", "name": "Other Donor Two"})

    # Attempt to mark someone else's claim as delivered
    resp = await async_client.post(
        f"/api/claims/{claim_id}/deliver",
        json={"tracking_number": "FAKE-123"},
        headers={"Authorization": f"Bearer {other_token}"}
    )
    assert resp.status_code == 403
    assert "only mark your own claims" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_institution_confirms_delivery_receipt_with_photo(async_client: AsyncClient, donor_token: str, institution_token: str):
    wish_id, claim_id = await setup_delivery_context()

    # 1. Donor marks delivered
    del_res = await async_client.post(
        f"/api/claims/{claim_id}/deliver",
        json={"tracking_number": "EXP-777", "carrier": "FedEx"},
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    delivery_id = del_res.json()["id"]

    # 2. Institution uploads proof photo with EXIF metadata
    sample_jpeg = create_sample_jpeg_with_exif()
    files = {"file": ("items_receipt.jpg", sample_jpeg, "image/jpeg")}
    data = {"notes": "All 10 sketchbooks received in pristine condition. Children will use them tomorrow."}

    confirm_res = await async_client.post(
        f"/api/deliveries/{delivery_id}/confirm",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "confirmed"
    assert confirm_data["confirmed_by"] is not None
    assert confirm_data["confirmation_notes"] == "All 10 sketchbooks received in pristine condition. Children will use them tomorrow."
    assert confirm_data["photo_url"] is not None
    assert "sig=" in confirm_data["photo_sas_url"]

    # 3. VERIFY EXIF STRIPPING: Check saved blob in storage
    saved_blob_name = confirm_data["photo_url"]
    cached_blob = storage_service._mock_blobs[saved_blob_name]
    saved_img = Image.open(io.BytesIO(cached_blob["bytes"]))
    # EXIF tags must be completely stripped
    assert len(saved_img.getexif()) == 0

    # 4. Verify donor notification was created
    async with TestAsyncSessionLocal() as session:
        notif = await session.scalar(
            select(Notification).where(
                Notification.user_id == 4,  # donor_id
                Notification.type == "delivery_update"
            ).order_by(Notification.created_at.desc())
        )
        assert notif is not None
        assert "confirmed safe receipt" in notif.message

@pytest.mark.asyncio
async def test_donor_cannot_confirm_own_delivery(async_client: AsyncClient, donor_token: str):
    """
    REQUIREMENT TEST: Proves that a donor cannot confirm their own delivery.
    Only the verified institution owning the wish can confirm.
    """
    wish_id, claim_id = await setup_delivery_context()

    del_res = await async_client.post(
        f"/api/claims/{claim_id}/deliver",
        json={"tracking_number": "EXP-123"},
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    delivery_id = del_res.json()["id"]

    sample_jpeg = create_sample_jpeg_with_exif()
    files = {"file": ("items_receipt.jpg", sample_jpeg, "image/jpeg")}

    # Donor attempts to confirm their own delivery
    confirm_res = await async_client.post(
        f"/api/deliveries/{delivery_id}/confirm",
        data={"notes": "Self confirmation attempt"},
        files=files,
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    # Blocked by RBAC: only 'institution' can call confirm
    assert confirm_res.status_code == 403
    assert "requires role in [institution]" in confirm_res.json()["detail"]

@pytest.mark.asyncio
async def test_unauthorized_institution_cannot_confirm_delivery(async_client: AsyncClient, donor_token: str):
    wish_id, claim_id = await setup_delivery_context()

    del_res = await async_client.post(
        f"/api/claims/{claim_id}/deliver",
        json={"tracking_number": "EXP-123"},
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    delivery_id = del_res.json()["id"]

    # Create a second institution (Institution #2, user_id=98)
    async with TestAsyncSessionLocal() as session:
        inst_user2 = User(
            email="inst2@example.com",
            password_hash=hash_password("Pass123!"),
            full_name="Sister Claire",
            role="institution"
        )
        session.add(inst_user2)
        await session.commit()
        await session.refresh(inst_user2)

        inst2 = Institution(
            user_id=inst_user2.id,
            name="Hope Orphanage",
            registration_number="REG-HOPE-999",
            address="456 Secondary Rd",
            city="Pune",
            state="Maharashtra",
            postal_code="411001",
            phone="+91 20 9876 5432",
            status="verified"
        )
        session.add(inst2)
        await session.commit()
        inst2_token = create_access_token({"sub": str(inst_user2.id), "email": "inst2@example.com", "role": "institution", "name": "Sister Claire"})

    sample_jpeg = create_sample_jpeg_with_exif()
    files = {"file": ("items.jpg", sample_jpeg, "image/jpeg")}

    # Institution #2 attempts to confirm a delivery intended for Institution #1
    resp = await async_client.post(
        f"/api/deliveries/{delivery_id}/confirm",
        files=files,
        headers={"Authorization": f"Bearer {inst2_token}"}
    )
    assert resp.status_code == 403
    assert "Only the institution that posted the wish can confirm" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_upload_rejects_corrupted_or_non_image_file(async_client: AsyncClient, donor_token: str, institution_token: str):
    wish_id, claim_id = await setup_delivery_context()

    del_res = await async_client.post(f"/api/claims/{claim_id}/deliver", headers={"Authorization": f"Bearer {donor_token}"})
    delivery_id = del_res.json()["id"]

    # Spoofed non-image text file
    fake_image_bytes = b"This is plain text with no image headers."
    files = {"file": ("fake.jpg", fake_image_bytes, "image/jpeg")}

    resp = await async_client.post(
        f"/api/deliveries/{delivery_id}/confirm",
        files=files,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert resp.status_code == 400
    assert "Invalid image content" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_institution_posts_thank_you_note_success(async_client: AsyncClient, donor_token: str, institution_token: str):
    wish_id, claim_id = await setup_delivery_context()

    # 1. Deliver and confirm
    del_res = await async_client.post(f"/api/claims/{claim_id}/deliver", headers={"Authorization": f"Bearer {donor_token}"})
    delivery_id = del_res.json()["id"]

    sample_jpeg = create_sample_jpeg_with_exif()
    files = {"file": ("items.jpg", sample_jpeg, "image/jpeg")}
    await async_client.post(f"/api/deliveries/{delivery_id}/confirm", files=files, headers={"Authorization": f"Bearer {institution_token}"})

    # 2. Post thank-you note
    ty_payload = {
        "message": "Thank you so much! The children were thrilled to receive the drawing books.",
        "impact_summary": "10 aspiring young artists now have their own sketchbooks for weekend workshops."
    }
    ty_res = await async_client.post(
        f"/api/deliveries/{delivery_id}/thank-you",
        json=ty_payload,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert ty_res.status_code == 201
    ty_data = ty_res.json()
    assert ty_data["delivery_id"] == delivery_id
    assert ty_data["message"] == ty_payload["message"]
    assert ty_data["impact_summary"] == ty_payload["impact_summary"]
    assert "sig=" in ty_data["photo_sas_url"]

    # 3. INVARIANT CHECK: Only ONE thank-you note per delivery
    second_ty = await async_client.post(
        f"/api/deliveries/{delivery_id}/thank-you",
        json={"message": "Second note attempt"},
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert second_ty.status_code == 400
    assert "already been posted" in second_ty.json()["detail"]

@pytest.mark.asyncio
async def test_donor_notifications_and_mark_as_read(async_client: AsyncClient, donor_token: str):
    # Seed 2 notifications for donor (user_id=4)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    async with TestAsyncSessionLocal() as session:
        n1 = Notification(user_id=4, title="Test Notification 1", message="Message 1", type="delivery_update", is_read=False, created_at=now)
        n2 = Notification(user_id=4, title="Test Notification 2", message="Message 2", type="thank_you", is_read=False, created_at=now + timedelta(seconds=1))
        session.add_all([n1, n2])
        await session.commit()
        await session.refresh(n1)
        notif_id = n1.id

    # List notifications
    r_list = await async_client.get("/api/notifications", headers={"Authorization": f"Bearer {donor_token}"})
    assert r_list.status_code == 200
    list_data = r_list.json()
    assert list_data["total"] >= 2
    assert list_data["unread_count"] >= 2

    # Mark notification as read
    r_read = await async_client.patch(f"/api/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {donor_token}"})
    assert r_read.status_code == 200
    assert r_read.json()["is_read"] is True

    # Mark all as read
    r_all = await async_client.post("/api/notifications/mark-all-read", headers={"Authorization": f"Bearer {donor_token}"})
    assert r_all.status_code == 200
    assert r_all.json()["unread_count"] == 0

@pytest.mark.asyncio
async def test_donor_impact_endpoint_metrics_and_timeline(async_client: AsyncClient, donor_token: str, institution_token: str):
    wish_id, claim_id = await setup_delivery_context()

    # Deliver, confirm, and add thank-you note
    del_res = await async_client.post(f"/api/claims/{claim_id}/deliver", headers={"Authorization": f"Bearer {donor_token}"})
    delivery_id = del_res.json()["id"]

    sample_jpeg = create_sample_jpeg_with_exif()
    files = {"file": ("proof.jpg", sample_jpeg, "image/jpeg")}
    await async_client.post(f"/api/deliveries/{delivery_id}/confirm", files=files, headers={"Authorization": f"Bearer {institution_token}"})

    await async_client.post(
        f"/api/deliveries/{delivery_id}/thank-you",
        json={"message": "You made a huge difference!"},
        headers={"Authorization": f"Bearer {institution_token}"}
    )

    # Fetch donor impact
    impact_res = await async_client.get("/api/donors/impact", headers={"Authorization": f"Bearer {donor_token}"})
    assert impact_res.status_code == 200
    impact = impact_res.json()

    assert impact["total_wishes_fulfilled"] >= 1
    assert impact["total_items_delivered"] >= 10
    assert impact["institutions_helped"] >= 1
    assert len(impact["items_delivered_by_category"]) >= 1
    assert impact["items_delivered_by_category"][0]["category_name"] == "Educational Supplies"

    # Verify timeline contains both delivery confirmed and thank-you received events
    timeline = impact["timeline"]
    assert len(timeline) >= 2
    event_types = [t["event_type"] for t in timeline]
    assert "delivery_confirmed" in event_types
    assert "thank_you_received" in event_types

    # Each timeline item has SAS URL for photo
    confirmed_event = next(t for t in timeline if t["event_type"] == "delivery_confirmed")
    assert "sig=" in confirmed_event["photo_sas_url"]
