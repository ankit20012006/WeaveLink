from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from app.schemas.catalog import (
    DashboardOrder,
    DashboardStats,
    Product,
    ProductCreatePayload,
    RFQ,
    RFQStatus,
    RFQCreatePayload,
    VerificationPayload,
    Weaver,
)

_weavers: list[Weaver] = [
    Weaver(
        id="w-lakshmi",
        name="Lakshmi Devi",
        cluster="Kanchipuram, Tamil Nadu",
        gi="Kanchipuram Silk",
        language="Tamil",
        verified=True,
        photo="https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80",
        years=28,
        bio="Third-generation silk weaver. Works a pit loom with her sister in a two-loom shed behind their home.",
    ),
    Weaver(
        id="w-ramesh",
        name="Ramesh Meher",
        cluster="Sambalpur, Odisha",
        gi="Sambalpuri Ikat",
        language="Odia",
        verified=True,
        photo="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
        years=19,
        bio="Bandha master known for natural indigo resists. Sells with a 12-member SHG cooperative.",
    ),
    Weaver(
        id="w-meena",
        name="Meena Bai",
        cluster="Maheshwar, Madhya Pradesh",
        gi="Maheshwari",
        language="Hindi",
        verified=True,
        photo="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
        years=14,
        bio="Specialises in reversible borders and cotton–silk blends for contemporary wearers.",
    ),
]

_products: list[Product] = [
    Product(
        id="p-kanchi-maroon",
        title="Temple Border Kanchipuram Silk Saree",
        price=18500,
        bulk_price=15200,
        moq=6,
        category="Saree",
        technique="Korvai",
        materials="Mulberry silk, zari",
        loom_type="Pit loom",
        cluster="Kanchipuram",
        gi="Kanchipuram Silk",
        status="available",
        authenticated=True,
        serial="WL-KAN-2026-08421",
        weaver_id="w-lakshmi",
        images=[
            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
            "https://images.unsplash.com/photo-1596704017254-9b121068fb74?w=1200&q=80",
        ],
        story_title="Journey of this saree",
        story=(
            "Lakshmi began this piece after the monsoon harvest. The body is dyed in "
            "madder; the temple border took four days of korvai interlocking so "
            "the contrast never frays. Her grandmother’s motif book still sits "
            "beside the loom."
        ),
        tags=["silk", "bridal", "GI", "authenticated"],
        production_range="May–June 2026",
    ),
    Product(
        id="p-sambal-indigo",
        title="Natural Indigo Sambalpuri Ikat Stole",
        price=4200,
        bulk_price=3400,
        moq=20,
        category="Stole",
        technique="Bandha (ikat)",
        materials="Handspun cotton, natural indigo",
        loom_type="Frame loom",
        cluster="Sambalpur",
        gi="Sambalpuri Ikat",
        status="available",
        authenticated=True,
        serial="WL-SAM-2026-01933",
        weaver_id="w-ramesh",
        images=[
            "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1200&q=80",
            "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=80",
        ],
        story_title="Natural dye process",
        story=(
            "Yarn was tied and dipped seven times in a vat fed by indigo leaves from "
            "Ramesh’s courtyard. The cloud motif is a family signature — each stole "
            "carries a unique tie map photographed into its Digital Product Passport."
        ),
        tags=["indigo", "cotton", "natural dye", "B2B-ready"],
        production_range="April 2026",
    ),
    Product(
        id="p-mahesh-check",
        title="Reversible Maheshwari Cotton–Silk",
        price=6800,
        bulk_price=5400,
        moq=12,
        category="Saree",
        technique="Reversible border",
        materials="Cotton–silk blend",
        loom_type="Fly-shuttle loom",
        cluster="Maheshwar",
        gi="Maheshwari",
        status="in-production",
        authenticated=True,
        serial="WL-MAH-2026-03110",
        weaver_id="w-meena",
        images=[
            "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80",
            "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1200&q=80",
        ],
        story_title="My family loom",
        story=(
            "Meena’s loom faces the Narmada. This check uses a lighter weft for summer "
            "drape; the border reverses cleanly so the saree can be worn two ways — "
            "a quiet innovation she refined with boutique buyers in Indore."
        ),
        tags=["lightweight", "everyday", "verified weaver"],
        production_range="June–July 2026",
    ),
]

_extra_products: list[Product] = [
    Product(
        id="p-kanchi-gold",
        title="Wedding Pallu Kanchipuram",
        price=24500,
        bulk_price=19800,
        moq=4,
        category="Saree",
        technique="Extra-weft brocade",
        materials="Mulberry silk, pure zari",
        loom_type="Pit loom",
        cluster="Kanchipuram",
        gi="Kanchipuram Silk",
        status="available",
        authenticated=True,
        serial="WL-KAN-2026-08488",
        weaver_id="w-lakshmi",
        images=[
            "https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=1200&q=80",
            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
        ],
        story_title="Journey of this saree",
        story=(
            "Commissioned for a Chennai wedding season. The peacock pallu alone took "
            "eleven days. Authenticity serial is NFC-ready for the cooperative’s "
            "premium line."
        ),
        tags=["bridal", "zari", "premium"],
        production_range="March–April 2026",
    ),
    Product(
        id="p-sambal-runner",
        title="Ikat Table Runner Set (pair)",
        price=3100,
        bulk_price=2400,
        moq=30,
        category="Home",
        technique="Bandha",
        materials="Cotton",
        loom_type="Frame loom",
        cluster="Sambalpur",
        gi="Sambalpuri Ikat",
        status="available",
        authenticated=True,
        serial="WL-SAM-2026-02001",
        weaver_id="w-ramesh",
        images=[
            "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
            "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1200&q=80",
        ],
        story_title="Natural dye process",
        story=(
            "Designed for boutique hotels and gifting. Same bandha discipline as apparel — "
            "each runner’s passport logs dye lot and weaver credit for the SHG."
        ),
        tags=["B2B", "gifting", "home"],
        production_range="May 2026",
    ),
    Product(
        id="p-mahesh-dupatta",
        title="Maheshwari Dupatta — River Mist",
        price=2900,
        bulk_price=2200,
        moq=25,
        category="Dupatta",
        technique="Plain weave with border",
        materials="Cotton–silk",
        loom_type="Fly-shuttle loom",
        cluster="Maheshwar",
        gi="Maheshwari",
        status="available",
        authenticated=True,
        serial="WL-MAH-2026-03155",
        weaver_id="w-meena",
        images=[
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=80",
            "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80",
        ],
        story_title="My family loom",
        story=(
            "A lighter piece for everyday wear. Meena records a short voice note in Hindi "
            "for every listing — WeaveLink turns it into a bilingual story buyers can "
            "read or hear."
        ),
        tags=["everyday", "voice-story"],
        production_range="June 2026",
    ),
]

_orders: list[DashboardOrder] = [
    DashboardOrder(
        id="ORD-1042",
        product_id="p-sambal-indigo",
        buyer="Aarohi Design Co.",
        type="B2B",
        amount=68000,
        status="pending",
        date="18 Jul 2026",
    ),
    DashboardOrder(
        id="ORD-1038",
        product_id="p-kanchi-maroon",
        buyer="Priya S.",
        type="B2C",
        amount=18500,
        status="shipped",
        date="16 Jul 2026",
    ),
    DashboardOrder(
        id="ORD-1031",
        product_id="p-sambal-runner",
        buyer="Hotel Indigo Goa",
        type="B2B",
        amount=72000,
        status="settled",
        date="12 Jul 2026",
    ),
    DashboardOrder(
        id="ORD-1029",
        product_id="p-mahesh-dupatta",
        buyer="Neha Kapoor",
        type="B2C",
        amount=2900,
        status="settled",
        date="10 Jul 2026",
    ),
]

_rfqs: list[RFQ] = []
_rfq_sequence = 1


def _normalize_serial(serial: str) -> str:
    return serial.strip().lower()


def list_products(
    *,
    cluster: str | None = None,
    technique: str | None = None,
    category: str | None = None,
    search: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    sort_by: Literal["featured", "price_low_to_high", "price_high_to_low", "name_asc"]
    = "featured",
    authenticated_only: bool = True,
) -> list[Product]:
    products = [*_products, *_extra_products]
    if authenticated_only:
        products = [p for p in products if p.authenticated]
    if search:
        term = search.strip().lower()
        if term:
            products = [
                p
                for p in products
                if term in p.title.lower()
                or term in p.category.lower()
                or term in p.technique.lower()
                or term in p.materials.lower()
                or term in p.cluster.lower()
                or (p.gi is not None and term in p.gi.lower())
                or any(term in tag.lower() for tag in p.tags)
            ]
    if cluster and cluster != "All clusters":
        products = [p for p in products if p.cluster == cluster]
    if technique and technique != "All techniques":
        products = [p for p in products if p.technique == technique]
    if category and category != "All categories":
        products = [p for p in products if p.category == category]
    if min_price is not None:
        products = [p for p in products if p.price >= min_price]
    if max_price is not None:
        products = [p for p in products if p.price <= max_price]

    if sort_by == "price_low_to_high":
        products = sorted(products, key=lambda p: p.price)
    elif sort_by == "price_high_to_low":
        products = sorted(products, key=lambda p: p.price, reverse=True)
    elif sort_by == "name_asc":
        products = sorted(products, key=lambda p: p.title.lower())

    return products


def get_product(product_id: str) -> Product | None:
    for product in [*_products, *_extra_products]:
        if product.id == product_id:
            return product
    return None


def get_product_by_serial(serial: str) -> Product | None:
    normalized = _normalize_serial(serial)
    for product in [*_products, *_extra_products]:
        if _normalize_serial(product.serial) == normalized:
            return product
    return None


def get_weaver(weaver_id: str) -> Weaver | None:
    for weaver in _weavers:
        if weaver.id == weaver_id:
            return weaver
    return None


def list_weavers() -> list[Weaver]:
    return list(_weavers)


def list_products_for_weaver(weaver_id: str) -> list[Product]:
    return [
        product
        for product in [*_products, *_extra_products]
        if product.weaver_id == weaver_id
    ]


def create_product(owner_weaver_id: str, payload: ProductCreatePayload) -> Product:
    """In-memory listing create for demo / no-DATABASE_URL deploys."""
    if get_weaver(owner_weaver_id) is None:
        raise ValueError("Seller not found")

    serial = payload.serial.strip()
    if not serial:
        raise ValueError("Serial is required")

    if get_product_by_serial(serial) is not None:
        raise ValueError("Product serial already exists")

    next_id = f"PRD-{len(_products) + len(_extra_products) + 1:04d}"
    product = Product(
        id=next_id,
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
        authenticated=payload.authenticated,
        serial=serial,
        weaver_id=owner_weaver_id,
        images=list(payload.images or []),
        story=payload.story,
        story_title=payload.story_title,
        tags=list(payload.tags or []),
        production_range=payload.production_range,
    )
    _extra_products.append(product)
    return product


def get_verification(serial: str) -> VerificationPayload | None:
    product = get_product_by_serial(serial)
    if product is None:
        return None
    weaver = get_weaver(product.weaver_id)
    if weaver is None:
        return None

    is_revoked = product.serial.endswith("03155")

    return VerificationPayload(
        product=product,
        weaver=weaver,
        passport_status="revoked" if is_revoked else "valid",
        anchor_hash="0x7a3f…c91e",
        anchor_chain="Polygon-style lightweight anchor",
        anchor_provider="hybrid registry + on-chain hash",
    )


def create_rfq(payload: RFQCreatePayload) -> RFQ:
    global _rfq_sequence

    product = get_product(payload.product_id)
    if product is None:
        raise ValueError("Product not found")

    if payload.quantity < product.moq:
        raise ValueError(f"Minimum order quantity is {product.moq}")

    rfq_id = f"RFQ-{_rfq_sequence:04d}"
    _rfq_sequence += 1

    request = RFQ(
        id=rfq_id,
        product_id=product.id,
        product_title=product.title,
        buyer=payload.buyer,
        quantity=payload.quantity,
        notes=payload.notes,
        estimated_total=product.bulk_price * payload.quantity,
        status="submitted",
        created_at=datetime.now(timezone.utc),
    )
    _rfqs.insert(0, request)
    return request


def update_rfq_status(rfq_id: str, status: RFQStatus) -> RFQ:
    for index, rfq in enumerate(_rfqs):
        if rfq.id != rfq_id:
            continue

        if rfq.status != "submitted":
            raise ValueError("RFQ already processed")

        updated = RFQ(
            id=rfq.id,
            product_id=rfq.product_id,
            product_title=rfq.product_title,
            buyer=rfq.buyer,
            quantity=rfq.quantity,
            notes=rfq.notes,
            estimated_total=rfq.estimated_total,
            status=status,
            created_at=rfq.created_at,
        )
        _rfqs[index] = updated
        return updated

    raise ValueError("RFQ not found")


def list_rfq_for_weaver(weaver_id: str) -> list[RFQ]:
    matching: list[RFQ] = []
    for rfq in _rfqs:
        product = get_product(rfq.product_id)
        if product is None:
            continue
        if product.weaver_id == weaver_id:
            matching.append(rfq)
    return matching


def list_orders_for_weaver(weaver_id: str) -> list[DashboardOrder]:
    visible: list[DashboardOrder] = []
    for order in _orders:
        product = get_product(order.product_id)
        if product is None:
            continue
        if product.weaver_id == weaver_id:
            visible.append(order)
    return visible


def list_seed_orders() -> list[DashboardOrder]:
    return list(_orders)


def seller_stats(weaver_id: str) -> DashboardStats:
    inventory = [p for p in (*_products, *_extra_products) if p.weaver_id == weaver_id]
    weaver_orders = list_orders_for_weaver(weaver_id)
    month_gmv = sum(order.amount for order in weaver_orders)
    pending = sum(order.amount for order in weaver_orders if order.status != "settled")
    open_orders = len([order for order in weaver_orders if order.status != "settled"])
    return DashboardStats(
        month_gmv=month_gmv,
        pending_settlement=pending,
        open_orders=open_orders,
        active_skus=len(inventory),
    )


def list_clusters() -> list[str]:
    all_clusters = {product.cluster for product in [*_products, *_extra_products]}
    ordered = sorted(all_clusters)
    return ["All clusters", *ordered]


def list_techniques() -> list[str]:
    all_techniques = {product.technique for product in [*_products, *_extra_products]}
    ordered = sorted(all_techniques)
    return ["All techniques", *ordered]


def list_categories() -> list[str]:
    all_categories = {product.category for product in [*_products, *_extra_products]}
    ordered = sorted(all_categories)
    return ["All categories", *ordered]


def list_seed_rfqs() -> list[RFQ]:
    return list(_rfqs)
