"""
Pydantic Schemas for Deliveries, Thank-You Notes, Notifications, and Donor Impact.

VIVA NOTES:
- Strongly typed request/response schemas for deliveries and receipt confirmation.
- Includes SAS URL fields for delivery proofs stored in private blob storage.
- Comprehensive aggregations for donor impact reporting and timeline tracking.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.core.sanitizer import escape_html

class DeliveryCreate(BaseModel):
    tracking_number: Optional[str] = Field(None, min_length=2, max_length=100)
    carrier: Optional[str] = Field(None, min_length=2, max_length=100)

class DeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wish_claim_id: int
    wish_id: int
    donor_id: int
    tracking_number: Optional[str]
    carrier: Optional[str]
    photo_url: Optional[str]
    photo_sas_url: Optional[str] = None
    status: str
    delivered_at: Optional[datetime]
    confirmed_by: Optional[int]
    confirmed_at: Optional[datetime]
    confirmation_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

class ThankYouNoteCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=4000, description="Thank-you message from institution to donor")
    impact_summary: Optional[str] = Field(None, max_length=1000, description="Summary of positive impact on the children")

class ThankYouNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    delivery_id: int
    wish_id: int
    institution_id: int
    donor_id: int
    message: str
    impact_summary: Optional[str]
    photo_url: Optional[str]
    photo_sas_url: Optional[str] = None
    created_at: datetime

    @field_validator("message", "impact_summary", mode="after")
    @classmethod
    def escape_note_text(cls, v: Optional[str]) -> Optional[str]:
        return escape_html(v)

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    @field_validator("title", "message", mode="after")
    @classmethod
    def escape_notification_text(cls, v: str) -> str:
        return escape_html(v) or v

class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int

class CategoryImpact(BaseModel):
    category_id: int
    category_name: str
    items_count: int

class ImpactTimelineItem(BaseModel):
    id: int
    date: datetime
    event_type: str
    title: str
    description: str
    wish_title: str
    institution_name: str
    qty: int
    photo_sas_url: Optional[str] = None

class DonorImpactResponse(BaseModel):
    total_wishes_fulfilled: int
    total_items_delivered: int
    institutions_helped: int
    items_delivered_by_category: List[CategoryImpact]
    timeline: List[ImpactTimelineItem]

