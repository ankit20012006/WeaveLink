from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

import httpx
from app.api.deps import (
    AuthUser,
    get_claimed_weaver_id,
    get_user_id,
    require_role,
    require_verified_weaver,
)
from app.core.config import settings
from app.db.models import RFQ as RFQModel
from app.db.models import PassportAnchor as PassportAnchorModel
from app.db.models import Product as ProductModel
from app.db.models import Weaver as WeaverModel
from app.db.session import get_db
from app.schemas.catalog import (
    CheckoutPayload,
    CheckoutSession,
    ClaimVerificationPayload,
    DashboardOrderPublic,
    DashboardStats,
    OrderCreatePayload,
    OrderStatusUpdatePayload,
    PassportAnchorPublic,
    PassportMintPayload,
    ProductCreatePayload,
    ProductPatchPayload,
    ProductPublic,
    ProductStatusUpdatePayload,
    RFQCreatePayload,
    RFQPublic,
    RFQQuotePayload,
    RFQStatusUpdatePayload,
    VerificationPayload,
    Weaver,
)
from app.services.auth_db import get_user_profile
from app.services.catalog_db import (
    create_order,
    create_product,
    create_rfq,
    get_product,
    get_product_by_serial,
    get_verification,
    get_weaver,
    list_categories,
    list_clusters,
    list_orders_for_weaver,
    list_products,
    list_products_for_weaver,
    list_rfq_for_weaver,
    list_techniques,
    seller_stats,
    set_product_status,
    update_order_status,
    update_product,
    update_rfq_status,
)
from app.services.passport_chain import (
    build_passport_metadata,
    get_product_passport,
    mint_product_passport,
    product_record_hash,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _passport_metadata_url(product_id: str) -> str:
    base = settings.public_api_url.rstrip("/")
    prefix = settings.api_v1_prefix.rstrip("/")
    if base.endswith(prefix):
        return f"{base}/catalog/passports/{product_id}/metadata"
    return f"{base}{prefix}/catalog/passports/{product_id}/metadata"


def _normalize_currency(value: str) -> str:
    normalized = (value or "INR").strip().upper()
    return normalized or "INR"


async def _create_razorpay_order(
    *,
    amount: int,
    payload: CheckoutPayload,
) -> CheckoutSession:
    if not settings.razorpay_api_key or not settings.razorpay_api_secret:
        return CheckoutSession(
            status="not_configured",
            amount=amount,
            currency=_normalize_currency(payload.currency),
            message="Razorpay API credentials are not configured.",
        )

    body: dict[str, Any] = {
        "amount": amount * 100,
        "currency": _normalize_currency(payload.currency),
        "payment_capture": 1,
        "receipt": f"WL-{payload.weaver_id or secrets.token_hex(4)}",
        "notes": {"purpose": payload.purpose, **payload.notes, "weaverId": payload.weaver_id or ""},
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.post(
            "https://api.razorpay.com/v1/orders",
            json=body,
            auth=(settings.razorpay_api_key, settings.razorpay_api_secret),
        )
        if response.status_code not in {200, 201}:
            return CheckoutSession(
                status="error",
                amount=amount,
                currency=_normalize_currency(payload.currency),
                message=(
                    f"Razorpay order creation failed: "
                    f"HTTP {response.status_code}."
                ),
            )
        data = response.json()
        return CheckoutSession(
            status="ready",
            order_id=data.get("id"),
            order_number=data.get("receipt"),
            amount=amount,
            currency=_normalize_currency(payload.currency),
            key_id=settings.razorpay_api_key,
        )


async def _resolve_weaver_id(
    *,
    db: AsyncSession | None,
    user: AuthUser,
    user_id: str | None,
) -> str:
    claimed = get_claimed_weaver_id(user)
    if claimed:
        return claimed

    if db is not None and user_id:
        profile = await get_user_profile(db, user_id)
        if profile and profile.weaver_id:
            return profile.weaver_id

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Seller identity not linked to this token",
    )


@router.get("/products", response_model=list[ProductPublic])
async def list_products_endpoint(
    cluster: str | None = Query(default=None),
    technique: str | None = Query(default=None),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    min_price: int | None = Query(default=None, alias="min_price", ge=0),
    max_price: int | None = Query(default=None, alias="max_price", ge=0),
    sort_by: str = Query(default="featured"),
    authenticated_only: bool = Query(default=False),
    db: AsyncSession | None = Depends(get_db),
):
    allowed_sort = {"featured", "price_low_to_high", "price_high_to_low", "name_asc"}
    normalized_sort = sort_by.strip().replace("-", "_")
    if normalized_sort not in allowed_sort:
        normalized_sort = "featured"
    return await list_products(
        db=db,
        cluster=cluster,
        technique=technique,
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price,
        sort_by=normalized_sort,
        authenticated_only=authenticated_only,
    )


@router.post("/products", response_model=ProductPublic, status_code=status.HTTP_201_CREATED)
async def create_product_endpoint(
    payload: ProductCreatePayload,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    try:
        return await create_product(
            db=db,
            owner_weaver_id=weaver_id,
            payload=payload,
        )
    except ValueError as exc:
        detail = str(exc)
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if detail == "Seller not found":
            code = status.HTTP_404_NOT_FOUND
        elif detail == "Product serial already exists":
            code = status.HTTP_409_CONFLICT
        elif "not available" in detail:
            code = status.HTTP_503_SERVICE_UNAVAILABLE
        raise HTTPException(
            status_code=code,
            detail=detail,
        ) from exc


@router.get("/products/{product_id}", response_model=ProductPublic)
async def get_product_endpoint(
    product_id: str,
    db: AsyncSession | None = Depends(get_db),
):
    product = await get_product(db=db, product_id=product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return product


@router.patch(
    "/products/{product_id}/claim",
    response_model=ProductPublic,
)
async def verify_product_claim_endpoint(
    product_id: str,
    payload: ClaimVerificationPayload,
    db: AsyncSession | None = Depends(get_db),
    _reviewer: AuthUser = Depends(
        require_role("admin", "cooperative", "gi_authority"),
    ),
):
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
    product = await db.get(ProductModel, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    product.claim_status = payload.status
    product.claim_issuer = payload.issuer.strip()
    product.claim_issuer_role = payload.issuer_role.strip()
    product.evidence_url = payload.evidence_url.strip()
    product.verification_method = payload.verification_method.strip()
    product.verified_at = datetime.now(timezone.utc)
    product.claim_expires_at = payload.expires_at
    product.authenticated = payload.status in {
        "cooperative_verified",
        "gi_authority_verified",
    }
    product.updated_at = datetime.now(timezone.utc)
    await db.commit()
    refreshed = await get_product(db=db, product_id=product_id)
    if refreshed is None:
        raise HTTPException(status_code=500, detail="Updated product unavailable")
    return refreshed


@router.get(
    "/products/{product_id}/passport",
    response_model=PassportAnchorPublic | None,
)
async def get_product_passport_endpoint(
    product_id: str,
    db: AsyncSession | None = Depends(get_db),
):
    if db is None:
        return None
    return await get_product_passport(
        db=db,
        product_id=product_id,
        refresh=True,
    )


@router.post(
    "/products/{product_id}/passport/mint",
    response_model=PassportAnchorPublic,
    status_code=status.HTTP_202_ACCEPTED,
)
async def mint_product_passport_endpoint(
    product_id: str,
    payload: PassportMintPayload,
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
    db: AsyncSession | None = Depends(get_db),
):
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not available for passport minting",
        )

    owner_weaver_id = await _resolve_weaver_id(
        db=db,
        user=user,
        user_id=user_id,
    )
    product = await db.get(ProductModel, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    weaver = await db.get(WeaverModel, product.weaver_id)
    if weaver is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product weaver record is missing",
        )

    record_hash = product_record_hash(product)
    metadata_url = _passport_metadata_url(product_id)
    metadata_snapshot = build_passport_metadata(
        product=product,
        weaver_name=weaver.name,
        record_hash=record_hash,
    )
    try:
        return await mint_product_passport(
            db=db,
            product=product,
            owner_weaver_id=owner_weaver_id,
            recipient_address=payload.recipient_address,
            token_uri=metadata_url,
            metadata_snapshot=metadata_snapshot,
        )
    except ValueError as exc:
        detail = str(exc)
        code = (
            status.HTTP_403_FORBIDDEN
            if detail == "Product unauthorized"
            else status.HTTP_409_CONFLICT
            if "changed after anchoring" in detail or "must be approved" in detail
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code=code, detail=detail) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get(
    "/passports/{product_id}/metadata",
    name="passport_metadata_endpoint",
)
async def passport_metadata_endpoint(
    product_id: str,
    response: Response,
    db: AsyncSession | None = Depends(get_db),
):
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )

    anchor = await db.get(PassportAnchorModel, product_id)
    if anchor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Passport has not been minted",
        )
    if not anchor.metadata_snapshot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Passport metadata snapshot is unavailable",
        )
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return anchor.metadata_snapshot


@router.post("/rfq/{rfq_id}/quote", response_model=RFQPublic)
async def quote_rfq_endpoint(
    rfq_id: str,
    payload: RFQQuotePayload,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    rfq = await db.get(RFQModel, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=404, detail="Bulk request not found")
    product = await db.get(ProductModel, rfq.product_id)
    owner_weaver_id = await _resolve_weaver_id(
        db=db,
        user=user,
        user_id=user_id,
    )
    if product is None or product.weaver_id != owner_weaver_id:
        raise HTTPException(status_code=403, detail="Bulk request unauthorized")
    rfq.quoted_unit_price = payload.quoted_unit_price
    rfq.production_lead_days = payload.production_lead_days
    rfq.expected_artisan_payout = payload.expected_artisan_payout
    rfq.seller_notes = payload.seller_notes
    rfq.quote_valid_until = payload.quote_valid_until
    rfq.status = "accepted"
    rfq.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(rfq)
    return RFQPublic(
        id=rfq.id,
        productId=rfq.product_id,
        productTitle=rfq.product_title,
        buyer=rfq.buyer,
        quantity=rfq.quantity,
        notes=rfq.notes,
        contactEmail=rfq.contact_email,
        deliveryPincode=rfq.delivery_pincode,
        requiredBy=rfq.required_by,
        sampleRequired=rfq.sample_required,
        acceptsHandmadeVariation=rfq.accepts_handmade_variation,
        targetBudget=rfq.target_budget,
        estimatedTotal=rfq.estimated_total,
        status=rfq.status,
        quotedUnitPrice=rfq.quoted_unit_price,
        productionLeadDays=rfq.production_lead_days,
        expectedArtisanPayout=rfq.expected_artisan_payout,
        sellerNotes=rfq.seller_notes,
        quoteValidUntil=rfq.quote_valid_until,
        createdAt=rfq.created_at,
    )


@router.patch("/products/{product_id}", response_model=ProductPublic)
async def update_product_endpoint(
    product_id: str,
    payload: ProductPatchPayload,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    try:
        return await update_product(
            db=db,
            weaver_id=weaver_id,
            product_id=product_id,
            payload=payload,
        )
    except ValueError as exc:
        detail = str(exc)
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if detail == "Product not found":
            code = status.HTTP_404_NOT_FOUND
        elif detail == "Product unauthorized":
            code = status.HTTP_403_FORBIDDEN
        elif detail == "Invalid product status transition":
            code = status.HTTP_409_CONFLICT
        elif "not available" in detail:
            code = status.HTTP_503_SERVICE_UNAVAILABLE
        raise HTTPException(status_code=code, detail=detail) from exc


@router.patch("/products/{product_id}/status", response_model=ProductPublic)
async def set_product_status_endpoint(
    product_id: str,
    payload: ProductStatusUpdatePayload,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    try:
        return await set_product_status(
            db=db,
            weaver_id=weaver_id,
            product_id=product_id,
            status=payload.status,
        )
    except ValueError as exc:
        detail = str(exc)
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if detail == "Product not found":
            code = status.HTTP_404_NOT_FOUND
        elif detail == "Product unauthorized":
            code = status.HTTP_403_FORBIDDEN
        elif detail == "Invalid product status transition":
            code = status.HTTP_409_CONFLICT
        elif "not available" in detail:
            code = status.HTTP_503_SERVICE_UNAVAILABLE
        raise HTTPException(status_code=code, detail=detail) from exc


@router.delete("/products/{product_id}", response_model=ProductPublic)
async def archive_product_endpoint(
    product_id: str,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    try:
        return await set_product_status(
            db=db,
            weaver_id=weaver_id,
            product_id=product_id,
            status="sold",
        )
    except ValueError as exc:
        detail = str(exc)
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if detail == "Product not found":
            code = status.HTTP_404_NOT_FOUND
        elif detail == "Product unauthorized":
            code = status.HTTP_403_FORBIDDEN
        elif detail == "Invalid product status transition":
            code = status.HTTP_409_CONFLICT
        elif "not available" in detail:
            code = status.HTTP_503_SERVICE_UNAVAILABLE
        raise HTTPException(status_code=code, detail=detail) from exc


@router.get("/verify/{serial}", response_model=VerificationPayload)
async def verify_product(
    serial: str,
    db: AsyncSession | None = Depends(get_db),
):
    resolved = await get_product_by_serial(db=db, serial=serial)
    if resolved is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Serial not found",
        )
    verification = await get_verification(db=db, serial=resolved.serial)
    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification payload unavailable",
        )
    return verification


@router.get("/clusters", response_model=list[str])
async def list_cluster_values(db: AsyncSession | None = Depends(get_db)):
    return await list_clusters(db=db)


@router.get("/techniques", response_model=list[str])
async def list_technique_values(db: AsyncSession | None = Depends(get_db)):
    return await list_techniques(db=db)


@router.get("/categories", response_model=list[str])
async def list_category_values(db: AsyncSession | None = Depends(get_db)):
    return await list_categories(db=db)


@router.get("/me/orders", response_model=list[DashboardOrderPublic])
async def list_my_orders(
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    return await list_orders_for_weaver(db=db, weaver_id=weaver_id)


@router.get("/me/products", response_model=list[ProductPublic])
async def list_my_products(
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    return await list_products_for_weaver(db=db, weaver_id=weaver_id)


@router.get("/me/rfqs", response_model=list[RFQPublic])
async def list_my_rfqs(
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    return await list_rfq_for_weaver(db=db, weaver_id=weaver_id)


@router.get("/me/stats", response_model=DashboardStats)
async def list_my_stats(
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    return await seller_stats(db=db, weaver_id=weaver_id)


@router.get(
    "/seller/{weaver_id}/orders",
    response_model=list[DashboardOrderPublic],
)
async def list_seller_orders(
    weaver_id: str,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    if await _resolve_weaver_id(db=db, user=user, user_id=user_id) != weaver_id:
        raise HTTPException(status_code=403, detail="Seller data unauthorized")
    if (await get_weaver(db=db, weaver_id=weaver_id)) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weaver not found",
        )
    return await list_orders_for_weaver(db=db, weaver_id=weaver_id)


@router.get(
    "/seller/{weaver_id}/products",
    response_model=list[ProductPublic],
)
async def list_seller_products(
    weaver_id: str,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    if await _resolve_weaver_id(db=db, user=user, user_id=user_id) != weaver_id:
        raise HTTPException(status_code=403, detail="Seller data unauthorized")
    if (await get_weaver(db=db, weaver_id=weaver_id)) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weaver not found",
        )
    return await list_products_for_weaver(db=db, weaver_id=weaver_id)


@router.get(
    "/seller/{weaver_id}/rfqs",
    response_model=list[RFQPublic],
)
async def list_seller_rfqs(
    weaver_id: str,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    if await _resolve_weaver_id(db=db, user=user, user_id=user_id) != weaver_id:
        raise HTTPException(status_code=403, detail="Seller data unauthorized")
    if (await get_weaver(db=db, weaver_id=weaver_id)) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weaver not found",
        )
    return await list_rfq_for_weaver(db=db, weaver_id=weaver_id)


@router.get("/seller/{weaver_id}/stats", response_model=DashboardStats)
async def seller_dashboard_stats(
    weaver_id: str,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    if await _resolve_weaver_id(db=db, user=user, user_id=user_id) != weaver_id:
        raise HTTPException(status_code=403, detail="Seller data unauthorized")
    if (await get_weaver(db=db, weaver_id=weaver_id)) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weaver not found",
        )
    return await seller_stats(db=db, weaver_id=weaver_id)


@router.post("/orders", response_model=DashboardOrderPublic, status_code=status.HTTP_201_CREATED)
async def create_order_endpoint(
    payload: OrderCreatePayload,
    db: AsyncSession | None = Depends(get_db),
):
    try:
        return await create_order(db=db, payload=payload)
    except ValueError as exc:
        detail = str(exc)
        code = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if "Database not available" in detail
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        if detail == "Product not found":
            code = status.HTTP_404_NOT_FOUND
        elif "already exists" in detail:
            code = status.HTTP_409_CONFLICT
        raise HTTPException(status_code=code, detail=detail) from exc


@router.patch(
    "/orders/{order_id}/status",
    response_model=DashboardOrderPublic,
)
async def update_order_status_endpoint(
    order_id: str,
    payload: OrderStatusUpdatePayload,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    try:
        return await update_order_status(
            db=db,
            order_id=order_id,
            status=payload.status,
            weaver_id=weaver_id,
        )
    except ValueError as exc:
        detail = str(exc)
        code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if detail == "Order not found":
            code = status.HTTP_404_NOT_FOUND
        elif detail == "Not authorized for this order":
            code = status.HTTP_403_FORBIDDEN
        elif detail == "Invalid order status transition":
            code = status.HTTP_409_CONFLICT
        elif "not available" in detail:
            code = status.HTTP_503_SERVICE_UNAVAILABLE
        raise HTTPException(status_code=code, detail=detail) from exc


@router.post("/rfq", response_model=RFQPublic, status_code=status.HTTP_201_CREATED)
async def create_rfq_endpoint(
    payload: RFQCreatePayload,
    db: AsyncSession | None = Depends(get_db),
):
    try:
        return await create_rfq(db, payload)
    except ValueError as exc:
        detail = str(exc)
        code = (
            status.HTTP_404_NOT_FOUND
            if detail == "Product not found"
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code=code, detail=detail)


@router.post("/payments/checkout", response_model=CheckoutSession)
async def create_checkout_session_endpoint(
    payload: CheckoutPayload,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    payload = payload.model_copy(update={"weaver_id": weaver_id})
    try:
        return await _create_razorpay_order(amount=payload.amount, payload=payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not initialize payment: {exc}",
        ) from exc


@router.patch(
    "/rfq/{rfq_id}",
    response_model=RFQPublic,
)
async def update_rfq_status_endpoint(
    rfq_id: str,
    payload: RFQStatusUpdatePayload,
    db: AsyncSession | None = Depends(get_db),
    user: AuthUser = Depends(require_verified_weaver),
    user_id: str | None = Depends(get_user_id),
):
    weaver_id = await _resolve_weaver_id(db=db, user=user, user_id=user_id)
    try:
        return await update_rfq_status(
            db=db,
            rfq_id=rfq_id,
            status=payload.status,
            weaver_id=weaver_id,
        )
    except ValueError as exc:
        detail = str(exc)
        code = status.HTTP_409_CONFLICT
        if detail == "RFQ not found":
            code = status.HTTP_404_NOT_FOUND
        elif detail == "Not authorized for this RFQ":
            code = status.HTTP_403_FORBIDDEN
        raise HTTPException(status_code=code, detail=detail)


@router.get("/weavers/{weaver_id}", response_model=Weaver)
async def get_weaver_endpoint(
    weaver_id: str,
    db: AsyncSession | None = Depends(get_db),
):
    weaver = await get_weaver(db=db, weaver_id=weaver_id)
    if weaver is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weaver not found",
        )
    return weaver
