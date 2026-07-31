"""add original evidence media and secure storage bucket

Revision ID: 20260728_04
Revises: 20260728_03
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_04"
down_revision: str | None = "20260728_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("products")
    }
    if "original_audio_url" not in columns:
        op.add_column(
            "products",
            sa.Column("original_audio_url", sa.String(length=1000)),
        )

    op.execute(
        """
        INSERT INTO storage.buckets (
            id, name, public, file_size_limit, allowed_mime_types
        )
        VALUES (
            'product-media',
            'product-media',
            true,
            20971520,
            ARRAY[
                'image/jpeg',
                'image/png',
                'image/webp',
                'audio/webm',
                'audio/ogg',
                'audio/mpeg'
            ]
        )
        ON CONFLICT (id) DO UPDATE SET
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = 'storage'
                AND tablename = 'objects'
                AND policyname = 'weavelink_seller_upload'
            ) THEN
                CREATE POLICY weavelink_seller_upload
                ON storage.objects FOR INSERT TO authenticated
                WITH CHECK (
                    bucket_id = 'product-media'
                    AND (storage.foldername(name))[1] = auth.uid()::text
                );
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.drop_column("products", "original_audio_url")
