import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

PROJECT_NAME_MAX_LENGTH = 200
PROJECT_DESCRIPTION_MAX_LENGTH = 5000


class ProjectStatus(enum.StrEnum):
    DRAFT = "draft"
    RESEARCHING = "researching"
    COMPLETED = "completed"
    FAILED = "failed"


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        # Serves the owner's project list, newest first.
        Index("ix_projects_created_by_created_at", "created_by", "created_at"),
    )

    name: Mapped[str] = mapped_column(String(PROJECT_NAME_MAX_LENGTH), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(
            ProjectStatus,
            name="project_status",
            values_callable=lambda members: [member.value for member in members],
        ),
        nullable=False,
        default=ProjectStatus.DRAFT,
        server_default=ProjectStatus.DRAFT.value,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
