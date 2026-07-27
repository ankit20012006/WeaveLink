from __future__ import annotations

from datetime import date as date_type
from datetime import datetime
from datetime import timezone
from datetime import timedelta

from sqlalchemy import func, select

from app.core.config import settings
from app.db.base import Base
from app.db.models import Order, Product, RFQ, UserProfile, Weaver
from app.db.session import SessionLocal, engine
from app.services import demo_store


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_order_date(value: str) -> date_type:
    try:
        return datetime.strptime(value, "%d %b %Y").date()
    except ValueError:
        return datetime.now(tz=timezone.utc).date()


async def bootstrap_catalog_schema_and_seed() -> None:
    if SessionLocal is None or engine is None:
        return

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    if not settings.demo_seed_enabled:
        return

    async with SessionLocal() as session:
        existing = (await session.scalar(select(func.count()).select_from(Weaver))) or 0
        if existing:
            return

        now = _utcnow()

        for item in demo_store.list_weavers():
            session.add(
                Weaver(
                    id=item.id,
                    name=item.name,
                    cluster=item.cluster,
                    gi=item.gi,
                    language=item.language,
                    verified=item.verified,
                    photo=item.photo,
                    years=item.years,
                    bio=item.bio,
                    created_at=now,
                    updated_at=now,
                )
            )
            session.add(
                UserProfile(
                    user_id=item.id,
                    email=f"{item.id}@example.local",
                    display_name=item.name,
                    role="weaver",
                    weaver_id=item.id,
                    verified=item.verified,
                    created_at=now,
                    updated_at=now,
                )
            )

        await session.flush()

        for item in demo_store.list_products(authenticated_only=False):
            session.add(
                Product(
                    id=item.id,
                    title=item.title,
                    price=item.price,
                    bulk_price=item.bulk_price,
                    moq=item.moq,
                    category=item.category,
                    technique=item.technique,
                    materials=item.materials,
                    loom_type=item.loom_type,
                    cluster=item.cluster,
                    gi=item.gi,
                    status=item.status,
                    authenticated=item.authenticated,
                    serial=item.serial,
                    weaver_id=item.weaver_id,
                    images=list(item.images),
                    story=item.story,
                    story_title=item.story_title,
                    tags=list(item.tags),
                    production_range=item.production_range,
                    created_at=now,
                    updated_at=now,
                )
            )

        for item in demo_store.list_seed_orders():
            session.add(
                Order(
                    id=item.id,
                    product_id=item.product_id,
                    buyer=item.buyer,
                    order_type=item.type,
                    amount=item.amount,
                    status=item.status,
                    date=_parse_order_date(item.date),
                    created_at=now - timedelta(days=1),
                    updated_at=now - timedelta(days=1),
                )
            )

        for item in demo_store.list_seed_rfqs():
            product = demo_store.get_product(item.product_id)
            session.add(
                RFQ(
                    id=item.id,
                    product_id=item.product_id,
                    product_title=product.title if product else "",
                    buyer=item.buyer,
                    quantity=item.quantity,
                    notes=item.notes,
                    estimated_total=item.estimated_total,
                    status=item.status,
                    created_at=_utcnow(),
                    updated_at=_utcnow(),
                )
            )

        await session.commit()
