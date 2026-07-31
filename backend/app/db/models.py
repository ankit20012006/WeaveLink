from __future__ import annotations

from datetime import date, datetime

from app.db.base import Base
from sqlalchemy import JSON, BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Weaver(Base):
    __tablename__ = "weavers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    cluster: Mapped[str] = mapped_column(String(200), nullable=False)
    gi: Mapped[str | None] = mapped_column(String(200))
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    photo: Mapped[str] = mapped_column(String(500), nullable=False)
    years: Mapped[int] = mapped_column(Integer, nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    products = relationship("Product", back_populates="weaver", passive_deletes=True)
    user_profile = relationship(
        "UserProfile",
        back_populates="weaver",
        uselist=False,
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    bulk_price: Mapped[int] = mapped_column(Integer, nullable=False)
    moq: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    technique: Mapped[str] = mapped_column(String(120), nullable=False)
    materials: Mapped[str] = mapped_column(Text, nullable=False)
    loom_type: Mapped[str] = mapped_column(String(120), nullable=False)
    cluster: Mapped[str] = mapped_column(String(200), nullable=False)
    gi: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    authenticated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    claim_status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="self_declared",
    )
    claim_issuer: Mapped[str | None] = mapped_column(String(255))
    claim_issuer_role: Mapped[str | None] = mapped_column(String(80))
    evidence_url: Mapped[str | None] = mapped_column(String(1000))
    original_audio_url: Mapped[str | None] = mapped_column(String(1000))
    verification_method: Mapped[str | None] = mapped_column(String(255))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claim_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    serial: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    weaver_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("weavers.id", ondelete="CASCADE"),
        nullable=False,
    )
    images: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    story: Mapped[str] = mapped_column(Text, nullable=False)
    story_title: Mapped[str] = mapped_column(String(200), nullable=False)
    tags: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    production_range: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    weaver = relationship("Weaver", back_populates="products")
    passport_anchor = relationship(
        "PassportAnchor",
        back_populates="product",
        cascade="all, delete-orphan",
        uselist=False,
    )


class PassportAnchor(Base):
    __tablename__ = "passport_anchors"

    product_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
    )
    record_hash: Mapped[str] = mapped_column(String(66), unique=True, nullable=False)
    chain_id: Mapped[int] = mapped_column(Integer, nullable=False)
    network: Mapped[str] = mapped_column(String(40), nullable=False)
    contract_address: Mapped[str] = mapped_column(String(42), nullable=False)
    recipient_address: Mapped[str] = mapped_column(String(42), nullable=False)
    signer_address: Mapped[str] = mapped_column(String(42), nullable=False)
    token_id: Mapped[int | None] = mapped_column(BigInteger)
    token_uri: Mapped[str] = mapped_column(String(1000), nullable=False)
    canonical_record: Mapped[dict] = mapped_column(JSON, nullable=False)
    metadata_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    transaction_hash: Mapped[str] = mapped_column(
        String(66),
        unique=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    block_number: Mapped[int | None] = mapped_column(BigInteger)
    confirmations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    product = relationship("Product", back_populates="passport_anchor")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    product_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    buyer: Mapped[str] = mapped_column(String(255), nullable=False)
    order_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    product = relationship("Product")


class RFQ(Base):
    __tablename__ = "rfqs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    product_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_title: Mapped[str] = mapped_column(String(255), nullable=False)
    buyer: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(255))
    delivery_pincode: Mapped[str | None] = mapped_column(String(20))
    required_by: Mapped[date | None] = mapped_column(Date)
    sample_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    accepts_handmade_variation: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    target_budget: Mapped[int | None] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    estimated_total: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    quoted_unit_price: Mapped[int | None] = mapped_column(Integer)
    production_lead_days: Mapped[int | None] = mapped_column(Integer)
    expected_artisan_payout: Mapped[int | None] = mapped_column(Integer)
    seller_notes: Mapped[str | None] = mapped_column(Text)
    quote_valid_until: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="buyer")
    weaver_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("weavers.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    weaver = relationship("Weaver", back_populates="user_profile")
