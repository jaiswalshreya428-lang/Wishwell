"""
Test Suite for Wish Claims, Deadlines, Expiry, and Concurrency (Task 5)

Covers:
1. One-transaction atomic pledging with row-locking logic.
2. Partial claim (wish status -> partially_claimed) and full claim (wish status -> claimed).
3. Availability protection (HTTP 409 Conflict on over-claiming or zero availability).
4. Deadline bounding: min(now + 14 days, wish.needed_by).
5. Donor voluntary release of claim (restoring parent wish status to 'open' and logging audit entry).
6. Unauthorized release protection (donor cannot release another donor's claim).
7. Administrative manual trigger for sp_release_stale_claims.
8. Stale claim automatic expiration, wish restoration, and donor notification creation.
9. 20-client high-concurrency race condition test proving total claimed NEVER exceeds qty_requested.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, update, func

from app.main import app
from app.core.database import get_db
from app.core.security import hash_password, create_access_token
from app.models.entities import User, Institution, Wish, WishClaim, Notification, AuditLog
from app.core.scheduler import release_stale_claims
from tests.conftest import TestAsyncSessionLocal

future_needed_by = (datetime.now(timezone.utc) + timedelta(days=20)).replace(tzinfo=None)
short_needed_by = (datetime.now(timezone.utc) + timedelta(days=4)).replace(tzinfo=None)

async def setup_verified_wish(qty_requested: int = 10, needed_by: datetime = future_needed_by) -> int:
    """Helper to create a verified institution and an open wish."""
    async with TestAsyncSessionLocal() as session:
        # Verify default institution
        await session.execute(update(Institution).where(Institution.id == 1).values(status="verified"))
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        wish = Wish(
            institution_id=1,
            category_id=1,
            title="School Science Notebooks",
            description="Spiral physics notebooks for lab work",
            item_name="Lab Experiment Notebooks A4",
            qty_requested=qty_requested,
            needed_by=needed_by,
            status="open",
            created_at=now,
            updated_at=now
        )
        session.add(wish)
        await session.commit()
        await session.refresh(wish)
        return wish.id

@pytest.mark.asyncio
async def test_donor_can_claim_partial_quantity(async_client: AsyncClient, donor_token: str):
    wish_id = await setup_verified_wish(qty_requested=10)

    # Donor claims 4 items
    resp = await async_client.post(
        f"/api/wishes/{wish_id}/claim",
        json={"qty": 4},
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert resp.status_code == 201
    claim_data = resp.json()
    assert claim_data["id"] is not None
    assert claim_data["qty"] == 4
    assert claim_data["status"] == "active"
    assert claim_data["wish_id"] == wish_id

    # Check wish status updated to 'partially_claimed'
    async with TestAsyncSessionLocal() as session:
        wish = await session.get(Wish, wish_id)
        assert wish.status == "partially_claimed"

@pytest.mark.asyncio
async def test_donor_can_claim_remaining_quantity(async_client: AsyncClient, donor_token: str):
    wish_id = await setup_verified_wish(qty_requested=10)

    # First claim: 4 items
    await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 4}, headers={"Authorization": f"Bearer {donor_token}"})

    # Second claim: remaining 6 items
    resp2 = await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 6}, headers={"Authorization": f"Bearer {donor_token}"})
    assert resp2.status_code == 201
    assert resp2.json()["qty"] == 6

    # Check wish status updated to 'claimed'
    async with TestAsyncSessionLocal() as session:
        wish = await session.get(Wish, wish_id)
        assert wish.status == "claimed"

@pytest.mark.asyncio
async def test_claim_quantity_exceeding_available_returns_409(async_client: AsyncClient, donor_token: str):
    wish_id = await setup_verified_wish(qty_requested=10)

    # Initial claim: 7 items (3 remaining)
    await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 7}, headers={"Authorization": f"Bearer {donor_token}"})

    # Attempt to claim 4 items (exceeds 3 remaining)
    resp = await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 4}, headers={"Authorization": f"Bearer {donor_token}"})
    assert resp.status_code == 409
    assert "Requested quantity (4) is not available. Only 3 item(s) remain open" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_claim_when_zero_remaining_returns_409(async_client: AsyncClient, donor_token: str):
    wish_id = await setup_verified_wish(qty_requested=5)

    # Claim all 5
    await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 5}, headers={"Authorization": f"Bearer {donor_token}"})

    # Attempt to claim 1 more
    resp = await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 1}, headers={"Authorization": f"Bearer {donor_token}"})
    assert resp.status_code == 409
    assert "is not open for claims" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_claim_deadline_never_later_than_needed_by(async_client: AsyncClient, donor_token: str):
    # Wish needed in 4 days (less than default 14 days)
    wish_id = await setup_verified_wish(qty_requested=10, needed_by=short_needed_by)

    resp = await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 2}, headers={"Authorization": f"Bearer {donor_token}"})
    assert resp.status_code == 201
    raw_deadline = resp.json()["deadline"].replace("Z", "+00:00")
    claim_deadline = datetime.fromisoformat(raw_deadline).replace(tzinfo=None)
    expected_limit = short_needed_by.replace(tzinfo=None)

    # Deadline must be bounded by needed_by
    assert claim_deadline <= expected_limit + timedelta(seconds=2)

@pytest.mark.asyncio
async def test_donor_can_release_own_claim(async_client: AsyncClient, donor_token: str):
    wish_id = await setup_verified_wish(qty_requested=10)

    # Donor claims 5 items
    claim_res = await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 5}, headers={"Authorization": f"Bearer {donor_token}"})
    claim_id = claim_res.json()["id"]

    # Release the claim
    release_res = await async_client.post(
        f"/api/claims/{claim_id}/release",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert release_res.status_code == 200
    assert release_res.json()["status"] == "released"

    # Verify parent wish status is restored to 'open'
    async with TestAsyncSessionLocal() as session:
        wish = await session.get(Wish, wish_id)
        assert wish.status == "open"

        # Verify audit log entry
        audit = await session.scalar(
            select(AuditLog).where(
                AuditLog.entity_type == "wish_claims",
                AuditLog.entity_id == claim_id,
                AuditLog.new_status == "released"
            )
        )
        assert audit is not None
        assert audit.action == "STATUS_CHANGE"

@pytest.mark.asyncio
async def test_donor_cannot_release_other_donor_claim(async_client: AsyncClient, donor_token: str):
    wish_id = await setup_verified_wish(qty_requested=10)

    # Create claim by donor_id=4
    claim_res = await async_client.post(f"/api/wishes/{wish_id}/claim", json={"qty": 3}, headers={"Authorization": f"Bearer {donor_token}"})
    claim_id = claim_res.json()["id"]

    # Seed a distinct second donor in the database
    async with TestAsyncSessionLocal() as session:
        donor2 = User(
            email="other.donor@wishwell.org",
            password_hash=hash_password("Password123!"),
            full_name="Second Donor",
            role="donor"
        )
        session.add(donor2)
        await session.commit()
        await session.refresh(donor2)
        donor2_id = donor2.id

    # Token for the second donor
    other_donor_token = create_access_token({
        "sub": str(donor2_id),
        "email": "other.donor@wishwell.org",
        "role": "donor",
        "name": "Second Donor"
    })

    release_res = await async_client.post(
        f"/api/claims/{claim_id}/release",
        headers={"Authorization": f"Bearer {other_donor_token}"}
    )
    assert release_res.status_code == 403
    assert "You can only release your own claims" in release_res.json()["detail"]

@pytest.mark.asyncio
async def test_admin_can_trigger_stale_claim_release_manually(async_client: AsyncClient, admin_token: str):
    resp = await async_client.post(
        "/api/admin/claims/release-stale",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "expired_claims_count" in data
    assert "Successfully executed" in data["message"]

@pytest.mark.asyncio
async def test_non_admin_cannot_trigger_stale_claim_release(async_client: AsyncClient, donor_token: str):
    resp = await async_client.post(
        "/api/admin/claims/release-stale",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_stale_claim_job_expires_overdue_claims_and_notifies_donor(async_client: AsyncClient):
    wish_id = await setup_verified_wish(qty_requested=10)

    # Seed an overdue active claim in the past
    past_deadline = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    async with TestAsyncSessionLocal() as session:
        overdue_claim = WishClaim(
            wish_id=wish_id,
            donor_id=4,
            qty=6,
            deadline=past_deadline,
            status="active",
            created_at=now_utc - timedelta(days=16),
            updated_at=now_utc - timedelta(days=16)
        )
        session.add(overdue_claim)
        # Update wish status to partially_claimed
        wish = await session.get(Wish, wish_id)
        wish.status = "partially_claimed"
        await session.commit()
        claim_id = overdue_claim.id

    # Run stale claim maintenance
    async with TestAsyncSessionLocal() as session:
        expired_count = await release_stale_claims(session)
        assert expired_count >= 1

    # Verify claim status is 'expired' and parent wish status is restored to 'open'
    async with TestAsyncSessionLocal() as session:
        claim = await session.get(WishClaim, claim_id)
        assert claim.status == "expired"

        wish = await session.get(Wish, wish_id)
        assert wish.status == "open"

        # Verify notification created for donor
        notif = await session.scalar(
            select(Notification).where(
                Notification.user_id == 4,
                Notification.type == "claim_expired"
            )
        )
        assert notif is not None
        assert "expired" in notif.title.lower()

# ==============================================================================
# CONCURRENCY TEST: 20 Simultaneous Claims at a Wish with Quantity 10
# ==============================================================================
@pytest.mark.asyncio
async def test_concurrency_20_simultaneous_claims_never_exceeds_quantity():
    """
    CONCURRENCY PROOF:
    Fires 20 simultaneous asynchronous claim requests (quantity 1 each) at a wish with
    qty_requested = 10.
    PROVES:
    1. Exactly 10 requests succeed (HTTP 201 Created).
    2. Exactly 10 requests are rejected (HTTP 409 Conflict: Quantity not available).
    3. The cumulative sum of active claims in the database is EXACTLY 10 (never exceeds 10).
    4. The wish status safely transitions to 'claimed'.
    """
    wish_id = await setup_verified_wish(qty_requested=10)

    # Seed 20 distinct donor accounts in the database
    donor_tokens = []
    async with TestAsyncSessionLocal() as session:
        pwd_hash = hash_password("ConcurrentPass123!")
        donors = [
            User(
                email=f"concurrent.donor.{i}@wishwell.org",
                password_hash=pwd_hash,
                full_name=f"Concurrent Donor #{i}",
                role="donor"
            )
            for i in range(1, 21)
        ]
        session.add_all(donors)
        await session.commit()
        for d in donors:
            await session.refresh(d)
            token = create_access_token({
                "sub": str(d.id),
                "email": d.email,
                "role": "donor",
                "name": d.full_name
            })
            donor_tokens.append(token)

    transport = ASGITransport(app=app)

    async def fire_claim(token: str, index: int):
        # Dedicated client per concurrent task
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(
                f"/api/wishes/{wish_id}/claim",
                json={"qty": 1},
                headers={"Authorization": f"Bearer {token}"}
            )

    # Launch 20 concurrent coroutines simultaneously
    print("\n--- LAUNCHING 20 SIMULTANEOUS ASYNC CLAIMS ON WISH (QTY=10) ---")
    tasks = [fire_claim(donor_tokens[i], i + 1) for i in range(20)]
    responses = await asyncio.gather(*tasks)

    status_codes = [r.status_code for r in responses]
    created_count = status_codes.count(201)
    conflict_count = status_codes.count(409)

    print(f"Results: {created_count} ACCEPTED (HTTP 201), {conflict_count} REJECTED (HTTP 409 Conflict)")
    for idx, r in enumerate(responses, start=1):
        if r.status_code == 201:
            print(f"  [REQ {idx:02d}] HTTP 201 CREATED  -> Claim ID #{r.json()['id']}")
        else:
            print(f"  [REQ {idx:02d}] HTTP 409 CONFLICT -> {r.json()['detail']}")

    # Assertions
    assert created_count == 10, f"Expected exactly 10 successful claims, got {created_count}"
    assert conflict_count == 10, f"Expected exactly 10 conflict responses, got {conflict_count}"

    # Verify database state directly
    async with TestAsyncSessionLocal() as session:
        active_sum = await session.scalar(
            select(func.coalesce(func.sum(WishClaim.qty), 0))
            .where(WishClaim.wish_id == wish_id, WishClaim.status == "active")
        )
        wish = await session.get(Wish, wish_id)

        print(f"Final Database State: Active Claim Sum = {active_sum} / {wish.qty_requested}, Status = '{wish.status}'")
        assert active_sum == 10, f"Total claimed quantity ({active_sum}) exceeded or failed to meet capacity!"
        assert wish.status == "claimed", f"Wish status should be 'claimed', but is '{wish.status}'"
