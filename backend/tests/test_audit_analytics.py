"""
Test Suite for Append-Only Audit Hash Chain & Power BI Analytics (Task 7)

Covers:
1. Append-only enforcement: Database triggers block UPDATE and DELETE on dbo.audit_log.
2. Hash chain creation: Each row links to previous row's SHA-256 hash (Genesis -> 64 zeros).
3. Cryptographic integrity verification endpoint (GET /api/admin/audit/verify).
4. Tamper detection: Mathematical proof that content mutation or broken links invalidate the chain.
5. Role restriction: Non-admin users cannot verify audit logs or access analytics (HTTP 403).
6. Power BI Analytics endpoints:
   - Monthly wishes posted vs fulfilled trends.
   - Average fulfillment lead time (hours and days).
   - Stale-claim expiration rate percentage.
   - Institutions verification distribution.
   - Top category demand and fulfillment rankings.
   - Unified overview dashboard feed.
"""

from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update, delete, text
from sqlalchemy.exc import DBAPIError

from app.core.audit import (
    record_audit_event,
    verify_audit_chain_integrity,
    GENESIS_HASH,
    canonical_audit_string,
    compute_audit_hash,
)
from app.models.entities import AuditLog, User, Institution, Wish, WishClaim, Delivery, Category
from tests.conftest import TestAsyncSessionLocal, test_async_engine

# ==============================================================================
# 1. APPEND-ONLY & HASH CHAIN TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_audit_log_append_only_triggers_prevent_update_and_delete():
    """
    PROVES: Database trigger strictly blocks UPDATE and DELETE on audit_log.
    """
    async with TestAsyncSessionLocal() as session:
        # 1. Insert an audit record
        entry = await record_audit_event(
            db=session,
            entity_type="wishes",
            entity_id=1,
            action="CREATE",
            details="Initial wish creation test"
        )
        await session.commit()
        await session.refresh(entry)
        entry_id = entry.id

        # 2. Attempt UPDATE -> Must fail with database trigger error
        with pytest.raises(DBAPIError) as update_exc:
            await session.execute(
                update(AuditLog).where(AuditLog.id == entry_id).values(details="Tampered details")
            )
            await session.commit()
        assert "append-only ledger" in str(update_exc.value).lower()
        await session.rollback()

        # 3. Attempt DELETE -> Must fail with database trigger error
        with pytest.raises(DBAPIError) as delete_exc:
            await session.execute(
                delete(AuditLog).where(AuditLog.id == entry_id)
            )
            await session.commit()
        assert "append-only ledger" in str(delete_exc.value).lower()
        await session.rollback()

@pytest.mark.asyncio
async def test_audit_hash_chain_linkage_and_genesis():
    """
    PROVES: Each audit row stores the SHA-256 hash of the preceding row and its own content.
    """
    async with TestAsyncSessionLocal() as session:
        # Create 3 sequential audit events
        e1 = await record_audit_event(
            db=session, entity_type="institutions", entity_id=10, action="STATUS_CHANGE",
            old_status="pending", new_status="recommended", details="Verifier Marcus recommended profile"
        )
        await session.commit()
        await session.refresh(e1)

        e2 = await record_audit_event(
            db=session, entity_type="institutions", entity_id=10, action="STATUS_CHANGE",
            old_status="recommended", new_status="verified", details="Admin Elena approved profile"
        )
        await session.commit()
        await session.refresh(e2)

        e3 = await record_audit_event(
            db=session, entity_type="wishes", entity_id=25, action="CREATE",
            details="New wish created for geometry sets"
        )
        await session.commit()
        await session.refresh(e3)

        # 1. Entry 1 must link to GENESIS_HASH
        assert e1.prev_hash == GENESIS_HASH
        assert e1.record_hash is not None and len(e1.record_hash) == 64

        # 2. Entry 2 must link to Entry 1's hash
        assert e2.prev_hash == e1.record_hash
        assert e2.record_hash is not None and len(e2.record_hash) == 64

        # 3. Entry 3 must link to Entry 2's hash
        assert e3.prev_hash == e2.record_hash
        assert e3.record_hash is not None and len(e3.record_hash) == 64

@pytest.mark.asyncio
async def test_admin_audit_verification_endpoint_valid_chain(async_client: AsyncClient, admin_token: str):
    """
    Verifies that intact hash chain returns is_valid=True via GET /api/admin/audit/verify.
    """
    async with TestAsyncSessionLocal() as session:
        for i in range(1, 4):
            await record_audit_event(
                db=session, entity_type="deliveries", entity_id=i, action="CONFIRMED",
                details=f"Delivery confirmation #{i}"
            )
        await session.commit()

    resp = await async_client.get(
        "/api/admin/audit/verify",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_valid"] is True
    assert data["total_records_verified"] >= 3
    assert data["genesis_hash"] == GENESIS_HASH
    assert data["latest_hash"] is not None
    assert data["broken_at_id"] is None

@pytest.mark.asyncio
async def test_audit_verification_detects_content_tampering(async_client: AsyncClient, admin_token: str):
    """
    TAMPER DETECTION PROOF:
    Simulates a rogue database intruder who modifies audit row contents directly.
    Proves that the cryptographic verification catches the tampering.
    """
    async with TestAsyncSessionLocal() as session:
        entry = await record_audit_event(
            db=session, entity_type="wishes", entity_id=5, action="STATUS_CHANGE",
            old_status="open", new_status="claimed", details="Authentic audit details"
        )
        await session.commit()
        await session.refresh(entry)
        tampered_id = entry.id

    # Simulate raw intruder bypassing trigger to tamper with content
    async with test_async_engine.begin() as conn:
        await conn.execute(text("DROP TRIGGER IF EXISTS trg_audit_log_prevent_update"))
        await conn.execute(
            text(f"UPDATE audit_log SET details = 'HACKED DETAILS' WHERE id = {tampered_id}")
        )
        # Restore trigger
        await conn.execute(text("""
            CREATE TRIGGER trg_audit_log_prevent_update
            BEFORE UPDATE ON audit_log
            BEGIN
                SELECT RAISE(FAIL, 'Security Violation: audit_log is an append-only ledger.');
            END;
        """))

    # Admin runs verification
    resp = await async_client.get(
        "/api/admin/audit/verify",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_valid"] is False
    assert data["broken_at_id"] == tampered_id
    assert "Content tampering detected" in data["error_detail"]

@pytest.mark.asyncio
async def test_non_admin_cannot_access_audit_verification(async_client: AsyncClient, donor_token: str):
    resp = await async_client.get(
        "/api/admin/audit/verify",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert resp.status_code == 403

# ==============================================================================
# 2. POWER BI ANALYTICS TESTS
# ==============================================================================

async def seed_analytics_data():
    """Seeds relational domain data to validate Power BI analytics endpoints."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    month_ago = now - timedelta(days=32)

    async with TestAsyncSessionLocal() as session:
        # Update default institution to verified
        await session.execute(update(Institution).where(Institution.id == 1).values(status="verified"))

        # Add second category
        cat2 = Category(name="Bedding & Linens", description="Blankets and sheets")
        session.add(cat2)
        await session.commit()
        await session.refresh(cat2)

        # 1. Wish in Category 1 (fulfilled)
        w1 = Wish(
            institution_id=1, category_id=1, title="Art Supplies", description="Drawing pads",
            item_name="Drawing Pads", qty_requested=10, needed_by=now + timedelta(days=10),
            status="delivered", created_at=month_ago, updated_at=now
        )
        # 2. Wish in Category 2 (open)
        w2 = Wish(
            institution_id=1, category_id=cat2.id, title="Winter Blankets", description="Thermal blankets",
            item_name="Warm Blankets", qty_requested=20, needed_by=now + timedelta(days=15),
            status="open", created_at=now, updated_at=now
        )
        session.add_all([w1, w2])
        await session.commit()
        await session.refresh(w1)

        # 3. Claims: 1 delivered, 1 active, 1 expired
        claim_delivered = WishClaim(
            wish_id=w1.id, donor_id=4, qty=10, deadline=now + timedelta(days=5),
            status="delivered", created_at=now - timedelta(days=3), updated_at=now
        )
        claim_active = WishClaim(
            wish_id=w2.id, donor_id=4, qty=5, deadline=now + timedelta(days=10),
            status="active", created_at=now, updated_at=now
        )
        claim_expired = WishClaim(
            wish_id=w2.id, donor_id=4, qty=5, deadline=now - timedelta(days=1),
            status="expired", created_at=now - timedelta(days=15), updated_at=now
        )
        session.add_all([claim_delivered, claim_active, claim_expired])
        await session.commit()
        await session.refresh(claim_delivered)

        # 4. Confirmed Delivery for claim_delivered
        deliv = Delivery(
            wish_claim_id=claim_delivered.id,
            tracking_number="ANALYTICS-TRACK-01",
            status="confirmed",
            delivered_at=now - timedelta(days=1),
            confirmed_by=3,
            confirmed_at=now,
            confirmation_notes="Delivered in great shape",
            created_at=now - timedelta(days=2),
            updated_at=now
        )
        session.add(deliv)
        await session.commit()

@pytest.mark.asyncio
async def test_admin_analytics_overview_endpoint(async_client: AsyncClient, admin_token: str):
    await seed_analytics_data()

    resp = await async_client.get(
        "/api/admin/analytics/overview",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()

    # 1. Monthly wishes trend
    assert "monthly_wishes" in data
    assert len(data["monthly_wishes"]) >= 1

    # 2. Delivery lead time
    assert "delivery_time" in data
    assert data["delivery_time"]["total_completed_deliveries"] >= 1
    assert data["delivery_time"]["average_hours"] > 0
    assert data["delivery_time"]["average_days"] > 0

    # 3. Stale claims metric
    assert "stale_claims" in data
    assert data["stale_claims"]["total_claims"] >= 3
    assert data["stale_claims"]["expired_claims"] >= 1
    assert data["stale_claims"]["stale_claim_rate_percentage"] > 0

    # 4. Institutions by status
    assert "institutions_by_status" in data
    statuses = [s["status"] for s in data["institutions_by_status"]]
    assert "verified" in statuses

    # 5. Top categories
    assert "top_categories" in data
    cat_names = [c["category_name"] for c in data["top_categories"]]
    assert "Educational Supplies" in cat_names

@pytest.mark.asyncio
async def test_individual_analytics_endpoints_for_power_bi(async_client: AsyncClient, admin_token: str):
    await seed_analytics_data()

    # 1. Wishes monthly
    r_monthly = await async_client.get("/api/admin/analytics/wishes-monthly", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_monthly.status_code == 200
    assert isinstance(r_monthly.json(), list)

    # 2. Delivery lead times
    r_del = await async_client.get("/api/admin/analytics/delivery-times", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_del.status_code == 200
    assert "average_hours" in r_del.json()

    # 3. Stale rates
    r_stale = await async_client.get("/api/admin/analytics/stale-rates", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_stale.status_code == 200
    assert "stale_claim_rate_percentage" in r_stale.json()

    # 4. Institutions status
    r_inst = await async_client.get("/api/admin/analytics/institutions-status", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_inst.status_code == 200
    assert isinstance(r_inst.json(), list)

    # 5. Top categories
    r_cats = await async_client.get("/api/admin/analytics/top-categories", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_cats.status_code == 200
    assert isinstance(r_cats.json(), list)

@pytest.mark.asyncio
async def test_non_admin_cannot_access_analytics(async_client: AsyncClient, donor_token: str):
    resp = await async_client.get(
        "/api/admin/analytics/overview",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert resp.status_code == 403

