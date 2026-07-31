"""expand buyer request and seller quote fields

Revision ID: 20260728_05
Revises: 20260728_04
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_05"
down_revision: str | None = "20260728_04"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("rfqs")
    }
    additions = {
        "contact_email": sa.Column("contact_email", sa.String(length=255)),
        "delivery_pincode": sa.Column("delivery_pincode", sa.String(length=20)),
        "required_by": sa.Column("required_by", sa.Date()),
        "sample_required": sa.Column(
            "sample_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        "accepts_handmade_variation": sa.Column(
            "accepts_handmade_variation",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        "target_budget": sa.Column("target_budget", sa.Integer()),
        "quoted_unit_price": sa.Column("quoted_unit_price", sa.Integer()),
        "production_lead_days": sa.Column("production_lead_days", sa.Integer()),
        "expected_artisan_payout": sa.Column(
            "expected_artisan_payout",
            sa.Integer(),
        ),
        "seller_notes": sa.Column("seller_notes", sa.Text()),
        "quote_valid_until": sa.Column("quote_valid_until", sa.Date()),
    }
    for name, column in additions.items():
        if name not in columns:
            op.add_column("rfqs", column)


def downgrade() -> None:
    for column in (
        "quote_valid_until",
        "seller_notes",
        "expected_artisan_payout",
        "production_lead_days",
        "quoted_unit_price",
        "target_budget",
        "accepts_handmade_variation",
        "sample_required",
        "required_by",
        "delivery_pincode",
        "contact_email",
    ):
        op.drop_column("rfqs", column)
