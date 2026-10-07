"""Project persistence. Every query is scoped to an owner: there is no unscoped lookup."""

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_owner(
        self, owner_id: uuid.UUID, *, limit: int, offset: int
    ) -> tuple[Sequence[Project], int]:
        owned = Project.created_by == owner_id
        total = await self._session.scalar(select(func.count()).select_from(Project).where(owned))
        rows = await self._session.scalars(
            select(Project)
            .where(owned)
            .order_by(Project.created_at.desc(), Project.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return rows.all(), total or 0

    async def get_for_owner(self, project_id: uuid.UUID, owner_id: uuid.UUID) -> Project | None:
        return await self._session.scalar(
            select(Project).where(Project.id == project_id, Project.created_by == owner_id)
        )

    async def add(self, project: Project) -> Project:
        self._session.add(project)
        await self._session.flush()
        await self._session.refresh(project)
        return project

    async def delete(self, project: Project) -> None:
        await self._session.delete(project)
        await self._session.flush()
