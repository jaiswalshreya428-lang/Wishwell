"""
Admin Analytics & Cryptographic Audit Verification API Router
Exposes append-only hash chain verification and clean JSON data feeds for Power BI.

VIVA DEFENSE NOTES:
1. Cryptographic Audit Chain Verification:
   - Proves mathematically that the append-only ledger has not been tampered with.
   - Evaluates SHA-256 hash linkages from genesis to the most recent transaction block.
2. Enterprise Power BI JSON Feeds:
   - Formatted in clean tabular and relational JSON arrays.
   - Computes:
     * Monthly Wish Demand vs Fulfillment trends.
     * Lead Time: Mean time from donor pledge to confirmed delivery.
     * Stale Claim Expiry Rate (platform velocity metric).
     * Verification Funnel (institutions by status).
     * Category Distribution & fulfillment rates.
"""

from datetime import datetime, timezone
from typing import List, Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.audit import verify_audit_chain_integrity, GENESIS_HASH
from app.core.cosmos import cosmos_service
from app.models.entities import User, Institution, Wish, WishClaim, Delivery, Category, AuditLog
from app.schemas.analytics import (
    AuditVerificationResponse,
    AuditLogRowResponse,
    AdminAnalyticsOverview,
    MonthlyWishTrend,
    DeliveryTimeMetric,
    StaleClaimMetric,
    InstitutionStatusCount,
    CategoryPerformance,
)

router = APIRouter(prefix="/admin", tags=["Admin & Analytics"])

# ==============================================================================
# 1. AUDIT HASH CHAIN VERIFICATION
# ==============================================================================
@router.get("/audit/verify", response_model=AuditVerificationResponse)
@router.post("/audit/verify", response_model=AuditVerificationResponse)
async def verify_audit_log_chain(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies the cryptographic integrity of the append-only audit_log table.
    Iterates through each block, recomputing SHA-256 hashes against previous block links.
    """
    is_valid, count, broken_id, error_detail, latest_hash = await verify_audit_chain_integrity(db)

    return AuditVerificationResponse(
        is_valid=is_valid,
        total_records_verified=count,
        genesis_hash=GENESIS_HASH,
        latest_hash=latest_hash,
        broken_at_id=broken_id,
        error_detail=error_detail,
        verified_at=datetime.now(timezone.utc)
    )

@router.get("/audit/logs", response_model=List[AuditLogRowResponse])
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists audit log records with their cryptographic hashes for administrative inspection.
    """
    stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [AuditLogRowResponse.model_validate(r) for r in records]

@router.get("/audit/events/{doc_id}", response_model=dict)
async def get_cosmos_audit_event(
    doc_id: str,
    entity: Optional[str] = Query(None, description="Cosmos DB partition key (/entity)"),
    current_user: User = Depends(require_role("admin")),
):
    """
    Fetches raw semi-structured JSON audit event from Azure Cosmos DB by document ID.
    Restricted to role 'admin'.
    """
    doc = await cosmos_service.get_audit_event(doc_id, entity=entity)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cosmos DB audit event #{doc_id} not found."
        )
    return doc

# ==============================================================================
# 2. POWER BI ANALYTICS ENDPOINTS
# ==============================================================================
@router.get("/analytics/wishes-monthly", response_model=List[MonthlyWishTrend])
async def get_monthly_wish_trends(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Returns monthly volume of wishes posted vs fulfilled."""
    stmt = select(Wish.created_at, Wish.updated_at, Wish.status)
    res = await db.execute(stmt)
    wishes = res.all()

    posted_by_month = defaultdict(int)
    fulfilled_by_month = defaultdict(int)
    all_months = set()

    for wish_created, wish_updated, wish_status in wishes:
        m_created = wish_created.strftime("%Y-%m")
        posted_by_month[m_created] += 1
        all_months.add(m_created)

        if wish_status == "delivered":
            m_fulfilled = wish_updated.strftime("%Y-%m")
            fulfilled_by_month[m_fulfilled] += 1
            all_months.add(m_fulfilled)

    trends = []
    for m in sorted(all_months):
        posted = posted_by_month[m]
        fulfilled = fulfilled_by_month[m]
        rate = round((fulfilled / posted * 100), 2) if posted > 0 else 0.0
        trends.append(
            MonthlyWishTrend(
                month=m,
                wishes_posted=posted,
                wishes_fulfilled=fulfilled,
                fulfillment_rate_percentage=rate
            )
        )
    return trends

@router.get("/analytics/delivery-times", response_model=DeliveryTimeMetric)
async def get_delivery_lead_times(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Calculates mean turnaround time from claim pledge to confirmed delivery."""
    stmt = (
        select(WishClaim.created_at, Delivery.confirmed_at, Delivery.delivered_at)
        .join(Delivery, WishClaim.id == Delivery.wish_claim_id)
        .where(Delivery.status == "confirmed")
    )
    res = await db.execute(stmt)
    rows = res.all()

    if not rows:
        return DeliveryTimeMetric(
            average_hours=0.0,
            average_days=0.0,
            total_completed_deliveries=0
        )

    total_seconds = 0.0
    valid_count = 0

    for claim_created, del_confirmed, del_delivered in rows:
        end_time = del_confirmed or del_delivered
        if end_time and end_time >= claim_created:
            total_seconds += (end_time - claim_created).total_seconds()
            valid_count += 1

    if valid_count == 0:
        return DeliveryTimeMetric(
            average_hours=0.0,
            average_days=0.0,
            total_completed_deliveries=0
        )

    avg_hours = round((total_seconds / valid_count) / 3600.0, 2)
    avg_days = round(avg_hours / 24.0, 2)

    return DeliveryTimeMetric(
        average_hours=avg_hours,
        average_days=avg_days,
        total_completed_deliveries=valid_count
    )

@router.get("/analytics/stale-rates", response_model=StaleClaimMetric)
async def get_stale_claim_rates(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Calculates claim distribution and stale/expired rate percentage."""
    stmt = select(WishClaim.status, func.count()).group_by(WishClaim.status)
    res = await db.execute(stmt)
    counts = dict(res.all())

    active = counts.get("active", 0)
    delivered = counts.get("delivered", 0)
    released = counts.get("released", 0)
    expired = counts.get("expired", 0)
    total = active + delivered + released + expired

    rate = round((expired / total * 100), 2) if total > 0 else 0.0

    return StaleClaimMetric(
        total_claims=total,
        active_claims=active,
        delivered_claims=delivered,
        released_claims=released,
        expired_claims=expired,
        stale_claim_rate_percentage=rate
    )

@router.get("/analytics/institutions-status", response_model=List[InstitutionStatusCount])
async def get_institutions_by_status(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Returns distribution of institutions across verification lifecycle stages."""
    stmt = select(Institution.status, func.count()).group_by(Institution.status)
    res = await db.execute(stmt)
    status_map = dict(res.all())

    total = sum(status_map.values())
    standard_statuses = ["pending", "recommended", "verified", "rejected"]

    results = []
    for st in standard_statuses:
        c = status_map.get(st, 0)
        pct = round((c / total * 100), 2) if total > 0 else 0.0
        results.append(InstitutionStatusCount(status=st, count=c, percentage=pct))

    return results

@router.get("/analytics/top-categories", response_model=List[CategoryPerformance])
async def get_top_categories(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Ranks categories by demand volume and fulfilled quantities."""
    cat_stmt = select(Category)
    cat_res = await db.execute(cat_stmt)
    categories = cat_res.scalars().all()

    performances = []

    for cat in categories:
        # Wishes count and total requested items
        wish_stats = await db.execute(
            select(
                func.count(Wish.id),
                func.coalesce(func.sum(Wish.qty_requested), 0)
            )
            .where(Wish.category_id == cat.id)
        )
        stat_row = wish_stats.first()
        w_count = stat_row[0] if stat_row else 0
        qty_req = stat_row[1] if stat_row else 0

        # Fulfilled items (confirmed delivery)
        delivered_items = await db.scalar(
            select(func.coalesce(func.sum(WishClaim.qty), 0))
            .join(Wish, WishClaim.wish_id == Wish.id)
            .join(Delivery, WishClaim.id == Delivery.wish_claim_id)
            .where(Wish.category_id == cat.id, Delivery.status == "confirmed")
        ) or 0

        rate = round((delivered_items / qty_req * 100), 2) if qty_req > 0 else 0.0

        performances.append(
            CategoryPerformance(
                category_id=cat.id,
                category_name=cat.name,
                wishes_count=w_count,
                total_items_requested=qty_req,
                total_items_delivered=delivered_items,
                fulfillment_rate_percentage=rate
            )
        )

    # Sort by total_items_requested descending
    performances.sort(key=lambda p: (p.total_items_requested, p.wishes_count), reverse=True)
    return performances

@router.get("/analytics/overview", response_model=AdminAnalyticsOverview)
async def get_analytics_overview(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Unified analytics dashboard payload returning all 5 dimensions in a single clean JSON response.
    Ideal for Power BI dashboard consumption.
    """
    monthly = await get_monthly_wish_trends(current_user=current_user, db=db)
    del_times = await get_delivery_lead_times(current_user=current_user, db=db)
    stale_metric = await get_stale_claim_rates(current_user=current_user, db=db)
    inst_status = await get_institutions_by_status(current_user=current_user, db=db)
    top_cats = await get_top_categories(current_user=current_user, db=db)

    return AdminAnalyticsOverview(
        generated_at=datetime.now(timezone.utc),
        monthly_wishes=monthly,
        delivery_time=del_times,
        stale_claims=stale_metric,
        institutions_by_status=inst_status,
        top_categories=top_cats
    )

