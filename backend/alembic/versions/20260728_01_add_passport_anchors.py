"""add passport anchors

Revision ID: 20260728_01
Revises:
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_01"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _secure_passport_table() -> None:
    op.execute("ALTER TABLE passport_anchors ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON TABLE passport_anchors FROM anon;
            END IF;
            IF EXISTS (
                SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'
            ) THEN
                REVOKE ALL ON TABLE passport_anchors FROM authenticated;
            END IF;
        END
        $$;
        """
    )


def upgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())
    if "products" not in existing_tables:
        import app.db.models  # noqa: F401
        from app.db.base import Base

        Base.metadata.create_all(bind=bind)
        existing_tables = set(sa.inspect(bind).get_table_names())

    if "passport_anchors" in existing_tables:
        _secure_passport_table()
        return

    op.create_table(
        "passport_anchors",
        sa.Column("product_id", sa.String(length=64), nullable=False),
        sa.Column("record_hash", sa.String(length=66), nullable=False),
        sa.Column("chain_id", sa.Integer(), nullable=False),
        sa.Column("network", sa.String(length=40), nullable=False),
        sa.Column("contract_address", sa.String(length=42), nullable=False),
        sa.Column("recipient_address", sa.String(length=42), nullable=False),
        sa.Column("signer_address", sa.String(length=42), nullable=False),
        sa.Column("token_id", sa.BigInteger(), nullable=True),
        sa.Column("token_uri", sa.String(length=1000), nullable=False),
        sa.Column("transaction_hash", sa.String(length=66), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("block_number", sa.BigInteger(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_passport_anchors_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "product_id",
            name=op.f("pk_passport_anchors"),
        ),
        sa.UniqueConstraint(
            "record_hash",
            name=op.f("uq_passport_anchors_record_hash"),
        ),
        sa.UniqueConstraint(
            "transaction_hash",
            name=op.f("uq_passport_anchors_transaction_hash"),
        ),
    )
    _secure_passport_table()


def downgrade() -> None:
    op.drop_table("passport_anchors")
