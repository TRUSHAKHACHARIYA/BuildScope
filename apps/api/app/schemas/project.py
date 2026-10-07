import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.models.project import (
    PROJECT_DESCRIPTION_MAX_LENGTH,
    PROJECT_NAME_MAX_LENGTH,
    ProjectStatus,
)

ProjectName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=PROJECT_NAME_MAX_LENGTH)
]
ProjectDescription = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=PROJECT_DESCRIPTION_MAX_LENGTH)
]


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: ProjectName
    description: ProjectDescription | None = None


class ProjectUpdate(BaseModel):
    """Partial update. `status` is managed by the system (research runs), not by clients."""

    model_config = ConfigDict(extra="forbid")

    name: ProjectName | None = None
    description: ProjectDescription | None = None

    @model_validator(mode="after")
    def _require_a_field(self) -> Self:
        if not self.model_fields_set:
            msg = "Provide at least one field to update"
            raise ValueError(msg)
        if "name" in self.model_fields_set and self.name is None:
            msg = "name cannot be null"
            raise ValueError(msg)
        return self


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    status: ProjectStatus
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProjectList(BaseModel):
    items: list[ProjectRead]
    total: int
    limit: int
    offset: int


class ProjectListParams(BaseModel):
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
