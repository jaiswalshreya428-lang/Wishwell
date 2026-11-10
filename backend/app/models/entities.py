"""
SQLAlchemy 2.0 ORM Models for WishWell
Maps directly to schema.sql (T-SQL / SQL Server 2022).

VIVA NOTES:
- Uses SQLAlchemy 2.0 typed mapped_column syntax.
- Matches table constraints, enums, relationships, and foreign keys.
- Preserves referential integrity and supports async queries.
"""

from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Text, ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint("role IN ('institution', 'donor', 'verifier', 'admin')", name="CK_users_role"),
    )

    institution: Mapped[Optional["Institution"]] = relationship("Institution", back_populates="user", uselist=False, cascade="all, delete-orphan")
    claims: Mapped[List["WishClaim"]] = relationship("WishClaim", back_populates="donor")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    website_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'recommended', 'verified', 'rejected')", name="CK_institutions_status"),
    )

    user: Mapped["User"] = relationship("User", back_populates="institution")
    wishes: Mapped[List["Wish"]] = relationship("Wish", back_populates="institution", cascade="all, delete-orphan")
    verification_records: Mapped[List["VerificationRecord"]] = relationship("VerificationRecord", back_populates="institution", cascade="all, delete-orphan")
    documents: Mapped[List["InstitutionDocument"]] = relationship("InstitutionDocument", back_populates="institution", cascade="all, delete-orphan")

class InstitutionDocument(Base):
    __tablename__ = "institution_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    blob_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    __table_args__ = (
        CheckConstraint("document_type IN ('registration_certificate', 'license', 'tax_exemption', 'premises_lease', 'audit_report', 'other')", name="CK_institution_documents_type"),
    )

    institution: Mapped["Institution"] = relationship("Institution", back_populates="documents")

class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    recommended_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    recommended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    __table_args__ = (
        CheckConstraint("decision IN ('pending', 'recommended', 'verified', 'rejected')", name="CK_verification_records_decision"),
    )

    institution: Mapped["Institution"] = relationship("Institution", back_populates="verification_records")

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    wishes: Mapped[List["Wish"]] = relationship("Wish", back_populates="category")

class Wish(Base):
    __tablename__ = "wishes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    item_name: Mapped[str] = mapped_column(String(150), nullable=False)
    qty_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    needed_by: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint("qty_requested > 0", name="CK_wishes_qty_requested"),
        CheckConstraint("status IN ('open', 'partially_claimed', 'claimed', 'delivered', 'expired', 'cancelled')", name="CK_wishes_status"),
    )

    institution: Mapped["Institution"] = relationship("Institution", back_populates="wishes")
    category: Mapped["Category"] = relationship("Category", back_populates="wishes")
    claims: Mapped[List["WishClaim"]] = relationship("WishClaim", back_populates="wish", cascade="all, delete-orphan")

class WishClaim(Base):
    __tablename__ = "wish_claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wish_id: Mapped[int] = mapped_column(Integer, ForeignKey("wishes.id", ondelete="CASCADE"), nullable=False)
    donor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint("qty > 0", name="CK_wish_claims_qty"),
        CheckConstraint("status IN ('active', 'delivered', 'released', 'expired')", name="CK_wish_claims_status"),
    )

    wish: Mapped["Wish"] = relationship("Wish", back_populates="claims")
    donor: Mapped["User"] = relationship("User", back_populates="claims")
    delivery: Mapped[Optional["Delivery"]] = relationship("Delivery", back_populates="claim", uselist=False, cascade="all, delete-orphan")

class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wish_claim_id: Mapped[int] = mapped_column(Integer, ForeignKey("wish_claims.id", ondelete="CASCADE"), unique=True, nullable=False)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    carrier: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="in_transit", nullable=False)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    confirmed_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    confirmation_notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint("status IN ('in_transit', 'delivered', 'confirmed', 'failed')", name="CK_deliveries_status"),
    )

    claim: Mapped["WishClaim"] = relationship("WishClaim", back_populates="delivery")
    thank_you_note: Mapped[Optional["ThankYouNote"]] = relationship("ThankYouNote", back_populates="delivery", uselist=False)

class ThankYouNote(Base):
    __tablename__ = "thank_you_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wish_id: Mapped[int] = mapped_column(Integer, ForeignKey("wishes.id"), nullable=False)
    institution_id: Mapped[int] = mapped_column(Integer, ForeignKey("institutions.id"), nullable=False)
    donor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    delivery_id: Mapped[int] = mapped_column(Integer, ForeignKey("deliveries.id"), unique=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    impact_summary: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    delivery: Mapped["Delivery"] = relationship("Delivery", back_populates="thank_you_note")

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    __table_args__ = (
        CheckConstraint("type IN ('claim_expired', 'wish_update', 'delivery_update', 'verification_update', 'thank_you')", name="CK_notifications_type"),
    )

    user: Mapped["User"] = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    old_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    changed_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prev_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    record_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    cosmos_doc_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

class OpenWishView(Base):
    """
    SQL View Entity: dbo.v_open_wishes
    VIVA NOTE: Encapsulates remaining quantity calculation and filters active wishes
    from verified institutions needing fulfillment in the future.
    """
    __tablename__ = "v_open_wishes"

    wish_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    wish_title: Mapped[str] = mapped_column(String(200), nullable=False)
    item_name: Mapped[str] = mapped_column(String(150), nullable=False)
    wish_description: Mapped[str] = mapped_column(String(1000), nullable=False)
    qty_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_claimed: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    needed_by: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    wish_status: Mapped[str] = mapped_column(String(20), nullable=False)
    wish_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, nullable=False)
    category_name: Mapped[str] = mapped_column(String(100), nullable=False)
    institution_id: Mapped[int] = mapped_column(Integer, nullable=False)
    institution_name: Mapped[str] = mapped_column(String(200), nullable=False)
    institution_city: Mapped[str] = mapped_column(String(100), nullable=False)
    institution_state: Mapped[str] = mapped_column(String(100), nullable=False)
    institution_status: Mapped[str] = mapped_column(String(20), nullable=False)


