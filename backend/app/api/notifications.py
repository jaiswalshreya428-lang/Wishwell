"""
Notifications API Router
Manages donor and institution notifications for claims, deliveries, verifications, and thank-you notes.

VIVA NOTES:
- Provides real-time user engagement loop.
- Automatically populated by stored procedures (sp_release_stale_claims), background workers, and API state transitions.
- Supports filtering by read/unread state and mark-as-read transitions.
"""

from typing import Optional, List, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, Notification
from app.schemas.delivery import NotificationResponse, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read/unread status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists notifications for the authenticated user (donor, institution, verifier, admin).
    Ordered by creation date descending.
    """
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if is_read is not None:
        stmt = stmt.where(Notification.is_read == is_read)

    stmt = stmt.order_by(Notification.created_at.desc())

    res = await db.execute(stmt)
    items = res.scalars().all()

    unread_count = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
    ) or 0

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=len(items),
        unread_count=unread_count
    )

@router.put("/{notification_id}/read", response_model=NotificationResponse)
@router.patch("/{notification_id}/read", response_model=NotificationResponse)
@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks a single notification as read.
    """
    stmt = select(Notification).where(Notification.id == notification_id)
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification #{notification_id} not found."
        )

    if notif.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only update your own notifications."
        )

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)

    return NotificationResponse.model_validate(notif)

@router.post("/mark-all-read", response_model=NotificationListResponse)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks all unread notifications for the authenticated user as read.
    """
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()

    return await list_notifications(is_read=None, current_user=current_user, db=db)

