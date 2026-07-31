"""add truthful product claim lifecycle

Revision ID: 20260728_03
Revises: 20260728_02
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_03"
down_revision: str | None = "20260728_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("products")
    }
    additions = {
        "claim_status": sa.Column(
            "claim_status",
            sa.String(length=40),
            nullable=False,
            server_default="self_declared",
        ),
        "claim_issuer": sa.Column("claim_issuer", sa.String(length=255)),
        "claim_issuer_role": sa.Column(
            "claim_issuer_role",
            sa.String(length=80),
        ),
        "evidence_url": sa.Column("evidence_url", sa.String(length=1000)),
        "verification_method": sa.Column(
            "verification_method",
            sa.String(length=255),
        ),
        "verified_at": sa.Column("verified_at", sa.DateTime(timezone=True)),
        "claim_expires_at": sa.Column(
            "claim_expires_at",
            sa.DateTime(timezone=True),
        ),
    }
    for name, column in additions.items():
        if name not in columns:
            op.add_column("products", column)
    op.execute(
        """
        UPDATE products
        SET claim_status = CASE
            WHEN authenticated THEN 'evidence_submitted'
            ELSE 'self_declared'
        END,
        authenticated = false
        """
    )
    constraints = {
        constraint["name"]
        for constraint in sa.inspect(op.get_bind()).get_check_constraints("products")
    }
    if "ck_products_claim_status" not in constraints:
        op.create_check_constraint(
            "ck_products_claim_status",
            "products",
            """
            claim_status IN (
                'draft',
                'self_declared',
                'evidence_submitted',
                'cooperative_verified',
                'gi_authority_verified',
                'revoked'
            )
            """,
        )


def downgrade() -> None:
    op.drop_constraint("ck_products_claim_status", "products", type_="check")
    op.drop_column("products", "claim_expires_at")
    op.drop_column("products", "verified_at")
    op.drop_column("products", "verification_method")
    op.drop_column("products", "evidence_url")
    op.drop_column("products", "claim_issuer_role")
    op.drop_column("products", "claim_issuer")
    op.drop_column("products", "claim_status")
