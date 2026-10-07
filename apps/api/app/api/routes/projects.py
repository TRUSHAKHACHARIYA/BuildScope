import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUserDep, DbSessionDep
from app.schemas.project import (
    ProjectCreate,
    ProjectList,
    ProjectListParams,
    ProjectRead,
    ProjectUpdate,
)
from app.services.projects import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {"description": "Project not found"}
}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate, user: CurrentUserDep, session: DbSessionDep
) -> ProjectRead:
    return await ProjectService(session).create(body, owner_id=user.id)


@router.get("")
async def list_projects(
    params: Annotated[ProjectListParams, Query()], user: CurrentUserDep, session: DbSessionDep
) -> ProjectList:
    return await ProjectService(session).list(user.id, limit=params.limit, offset=params.offset)


@router.get("/{project_id}", responses=NOT_FOUND)
async def get_project(
    project_id: uuid.UUID, user: CurrentUserDep, session: DbSessionDep
) -> ProjectRead:
    return await ProjectService(session).get(project_id, owner_id=user.id)


@router.patch("/{project_id}", responses=NOT_FOUND)
async def update_project(
    project_id: uuid.UUID, body: ProjectUpdate, user: CurrentUserDep, session: DbSessionDep
) -> ProjectRead:
    return await ProjectService(session).update(project_id, body, owner_id=user.id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, responses=NOT_FOUND)
async def delete_project(
    project_id: uuid.UUID, user: CurrentUserDep, session: DbSessionDep
) -> None:
    await ProjectService(session).delete(project_id, owner_id=user.id)
