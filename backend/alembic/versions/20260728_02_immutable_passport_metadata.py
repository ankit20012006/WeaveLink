"""store immutable passport metadata snapshots

Revision ID: 20260728_02
Revises: 20260728_01
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_02"
down_revision: str | None = "20260728_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {
        column["name"]
        for column in inspector.get_columns("passport_anchors")
    }
    if "canonical_record" not in columns:
        op.add_column(
            "passport_anchors",
            sa.Column(
                "canonical_record",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'{}'::json"),
            ),
        )
    if "metadata_snapshot" not in columns:
        op.add_column(
            "passport_anchors",
            sa.Column(
                "metadata_snapshot",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'{}'::json"),
            ),
        )
    if "confirmations" not in columns:
        op.add_column(
            "passport_anchors",
            sa.Column(
                "confirmations",
                sa.Integer(),
                nullable=False,
                server_default="0",
            ),
        )

    constraints = {
        constraint["name"]
        for constraint in inspector.get_check_constraints("passport_anchors")
    }
    if "ck_passport_anchors_status" not in constraints:
        op.create_check_constraint(
            "ck_passport_anchors_status",
            "passport_anchors",
            "status IN ('submitted', 'confirmed', 'failed')",
        )
    if "ck_passport_anchors_chain_id" not in constraints:
        op.create_check_constraint(
            "ck_passport_anchors_chain_id",
            "passport_anchors",
            "chain_id = 11155111",
        )


def downgrade() -> None:
    op.drop_constraint(
        "ck_passport_anchors_chain_id",
        "passport_anchors",
        type_="check",
    )
    op.drop_constraint(
        "ck_passport_anchors_status",
        "passport_anchors",
        type_="check",
    )
    op.drop_column("passport_anchors", "confirmations")
    op.drop_column("passport_anchors", "metadata_snapshot")
    op.drop_column("passport_anchors", "canonical_record")
