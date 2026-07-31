from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import RFQ, Order, Product, Weaver
from app.schemas.catalog import (
    RFQ as RFQSchema,
)
from app.schemas.catalog import (
    DashboardOrder,
    DashboardStats,
    OrderCreatePayload,
    OrderStatus,
    ProductCreatePayload,
    ProductPatchPayload,
    RFQCreatePayload,
    RFQStatus,
    VerificationPayload,
)
from app.schemas.catalog import (
    Product as ProductSchema,
)
from app.schemas.catalog import (
    Weaver as WeaverSchema,
)
from app.services import demo_store
from app.services.passport_chain import get_product_passport, product_record_hash

DBSortBy = Literal["featured", "price_low_to_high", "price_high_to_low", "name_asc"]
_PRODUCT_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "available": {"in-production", "sold"},
    "in-production": {"available", "sold"},
    "sold": set(),
}
_ORDER_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"shipped", "settled"},
    "shipped": {"settled"},
    "settled": set(),
}


def _to_product_schema(product: Product) -> ProductSchema:
    return ProductSchema(
        id=product.id,
        title=product.title,
        price=product.price,
        bulkPrice=product.bulk_price,
        moq=product.moq,
        category=product.category,
        technique=product.technique,
        materials=product.materials,
        loomType=product.loom_type,
        cluster=product.cluster,
        gi=product.gi,
        status=product.status,
        authenticated=product.authenticated,
        claimStatus=product.claim_status,
        claimIssuer=product.claim_issuer,
        claimIssuerRole=product.claim_issuer_role,
        evidenceUrl=product.evidence_url,
        originalAudioUrl=product.original_audio_url,
        verificationMethod=product.verification_method,
        verifiedAt=product.verified_at,
        claimExpiresAt=product.claim_expires_at,
        serial=product.serial,
        weaverId=product.weaver_id,
        images=list(product.images or []),
        story=product.story,
        storyTitle=product.story_title,
        tags=list(product.tags or []),
        productionRange=product.production_range,
    )


def _to_weaver_schema(weaver: Weaver) -> WeaverSchema:
    return WeaverSchema(
        id=weaver.id,
        name=weaver.name,
        cluster=weaver.cluster,
        gi=weaver.gi,
        language=weaver.language,
        verified=weaver.verified,
        photo=weaver.photo,
        years=weaver.years,
        bio=weaver.bio,
    )


def _to_order_schema(order: Order, product: Product | None = None) -> DashboardOrder:
    return DashboardOrder(
        id=order.id,
        productId=order.product_id,
        productTitle=(product.title if product is not None else None),
        buyer=order.buyer,
        type=order.order_type,
        amount=order.amount,
        status=order.status,
        date=order.date.strftime("%d %b %Y"),
    )


def _to_rfq_schema(rfq: RFQ) -> RFQSchema:
    return RFQSchema(
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


def _is_product_status_transition_allowed(current_status: str, next_status: str) -> bool:
    if current_status == next_status:
        return True
    return next_status in _PRODUCT_STATUS_TRANSITIONS.get(current_status, set())


def _is_order_status_transition_allowed(current_status: str, next_status: str) -> bool:
    if current_status == next_status:
        return True
    return next_status in _ORDER_STATUS_TRANSITIONS.get(current_status, set())


def _next_order_id(existing_count: int) -> str:
    return f"ORD-{existing_count + 1:04d}"


def _fallback_product_list(
    *,
    cluster: str | None = None,
    technique: str | None = None,
    category: str | None = None,
    search: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    sort_by: DBSortBy = "featured",
    authenticated_only: bool = True,
) -> list[ProductSchema]:
    return demo_store.list_products(
        cluster=cluster,
        technique=technique,
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        authenticated_only=authenticated_only,
    )


def _sort_products(products: list[ProductSchema], sort_by: DBSortBy) -> list[ProductSchema]:
    if sort_by == "price_low_to_high":
        return sorted(products, key=lambda item: item.price)
    if sort_by == "price_high_to_low":
        return sorted(products, key=lambda item: item.price, reverse=True)
    if sort_by == "name_asc":
        return sorted(products, key=lambda item: item.title.lower())
    return products


def _next_product_id(existing_count: int) -> str:
    return f"PRD-{existing_count + 1:04d}"


def _parse_order_date(value: str | None) -> date:
    if not value:
        return _now().date()

    for fmt in ("%Y-%m-%d", "%d %b %Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    return _now().date()


async def list_products(
    *,
    db: AsyncSession | None,
    cluster: str | None = None,
    technique: str | None = None,
    category: str | None = None,
    search: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    sort_by: DBSortBy = "featured",
    authenticated_only: bool = True,
) -> list[ProductSchema]:
    if db is None:
        return _fallback_product_list(
            cluster=cluster,
            technique=technique,
            category=category,
            search=search,
            min_price=min_price,
            max_price=max_price,
            sort_by=sort_by,
            authenticated_only=authenticated_only,
        )

    try:
        rows = (await db.execute(select(Product))).scalars().all()
        if not rows:
            return _fallback_product_list(
                cluster=cluster,
                technique=technique,
                category=category,
                search=search,
                min_price=min_price,
                max_price=max_price,
                sort_by=sort_by,
                authenticated_only=authenticated_only,
            )

        catalog = [_to_product_schema(row) for row in rows]
    except Exception:
        return _fallback_product_list(
            cluster=cluster,
            technique=technique,
            category=category,
            search=search,
            min_price=min_price,
            max_price=max_price,
            sort_by=sort_by,
            authenticated_only=authenticated_only,
        )

    if authenticated_only:
        catalog = [item for item in catalog if item.authenticated]
    if search:
        term = search.strip().lower()
        if term:
            catalog = [
                item
                for item in catalog
                if (
                    term in item.title.lower()
                    or term in item.category.lower()
                    or term in item.technique.lower()
                    or term in item.materials.lower()
                    or term in item.cluster.lower()
                    or (item.gi is not None and term in item.gi.lower())
                    or any(term in tag.lower() for tag in item.tags)
                )
            ]

    if cluster and cluster != "All clusters":
        catalog = [item for item in catalog if item.cluster == cluster]
    if technique and technique != "All techniques":
        catalog = [item for item in catalog if item.technique == technique]
    if category and category != "All categories":
        catalog = [item for item in catalog if item.category == category]
    if min_price is not None:
        catalog = [item for item in catalog if item.price >= min_price]
    if max_price is not None:
        catalog = [item for item in catalog if item.price <= max_price]

    return _sort_products(catalog, sort_by)


async def get_product(
    *,
    db: AsyncSession | None,
    product_id: str,
) -> ProductSchema | None:
    if db is None:
        return demo_store.get_product(product_id)
    try:
        product = await db.get(Product, product_id)
        if product is None:
            return None
        return _to_product_schema(product)
    except Exception:
        return demo_store.get_product(product_id)


async def get_product_by_serial(
    *,
    db: AsyncSession | None,
    serial: str,
) -> ProductSchema | None:
    if db is None:
        return demo_store.get_product_by_serial(serial)
    try:
        normalized = serial.strip().lower()
        product = (
            await db.execute(select(Product).where(func.lower(Product.serial) == normalized))
        ).scalars().first()
        if product is None:
            return None
        return _to_product_schema(product)
    except Exception:
        return demo_store.get_product_by_serial(serial)


async def get_weaver(
    *,
    db: AsyncSession | None,
    weaver_id: str,
) -> WeaverSchema | None:
    if db is None:
        return demo_store.get_weaver(weaver_id)
    try:
        weaver = await db.get(Weaver, weaver_id)
        if weaver is None:
            return None
        return _to_weaver_schema(weaver)
    except Exception:
        return demo_store.get_weaver(weaver_id)


async def list_products_for_weaver(
    *,
    db: AsyncSession | None,
    weaver_id: str,
) -> list[ProductSchema]:
    if db is None:
        return demo_store.list_products_for_weaver(weaver_id)

    try:
        rows = (
            await db.execute(select(Product).where(Product.weaver_id == weaver_id))
        ).scalars().all()
        if not rows:
            return demo_store.list_products_for_weaver(weaver_id)
        return [_to_product_schema(row) for row in rows]
    except Exception:
        return demo_store.list_products_for_weaver(weaver_id)


async def list_clusters(*, db: AsyncSession | None) -> list[str]:
    if db is None:
        return demo_store.list_clusters()
    try:
        values = sorted(
            {
                value
                for value in (await db.execute(select(Product.cluster))).scalars().all()
                if value
            }
        )
        if not values:
            return ["All clusters"]
        return ["All clusters", *values]
    except Exception:
        return demo_store.list_clusters()


async def list_techniques(*, db: AsyncSession | None) -> list[str]:
    if db is None:
        return demo_store.list_techniques()
    try:
        values = sorted(
            {
                value
                for value in (
                    await db.execute(select(Product.technique))
                ).scalars().all()
                if value
            }
        )
        if not values:
            return ["All techniques"]
        return ["All techniques", *values]
    except Exception:
        return demo_store.list_techniques()


async def list_categories(*, db: AsyncSession | None) -> list[str]:
    if db is None:
        return demo_store.list_categories()
    try:
        values = sorted(
            {
                value
                for value in (await db.execute(select(Product.category))).scalars().all()
                if value
            }
        )
        if not values:
            return ["All categories"]
        return ["All categories", *values]
    except Exception:
        return demo_store.list_categories()


async def get_verification(
    *,
    db: AsyncSession | None,
    serial: str,
) -> VerificationPayload | None:
    product = await get_product_by_serial(db=db, serial=serial)
    if product is None:
        return None
    weaver = await get_weaver(db=db, weaver_id=product.weaver_id)
    if weaver is None:
        return None
    anchor = (
        await get_product_passport(
            db=db,
            product_id=product.id,
            refresh=False,
        )
        if db is not None
        else None
    )
    record_hash = "not-minted"
    if db is not None:
        product_record = await db.get(Product, product.id)
        if product_record is not None:
            record_hash = product_record_hash(product_record)

    return VerificationPayload(
        product=product,
        weaver=weaver,
        passport_status="revoked" if product.claim_status == "revoked" else "valid",
        anchor_hash=anchor.record_hash if anchor else record_hash,
        anchor_chain="Ethereum Sepolia" if anchor else "Not anchored",
        anchor_provider="WeavePassport ERC-721" if anchor else "database record only",
        anchor_status=anchor.status if anchor else "not_minted",
        anchor_transaction_hash=anchor.transaction_hash if anchor else None,
        anchor_explorer_url=anchor.explorer_url if anchor else None,
        anchor_contract_address=anchor.contract_address if anchor else None,
        anchor_token_id=anchor.token_id if anchor else None,
        anchor_contract_explorer_url=anchor.contract_explorer_url if anchor else None,
        anchor_token_explorer_url=anchor.token_explorer_url if anchor else None,
        anchor_confirmations=anchor.confirmations if anchor else 0,
    )


def _next_rfq_id(existing_count: int) -> str:
    return f"RFQ-{existing_count + 1:04d}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_rfq(
    db: AsyncSession | None,
    payload: RFQCreatePayload,
) -> RFQSchema:
    if db is None:
        return demo_store.create_rfq(payload)
    try:
        product = await db.get(Product, payload.product_id)
        if product is None:
            raise ValueError("Product not found")
        if payload.quantity < product.moq:
            raise ValueError(f"Minimum order quantity is {product.moq}")

        existing = (
            await db.execute(
                select(RFQ)
                .where(
                    RFQ.product_id == payload.product_id,
                    RFQ.buyer == payload.buyer,
                    RFQ.quantity == payload.quantity,
                    RFQ.notes == payload.notes,
                    RFQ.status == "submitted",
                )
                .order_by(RFQ.created_at.desc())
            )
        ).scalars().first()
        if existing is not None:
            return _to_rfq_schema(existing)

        next_seq = (await db.scalar(select(func.count()).select_from(RFQ))) or 0
        rfq = RFQ(
            id=_next_rfq_id(int(next_seq)),
            product_id=product.id,
            product_title=product.title,
            buyer=payload.buyer,
            quantity=payload.quantity,
            notes=payload.notes,
            contact_email=payload.contact_email,
            delivery_pincode=payload.delivery_pincode,
            required_by=payload.required_by,
            sample_required=payload.sample_required,
            accepts_handmade_variation=payload.accepts_handmade_variation,
            target_budget=payload.target_budget,
            estimated_total=product.bulk_price * payload.quantity,
            status="submitted",
            created_at=_now(),
            updated_at=_now(),
        )
        db.add(rfq)
        await db.commit()
        await db.refresh(rfq)
        return _to_rfq_schema(rfq)
    except ValueError:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        return demo_store.create_rfq(payload)


async def create_product(
    *,
    db: AsyncSession | None,
    owner_weaver_id: str,
    payload: ProductCreatePayload,
) -> ProductSchema:
    if not owner_weaver_id.strip():
        raise ValueError("Seller context is missing")

    if db is None:
        return demo_store.create_product(owner_weaver_id, payload)

    try:
        serial = payload.serial.strip()
        if not serial:
            raise ValueError("Serial is required")
        existing_owner = await db.get(Weaver, owner_weaver_id)
        if existing_owner is None:
            raise ValueError("Seller not found")
        existing_serial = (
            await db.execute(
                select(Product).where(func.lower(Product.serial) == serial.lower())
            )
        ).scalars().first()
        if existing_serial is not None:
            raise ValueError("Product serial already exists")

        next_seq = (await db.scalar(select(func.count()).select_from(Product))) or 0
        row = Product(
            id=_next_product_id(int(next_seq)),
            title=payload.title.strip(),
            price=payload.price,
            bulk_price=payload.bulk_price,
            moq=payload.moq,
            category=payload.category,
            technique=payload.technique,
            materials=payload.materials,
            loom_type=payload.loom_type,
            cluster=payload.cluster,
            gi=payload.gi,
            status=payload.status,
            authenticated=False,
            claim_status=(
                "evidence_submitted"
                if payload.evidence_url or payload.images
                else "self_declared"
            ),
            evidence_url=payload.evidence_url,
            original_audio_url=payload.original_audio_url,
            verification_method=(
                "Seller-submitted original media"
                if payload.evidence_url or payload.images
                else None
            ),
            serial=serial,
            weaver_id=owner_weaver_id,
            images=list(payload.images or []),
            story=payload.story,
            story_title=payload.story_title,
            tags=list(payload.tags or []),
            production_range=payload.production_range,
            created_at=_now(),
            updated_at=_now(),
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return _to_product_schema(row)
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ValueError(f"Unable to create product: {exc}") from exc


async def create_order(
    db: AsyncSession | None,
    payload: OrderCreatePayload,
) -> DashboardOrder:
    if db is None:
        raise ValueError("Database not available for order creation")

    try:
        product = await db.get(Product, payload.product_id)
        if product is None:
            raise ValueError("Product not found")

        order_date = _parse_order_date(payload.date)
        existing = (
            await db.execute(
                select(Order).where(
                    Order.product_id == payload.product_id,
                    Order.buyer == payload.buyer,
                    Order.order_type == payload.type,
                    Order.amount == payload.amount,
                    Order.date == order_date,
                )
            )
        ).scalars().first()
        if existing is not None:
            return _to_order_schema(existing, product)

        next_seq = (await db.scalar(select(func.count()).select_from(Order))) or 0
        row = Order(
            id=_next_order_id(int(next_seq)),
            product_id=product.id,
            buyer=payload.buyer,
            order_type=payload.type,
            amount=payload.amount,
            status=payload.status,
            date=order_date,
            created_at=_now(),
            updated_at=_now(),
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return _to_order_schema(row, product)
    except ValueError:
        await db.rollback()
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ValueError(f"Unable to create order: {exc}") from exc


async def set_product_status(
    *,
    db: AsyncSession | None,
    weaver_id: str,
    product_id: str,
    status: str,
) -> ProductSchema:
    if db is None:
        raise ValueError("Database not available for product updates")

    try:
        product = await db.get(Product, product_id)
        if product is None:
            raise ValueError("Product not found")
        if product.weaver_id != weaver_id:
            raise ValueError("Product unauthorized")
        if not _is_product_status_transition_allowed(product.status, status):
            raise ValueError("Invalid product status transition")

        product.status = status
        product.updated_at = _now()
        await db.commit()
        await db.refresh(product)
        return _to_product_schema(product)
    except ValueError:
        await db.rollback()
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ValueError(f"Unable to update product status: {exc}") from exc


async def update_product(
    *,
    db: AsyncSession | None,
    weaver_id: str,
    product_id: str,
    payload: ProductPatchPayload,
) -> ProductSchema:
    if db is None:
        raise ValueError("Database not available for product updates")
    try:
        product = await db.get(Product, product_id)
        if product is None:
            raise ValueError("Product not found")
        if product.weaver_id != weaver_id:
            raise ValueError("Product unauthorized")

        if payload.title is not None:
            product.title = payload.title
        if payload.price is not None:
            product.price = payload.price
        if payload.bulk_price is not None:
            product.bulk_price = payload.bulk_price
        if payload.moq is not None:
            product.moq = payload.moq
        if payload.category is not None:
            product.category = payload.category
        if payload.technique is not None:
            product.technique = payload.technique
        if payload.materials is not None:
            product.materials = payload.materials
        if payload.loom_type is not None:
            product.loom_type = payload.loom_type
        if payload.cluster is not None:
            product.cluster = payload.cluster
        if payload.gi is not None:
            product.gi = payload.gi
        if payload.status is not None:
            if not _is_product_status_transition_allowed(product.status, payload.status):
                raise ValueError("Invalid product status transition")
            product.status = payload.status
        if payload.images is not None:
            product.images = list(payload.images)
        if payload.story is not None:
            product.story = payload.story
        if payload.story_title is not None:
            product.story_title = payload.story_title
        if payload.tags is not None:
            product.tags = list(payload.tags)
        if payload.production_range is not None:
            product.production_range = payload.production_range

        product.updated_at = _now()
        await db.commit()
        await db.refresh(product)
        return _to_product_schema(product)
    except ValueError:
        await db.rollback()
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ValueError(f"Unable to update product: {exc}") from exc


async def update_rfq_status(
    *,
    db: AsyncSession | None,
    rfq_id: str,
    status: RFQStatus,
    weaver_id: str | None = None,
) -> RFQSchema:
    if db is None:
        return demo_store.update_rfq_status(rfq_id=rfq_id, status=status)
    try:
        rfq = await db.get(RFQ, rfq_id)
        if rfq is None:
            raise ValueError("RFQ not found")
        if rfq.status != "submitted":
            raise ValueError("RFQ already processed")

        product = await db.get(Product, rfq.product_id)
        if product is None:
            raise ValueError("RFQ product missing")
        if weaver_id is not None and product.weaver_id != weaver_id:
            raise ValueError("Not authorized for this RFQ")

        rfq.status = status
        rfq.updated_at = _now()
        await db.commit()
        await db.refresh(rfq)
        return _to_rfq_schema(rfq)
    except ValueError:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        return demo_store.update_rfq_status(rfq_id=rfq_id, status=status)


async def update_order_status(
    *,
    db: AsyncSession | None,
    order_id: str,
    status: OrderStatus,
    weaver_id: str,
) -> DashboardOrder:
    if db is None:
        raise ValueError("Database not available for order updates")

    try:
        order = await db.get(Order, order_id)
        if order is None:
            raise ValueError("Order not found")
        if not _is_order_status_transition_allowed(order.status, status):
            raise ValueError("Invalid order status transition")

        product = await db.get(Product, order.product_id)
        if product is None:
            raise ValueError("Order product missing")
        if product.weaver_id != weaver_id:
            raise ValueError("Not authorized for this order")

        order.status = status
        order.updated_at = _now()
        await db.commit()
        await db.refresh(order)
        return _to_order_schema(order, product)
    except ValueError:
        await db.rollback()
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ValueError(f"Unable to update order status: {exc}") from exc


async def list_rfq_for_weaver(
    *,
    db: AsyncSession | None,
    weaver_id: str,
) -> list[RFQSchema]:
    if db is None:
        return demo_store.list_rfq_for_weaver(weaver_id)
    try:
        product_rows = (
            await db.execute(select(Product.id).where(Product.weaver_id == weaver_id))
        ).scalars().all()
        if not product_rows:
            return []
        rows = (
            await db.execute(
                select(RFQ)
                .where(RFQ.product_id.in_(product_rows))
                .order_by(RFQ.created_at.desc())
            )
        ).scalars().all()
        return [_to_rfq_schema(row) for row in rows]
    except Exception:
        return demo_store.list_rfq_for_weaver(weaver_id)


async def list_orders_for_weaver(
    *,
    db: AsyncSession | None,
    weaver_id: str,
) -> list[DashboardOrder]:
    if db is None:
        return demo_store.list_orders_for_weaver(weaver_id)
    try:
        product_rows = (
            await db.execute(select(Product.id).where(Product.weaver_id == weaver_id))
        ).scalars().all()
        if not product_rows:
            return []

        products = {
            product.id: product
            for product in (
                await db.execute(select(Product).where(Product.id.in_(product_rows)))
            )
            .scalars()
            .all()
        }
        rows = (
            await db.execute(
                select(Order)
                .where(Order.product_id.in_(product_rows))
                .order_by(Order.date.desc(), Order.created_at.desc())
            )
        ).scalars().all()
        return [_to_order_schema(row, products.get(row.product_id)) for row in rows]
    except Exception:
        return demo_store.list_orders_for_weaver(weaver_id)


async def seller_stats(
    *,
    db: AsyncSession | None,
    weaver_id: str,
) -> DashboardStats:
    if db is None:
        return demo_store.seller_stats(weaver_id)
    try:
        active_skus = (
            await db.scalar(
                select(func.count())
                .select_from(Product)
                .where(Product.weaver_id == weaver_id)
            )
        ) or 0
        product_rows = (
            await db.execute(select(Product.id).where(Product.weaver_id == weaver_id))
        ).scalars().all()
        if not product_rows:
            return DashboardStats(
                month_gmv=0,
                pending_settlement=0,
                open_orders=0,
                active_skus=0,
            )
        orders = (
            await db.execute(select(Order).where(Order.product_id.in_(product_rows)))
        ).scalars().all()
        month_gmv = sum(order.amount for order in orders)
        pending = sum(order.amount for order in orders if order.status != "settled")
        open_orders = sum(1 for order in orders if order.status != "settled")
        return DashboardStats(
            month_gmv=month_gmv,
            pending_settlement=pending,
            open_orders=open_orders,
            active_skus=int(active_skus),
        )
    except Exception:
        return demo_store.seller_stats(weaver_id)
