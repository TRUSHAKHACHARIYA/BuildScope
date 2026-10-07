"""Project use cases. Authorization rule: a user can only see and change their own projects.
Projects owned by someone else are reported as not found, so their existence is not revealed."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectStatus
from app.repositories.projects import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectList, ProjectRead, ProjectUpdate


class ProjectNotFoundError(Exception):
    pass


class ProjectService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._projects = ProjectRepository(session)

    async def list(self, owner_id: uuid.UUID, *, limit: int, offset: int) -> ProjectList:
        rows, total = await self._projects.list_for_owner(owner_id, limit=limit, offset=offset)
        return ProjectList(
            items=[ProjectRead.model_validate(row) for row in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get(self, project_id: uuid.UUID, owner_id: uuid.UUID) -> ProjectRead:
        return ProjectRead.model_validate(await self._get_owned(project_id, owner_id))

    async def create(self, data: ProjectCreate, owner_id: uuid.UUID) -> ProjectRead:
        project = await self._projects.add(
            Project(
                name=data.name,
                description=data.description or None,
                status=ProjectStatus.DRAFT,
                created_by=owner_id,
            )
        )
        await self._session.commit()
        return ProjectRead.model_validate(project)

    async def update(
        self, project_id: uuid.UUID, data: ProjectUpdate, owner_id: uuid.UUID
    ) -> ProjectRead:
        project = await self._get_owned(project_id, owner_id)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes:
            project.name = changes["name"]
        if "description" in changes:
            project.description = changes["description"] or None
        await self._session.flush()
        await self._session.refresh(project)
        await self._session.commit()
        return ProjectRead.model_validate(project)

    async def delete(self, project_id: uuid.UUID, owner_id: uuid.UUID) -> None:
        project = await self._get_owned(project_id, owner_id)
        await self._projects.delete(project)
        await self._session.commit()

    async def _get_owned(self, project_id: uuid.UUID, owner_id: uuid.UUID) -> Project:
        project = await self._projects.get_for_owner(project_id, owner_id)
        if project is None:
            raise ProjectNotFoundError
        return project
