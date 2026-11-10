"""
Pydantic Schemas for Wish Claims & Concurrency Management.

VIVA NOTES:
- Validates claim quantity strictly > 0.
- Models full claim response including computed deadline and claim lifecycle status.
- Standardizes administrative stale-claim release response.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class ClaimCreate(BaseModel):
    qty: int = Field(..., gt=0, le=10000, description="Quantity of physical items to pledge/claim (must be > 0 and <= 10000)")

class ClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wish_id: int
    donor_id: int
    qty: int
    deadline: datetime
    status: str
    created_at: datetime
    updated_at: datetime
    wish_title: Optional[str] = None
    item_name: Optional[str] = None
    institution_name: Optional[str] = None
    institution_city: Optional[str] = None
    needed_by: Optional[datetime] = None

class StaleClaimsReleaseResponse(BaseModel):
    message: str
    expired_claims_count: int
    executed_at: datetime

