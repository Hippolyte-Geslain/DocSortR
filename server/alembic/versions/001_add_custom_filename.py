"""add custom_filename to documents

Revision ID: 001_add_custom_filename
Revises:
Create Date: 2026-04-16
"""

from alembic import op
import sqlalchemy as sa

revision = "001_add_custom_filename"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("custom_filename", sa.String(512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "custom_filename")
