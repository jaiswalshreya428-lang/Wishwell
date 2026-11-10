"""
Pydantic Schemas for Deliveries, Thank-You Notes, Notifications, and Donor Impact.

ARCHITECTURE NOTES:
- Strongly typed request/response schemas for deliveries and receipt confirmation.
- Includes SAS URL fields for delivery proofs stored in private blob storage.
- Comprehensive aggregations for donor impact reporting and timeline tracking.
"""

from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from app.core.sanitizer import escape_html

class DeliveryCreate(BaseModel):
    tracking_number: Optional[str] = Field(default=None, max_length=100)
    carrier: Optional[str] = Field(default=None, max_length=100)

    @field_validator("tracking_number", "carrier", mode="before")
    @classmethod
    def clean_empty_strings(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

class DeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wish_claim_id: int
    wish_id: int
    donor_id: int
    institution_id: Optional[int] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    photo_url: Optional[str] = None
    photo_sas_url: Optional[str] = None
    proof_photo_blob_name: Optional[str] = None
    proof_photo_sas_url: Optional[str] = None
    status: str
    delivered_at: Optional[datetime] = None
    confirmed_by: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    confirmation_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    item_name: Optional[str] = None
    qty: Optional[int] = None
    wish_title: Optional[str] = None

    @model_validator(mode="after")
    def populate_proof_aliases(self):
        if not self.proof_photo_blob_name and self.photo_url:
            self.proof_photo_blob_name = self.photo_url
        if not self.proof_photo_sas_url and self.photo_sas_url:
            self.proof_photo_sas_url = self.photo_sas_url
        return self

    @field_validator("tracking_number", "carrier", "confirmation_notes", mode="after")
    @classmethod
    def escape_delivery_text(cls, v: Optional[str]) -> Optional[str]:
        return escape_html(v) if v is not None else None

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
    total_quantity: int = 0

    @model_validator(mode="after")
    def populate_quantity(self):
        if not self.total_quantity:
            self.total_quantity = self.items_count
        return self

class InstitutionHelpedItem(BaseModel):
    institution_id: int
    institution_name: str
    city: str
    state: str
    items_received: int

class ImpactTimelineItem(BaseModel):
    id: int
    date: datetime
    event_type: str
    action: Optional[str] = None
    title: str
    description: str
    wish_title: str
    institution_name: str
    qty: int
    photo_sas_url: Optional[str] = None

    @model_validator(mode="after")
    def populate_action(self):
        if not self.action:
            self.action = self.event_type
        return self

    @field_validator("title", "description", "wish_title", "institution_name", mode="after")
    @classmethod
    def escape_timeline_text(cls, v: str) -> str:
        return escape_html(v) or v

class DonorImpactResponse(BaseModel):
    total_wishes_fulfilled: int
    total_items_delivered: int
    institutions_helped: int
    institutions_helped_count: int = 0
    institutions_helped_list: List[InstitutionHelpedItem] = []
    items_delivered_by_category: List[CategoryImpact] = []
    items_by_category: List[CategoryImpact] = []
    timeline: List[ImpactTimelineItem] = []

    @model_validator(mode="after")
    def populate_fields(self):
        if not self.items_by_category and self.items_delivered_by_category:
            self.items_by_category = self.items_delivered_by_category
        elif not self.items_delivered_by_category and self.items_by_category:
            self.items_delivered_by_category = self.items_by_category
        
        if self.institutions_helped_count == 0:
            self.institutions_helped_count = self.institutions_helped
        return self

