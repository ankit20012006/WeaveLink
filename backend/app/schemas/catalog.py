from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

InventoryStatus = Literal["available", "in-production", "sold"]
OrderType = Literal["B2C", "B2B"]
OrderStatus = Literal["pending", "shipped", "settled"]
RFQStatus = Literal["submitted", "accepted", "rejected"]
ClaimStatus = Literal[
    "draft",
    "self_declared",
    "evidence_submitted",
    "cooperative_verified",
    "gi_authority_verified",
    "revoked",
]

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
    claim_status: ClaimStatus = Field(default="self_declared", alias="claimStatus")
    claim_issuer: str | None = Field(default=None, alias="claimIssuer")
    claim_issuer_role: str | None = Field(default=None, alias="claimIssuerRole")
    evidence_url: str | None = Field(default=None, alias="evidenceUrl")
    original_audio_url: str | None = Field(
        default=None,
        alias="originalAudioUrl",
    )
    verification_method: str | None = Field(
        default=None,
        alias="verificationMethod",
    )
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")
    claim_expires_at: datetime | None = Field(default=None, alias="claimExpiresAt")
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
    anchor_status: str = Field(default="not_minted", alias="anchorStatus")
    anchor_transaction_hash: str | None = Field(
        default=None,
        alias="anchorTransactionHash",
    )
    anchor_explorer_url: str | None = Field(default=None, alias="anchorExplorerUrl")
    anchor_contract_address: str | None = Field(
        default=None,
        alias="anchorContractAddress",
    )
    anchor_token_id: int | None = Field(default=None, alias="anchorTokenId")
    anchor_contract_explorer_url: str | None = Field(
        default=None,
        alias="anchorContractExplorerUrl",
    )
    anchor_token_explorer_url: str | None = Field(
        default=None,
        alias="anchorTokenExplorerUrl",
    )
    anchor_confirmations: int = Field(default=0, alias="anchorConfirmations")

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
    evidence_url: str | None = Field(default=None, alias="evidenceUrl")
    original_audio_url: str | None = Field(
        default=None,
        alias="originalAudioUrl",
    )
    story: str
    story_title: str = Field(..., alias="storyTitle")
    tags: list[str] = Field(default_factory=list)
    production_range: str = Field(..., alias="productionRange")

    model_config = _CAMEL_CONFIG


class PassportMintPayload(BaseModel):
    recipient_address: str | None = Field(default=None, alias="recipientAddress")

    model_config = _CAMEL_CONFIG


class ClaimVerificationPayload(BaseModel):
    status: Literal[
        "evidence_submitted",
        "cooperative_verified",
        "gi_authority_verified",
        "revoked",
    ]
    issuer: str
    issuer_role: str = Field(..., alias="issuerRole")
    evidence_url: str = Field(..., alias="evidenceUrl")
    verification_method: str = Field(..., alias="verificationMethod")
    expires_at: datetime | None = Field(default=None, alias="expiresAt")

    model_config = _CAMEL_CONFIG


class PassportAnchorPublic(BaseModel):
    product_id: str = Field(..., alias="productId")
    status: Literal["not_configured", "submitted", "confirmed", "failed"]
    record_hash: str = Field(..., alias="recordHash")
    chain_id: int = Field(..., alias="chainId")
    network: str
    contract_address: str = Field(..., alias="contractAddress")
    recipient_address: str = Field(..., alias="recipientAddress")
    signer_address: str = Field(..., alias="signerAddress")
    token_id: int | None = Field(default=None, alias="tokenId")
    token_uri: str = Field(..., alias="tokenUri")
    transaction_hash: str = Field(..., alias="transactionHash")
    explorer_url: str = Field(..., alias="explorerUrl")
    contract_explorer_url: str = Field(..., alias="contractExplorerUrl")
    token_explorer_url: str | None = Field(default=None, alias="tokenExplorerUrl")
    block_number: int | None = Field(default=None, alias="blockNumber")
    confirmations: int = 0
    error_message: str | None = Field(default=None, alias="errorMessage")
    submitted_at: datetime = Field(..., alias="submittedAt")
    confirmed_at: datetime | None = Field(default=None, alias="confirmedAt")

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
    contact_email: str = Field(..., alias="contactEmail")
    delivery_pincode: str = Field(..., alias="deliveryPincode")
    required_by: date | None = Field(default=None, alias="requiredBy")
    sample_required: bool = Field(default=False, alias="sampleRequired")
    accepts_handmade_variation: bool = Field(
        default=False,
        alias="acceptsHandmadeVariation",
    )
    target_budget: int | None = Field(default=None, alias="targetBudget", gt=0)
    client_ref: str | None = Field(default=None, alias="clientRef")

    model_config = _CAMEL_CONFIG


class RFQStatusUpdatePayload(BaseModel):
    status: RFQStatus


class RFQQuotePayload(BaseModel):
    quoted_unit_price: int = Field(..., alias="quotedUnitPrice", gt=0)
    production_lead_days: int = Field(..., alias="productionLeadDays", gt=0)
    expected_artisan_payout: int = Field(
        ...,
        alias="expectedArtisanPayout",
        gt=0,
    )
    seller_notes: str | None = Field(default=None, alias="sellerNotes")
    quote_valid_until: date = Field(..., alias="quoteValidUntil")

    model_config = _CAMEL_CONFIG


class RFQ(BaseModel):
    id: str
    product_id: str = Field(..., alias="productId")
    product_title: str = Field(..., alias="productTitle")
    buyer: str
    quantity: int
    notes: str | None = None
    contact_email: str | None = Field(default=None, alias="contactEmail")
    delivery_pincode: str | None = Field(default=None, alias="deliveryPincode")
    required_by: date | None = Field(default=None, alias="requiredBy")
    sample_required: bool = Field(default=False, alias="sampleRequired")
    accepts_handmade_variation: bool = Field(
        default=False,
        alias="acceptsHandmadeVariation",
    )
    target_budget: int | None = Field(default=None, alias="targetBudget")
    estimated_total: int = Field(..., alias="estimatedTotal")
    status: RFQStatus
    quoted_unit_price: int | None = Field(default=None, alias="quotedUnitPrice")
    production_lead_days: int | None = Field(
        default=None,
        alias="productionLeadDays",
    )
    expected_artisan_payout: int | None = Field(
        default=None,
        alias="expectedArtisanPayout",
    )
    seller_notes: str | None = Field(default=None, alias="sellerNotes")
    quote_valid_until: date | None = Field(default=None, alias="quoteValidUntil")
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


class CheckoutPayload(BaseModel):
    amount: int = Field(..., gt=0)
    currency: str = Field(default="INR")
    purpose: str
    notes: dict[str, str] = Field(default_factory=dict)
    weaver_id: str | None = Field(default=None, alias="weaverId")

    model_config = _CAMEL_CONFIG


class CheckoutSession(BaseModel):
    status: Literal["ready", "not_configured", "error"]
    order_id: str | None = Field(default=None, alias="orderId")
    order_number: str | None = Field(default=None, alias="orderNumber")
    amount: int
    currency: str
    key_id: str | None = Field(default=None, alias="keyId")
    message: str | None = None

    model_config = _CAMEL_CONFIG
