from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    AuthUser,
    get_claimed_weaver_id,
    get_user_id,
    require_verified_weaver,
)
from app.db.session import get_db
from app.schemas.catalog import (
    DashboardOrderPublic,
    DashboardStats,
    OrderCreatePayload,
    OrderStatusUpdatePayload,
    ProductCreatePayload,
    ProductStatusUpdatePayload,
    ProductPatchPayload,
    ProductPublic,
    RFQCreatePayload,
    RFQStatusUpdatePayload,
    RFQPublic,
    VerificationPayload,
    Weaver,
)
from app.services.auth_db import get_user_profile
from app.services.catalog_db import (
    create_product,
    create_rfq,
    create_order,
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

router = APIRouter(prefix="/catalog", tags=["catalog"])


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
    authenticated_only: bool = Query(default=True),
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
):
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
):
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
):
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
):
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
