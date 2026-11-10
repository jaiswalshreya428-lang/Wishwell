"""
Pydantic Schemas for Wish Management
Defines request and response schemas for creating, editing, listing, and detailing wishes.

ARCHITECTURE NOTES:
- Implements strict input validation (qty_requested > 0, needed_by datetime, category_id > 0).
- Supports confirm_duplicate flag to bypass explainable duplicate detection warnings.
- OpenWishViewResponse matches dbo.v_open_wishes SQL View schema.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from app.core.sanitizer import escape_html

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None

    @field_validator("name", "description", mode="after")
    @classmethod
    def escape_category_text(cls, v: Optional[str]) -> Optional[str]:
        return escape_html(v) if v is not None else None

class WishBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Short title describing the need")
    description: str = Field(..., min_length=5, max_length=2000, description="Detailed context or explanation of the need")
    item_name: str = Field(..., min_length=2, max_length=150, description="Name of the physical item requested")
    qty_requested: int = Field(..., gt=0, le=50000, description="Total quantity of items requested (must be > 0)")
    needed_by: datetime = Field(..., description="Target fulfillment date in UTC (must be in the future)")
    category_id: int = Field(..., gt=0, description="Foreign key of the category")

class WishCreate(WishBase):
    confirm_duplicate: bool = Field(
        False,
        description="Set to true to bypass duplicate-need warning and force wish creation"
    )

class WishUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=5, max_length=2000)
    item_name: Optional[str] = Field(None, min_length=2, max_length=150)
    qty_requested: Optional[int] = Field(None, gt=0, le=50000)
    needed_by: Optional[datetime] = None
    category_id: Optional[int] = Field(None, gt=0)

class WishResponse(WishBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    @field_validator("title", "description", "item_name", mode="after")
    @classmethod
    def escape_text_outputs(cls, v: str) -> str:
        return escape_html(v) or v

class SimilarWishSummary(BaseModel):
    id: int
    title: str
    item_name: str
    qty_requested: int
    status: str
    similarity_score: float
    match_reason: str

    @field_validator("title", "item_name", mode="after")
    @classmethod
    def escape_similar_text(cls, v: str) -> str:
        return escape_html(v) or v

class DuplicateWarningDetail(BaseModel):
    message: str
    duplicate_detected: bool = True
    similar_wishes: List[SimilarWishSummary]
    action_required: str

class OpenWishViewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    wish_id: int
    wish_title: str
    item_name: str
    wish_description: str
    qty_requested: int
    qty_claimed: int
    qty_remaining: int
    needed_by: datetime
    wish_status: str
    wish_created_at: datetime
    category_id: int
    category_name: str
    institution_id: int
    institution_name: str
    institution_city: str
    institution_state: str
    institution_status: str

    @field_validator("wish_title", "item_name", "wish_description", mode="after")
    @classmethod
    def escape_view_text(cls, v: str) -> str:
        return escape_html(v) or v

class WishListResponse(BaseModel):
    items: List[OpenWishViewResponse]
    total: int
    page: int
    page_size: int
    limit: Optional[int] = None
    total_pages: int

    @model_validator(mode="after")
    def populate_limit(self):
        if self.limit is None:
            self.limit = self.page_size
        return self

class WishDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: int
    category_id: int
    title: str
    description: str
    item_name: str
    qty_requested: int
    qty_claimed: int
    qty_remaining: int
    needed_by: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    # Related institution & category metadata
    institution_name: str
    institution_city: str
    institution_state: str
    institution_status: str
    category_name: str

    @field_validator("title", "description", "item_name", mode="after")
    @classmethod
    def escape_detail_text(cls, v: str) -> str:
        return escape_html(v) or v
