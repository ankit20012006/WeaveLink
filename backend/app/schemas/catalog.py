from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

InventoryStatus = Literal["available", "in-production", "sold"]
OrderType = Literal["B2C", "B2B"]
OrderStatus = Literal["pending", "shipped", "settled"]
RFQStatus = Literal["submitted", "accepted", "rejected"]

_CAMEL_CONFIG = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class Weaver(BaseModel):
    id: str
    name: str
    cluster: str
    gi: str | None = None
    language: str
    verified: bool
    photo: str
    years: int
    bio: str


class Product(BaseModel):
    id: str
    title: str
    price: int
    bulk_price: int = Field(..., alias="bulkPrice")
    moq: int
    category: str
    technique: str
    materials: str
    loom_type: str = Field(..., alias="loomType")
    cluster: str
    gi: str | None = None
    status: InventoryStatus
    authenticated: bool
    serial: str
    weaver_id: str = Field(..., alias="weaverId")
    images: list[str]
    story: str
    story_title: str = Field(..., alias="storyTitle")
    tags: list[str]
    production_range: str = Field(..., alias="productionRange")

    model_config = _CAMEL_CONFIG


class ProductPublic(Product):
    pass


class VerificationPayload(BaseModel):
    product: Product
    weaver: Weaver
    passport_status: Literal["valid", "revoked"] = Field(
        ...,
        alias="passportStatus",
    )
    anchor_hash: str = Field(..., alias="anchorHash")
    anchor_chain: str = Field(..., alias="anchorChain")
    anchor_provider: str = Field(..., alias="anchorProvider")

    model_config = _CAMEL_CONFIG


class ProductCreatePayload(BaseModel):
    title: str
    price: int = Field(..., gt=0)
    bulk_price: int = Field(..., alias="bulkPrice", gt=0)
    moq: int = Field(..., gt=0)
    category: str
    technique: str
    materials: str
    loom_type: str = Field(..., alias="loomType")
    cluster: str
    gi: str | None = None
    status: InventoryStatus
    authenticated: bool = False
    serial: str
    images: list[str] = Field(default_factory=list)
    story: str
    story_title: str = Field(..., alias="storyTitle")
    tags: list[str] = Field(default_factory=list)
    production_range: str = Field(..., alias="productionRange")

    model_config = _CAMEL_CONFIG


class ProductPatchPayload(BaseModel):
    title: str | None = None
    price: int | None = Field(default=None, gt=0)
    bulk_price: int | None = Field(default=None, gt=0, alias="bulkPrice")
    moq: int | None = Field(default=None, gt=0)
    category: str | None = None
    technique: str | None = None
    materials: str | None = None
    loom_type: str | None = Field(default=None, alias="loomType")
    cluster: str | None = None
    gi: str | None = None
    status: InventoryStatus | None = None
    authenticated: bool | None = None
    images: list[str] | None = None
    story: str | None = None
    story_title: str | None = Field(default=None, alias="storyTitle")
    tags: list[str] | None = None
    production_range: str | None = Field(default=None, alias="productionRange")

    model_config = _CAMEL_CONFIG


class RFQCreatePayload(BaseModel):
    product_id: str = Field(..., alias="productId")
    buyer: str
    quantity: int = Field(..., gt=0)
    notes: str | None = None

    model_config = _CAMEL_CONFIG


class RFQStatusUpdatePayload(BaseModel):
    status: RFQStatus


class RFQ(BaseModel):
    id: str
    product_id: str = Field(..., alias="productId")
    product_title: str = Field(..., alias="productTitle")
    buyer: str
    quantity: int
    notes: str | None = None
    estimated_total: int = Field(..., alias="estimatedTotal")
    status: RFQStatus
    created_at: datetime = Field(..., alias="createdAt")

    model_config = _CAMEL_CONFIG


class RFQPublic(RFQ):
    pass


class ProductStatusUpdatePayload(BaseModel):
    status: InventoryStatus


class OrderCreatePayload(BaseModel):
    product_id: str = Field(..., alias="productId")
    buyer: str
    type: OrderType
    amount: int = Field(..., gt=0)
    status: OrderStatus = "pending"
    date: str | None = None
    idempotency_key: str | None = Field(default=None, alias="idempotencyKey")

    model_config = _CAMEL_CONFIG


class OrderStatusUpdatePayload(BaseModel):
    status: OrderStatus


class DashboardOrder(BaseModel):
    id: str
    product_id: str = Field(..., alias="productId")
    product_title: str | None = Field(default=None, alias="productTitle")
    buyer: str
    type: OrderType
    amount: int
    status: OrderStatus
    date: str

    model_config = _CAMEL_CONFIG


class DashboardOrderPublic(DashboardOrder):
    pass


class DashboardStats(BaseModel):
    month_gmv: int = Field(..., alias="monthGmv")
    pending_settlement: int = Field(..., alias="pendingSettlement")
    open_orders: int = Field(..., alias="openOrders")
    active_skus: int = Field(..., alias="activeSkus")

    model_config = _CAMEL_CONFIG
