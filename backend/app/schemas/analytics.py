"""
Pydantic Schemas for Audit Verification and Power BI Analytics.

ARCHITECTURE NOTES:
- Strongly typed, clean JSON representations designed for enterprise analytics & Power BI ingestion.
- Exposes cryptographic verification results for university examiners and audit compliance.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator, computed_field
from app.core.sanitizer import escape_html

class AuditVerificationResponse(BaseModel):
    is_valid: bool = Field(..., description="True if complete hash chain is intact and uncorrupted")
    total_records_verified: int = Field(..., description="Number of audit rows mathematically validated")
    genesis_hash: str = Field(..., description="Deterministic root genesis hash")
    latest_hash: Optional[str] = Field(None, description="SHA-256 hash of the most recent block")
    broken_at_id: Optional[int] = Field(None, description="Record ID where tampering or broken linkage was detected")
    error_detail: Optional[str] = Field(None, description="Diagnostic error explanation if invalid")
    verified_at: datetime = Field(..., description="Timestamp of verification execution")

    @computed_field
    @property
    def total_records_checked(self) -> int:
        return self.total_records_verified

    @computed_field
    @property
    def tampered_row_id(self) -> Optional[int]:
        return self.broken_at_id

    @computed_field
    @property
    def broken_link_index(self) -> Optional[int]:
        return self.broken_at_id

    @computed_field
    @property
    def message(self) -> str:
        if self.is_valid:
            return f"Hash chain integrity mathematically verified across {self.total_records_verified} blocks."
        return self.error_detail or f"Tampering detected at block #{self.broken_at_id}."

    @computed_field
    @property
    def checked_at(self) -> str:
        return self.verified_at.isoformat()

class AuditLogRowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    entity_id: int
    action: str
    old_status: Optional[str]
    new_status: Optional[str]
    changed_by: Optional[int]
    details: Optional[str]
    prev_hash: Optional[str]
    record_hash: Optional[str]
    cosmos_doc_id: Optional[str] = None
    created_at: datetime

class MonthlyWishTrend(BaseModel):
    month: str = Field(..., description="Calendar month formatted as YYYY-MM")
    wishes_posted: int = Field(..., description="Total wishes requested in this month")
    wishes_fulfilled: int = Field(..., description="Total wishes marked delivered/fulfilled in this month")
    fulfillment_rate_percentage: float = Field(..., description="Percentage of posted wishes fulfilled")

class DeliveryTimeMetric(BaseModel):
    average_hours: float = Field(..., description="Mean hours elapsed between claim pledge and receipt confirmation")
    average_days: float = Field(..., description="Mean days elapsed between claim pledge and receipt confirmation")
    total_completed_deliveries: int = Field(..., description="Count of confirmed deliveries included in calculation")

class StaleClaimMetric(BaseModel):
    total_claims: int = Field(..., description="Total claims recorded across all statuses")
    active_claims: int = Field(..., description="Currently active claims holding items")
    delivered_claims: int = Field(..., description="Successfully fulfilled claims")
    released_claims: int = Field(..., description="Claims voluntarily released by donors")
    expired_claims: int = Field(..., description="Claims expired due to elapsed deadlines")
    stale_claim_rate_percentage: float = Field(..., description="Percentage of total claims that expired")

class InstitutionStatusCount(BaseModel):
    status: str = Field(..., description="Institution verification status")
    count: int = Field(..., description="Number of institutions currently possessing this status")
    percentage: float = Field(..., description="Percentage share of total institutions")

class CategoryPerformance(BaseModel):
    category_id: int
    category_name: str
    wishes_count: int
    total_items_requested: int
    total_items_delivered: int
    fulfillment_rate_percentage: float

    @computed_field
    @property
    def total_wishes(self) -> int:
        return self.wishes_count

    @computed_field
    @property
    def fulfilled_wishes(self) -> int:
        return self.total_items_delivered

    @computed_field
    @property
    def fulfillment_rate(self) -> float:
        return self.fulfillment_rate_percentage

class AdminAnalyticsOverview(BaseModel):
    generated_at: datetime
    monthly_wishes: List[MonthlyWishTrend]
    delivery_time: DeliveryTimeMetric
    stale_claims: StaleClaimMetric
    institutions_by_status: List[InstitutionStatusCount]
    top_categories: List[CategoryPerformance]

    @computed_field
    @property
    def monthly_trends(self) -> List[MonthlyWishTrend]:
        return self.monthly_wishes

    @computed_field
    @property
    def institution_breakdown(self) -> List[InstitutionStatusCount]:
        return self.institutions_by_status

