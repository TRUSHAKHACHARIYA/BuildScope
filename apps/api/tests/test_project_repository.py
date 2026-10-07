import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectStatus
from app.repositories.projects import ProjectRepository
from tests.conftest import UserFactory


async def test_status_defaults_to_draft_in_database(
    db_session: AsyncSession, make_user: UserFactory
) -> None:
    user = await make_user()

    project = await ProjectRepository(db_session).add(Project(name="P", created_by=user.id))

    assert project.status is ProjectStatus.DRAFT


async def test_deleting_user_cascades_to_projects(
    db_session: AsyncSession, make_user: UserFactory
) -> None:
    user = await make_user()
    await ProjectRepository(db_session).add(Project(name="P", created_by=user.id))

    await db_session.delete(user)
    await db_session.flush()

    remaining = await db_session.scalars(select(Project).where(Project.created_by == user.id))
    assert remaining.all() == []


async def test_project_requires_existing_owner(db_session: AsyncSession) -> None:
    with pytest.raises(IntegrityError):
        await ProjectRepository(db_session).add(Project(name="P", created_by=uuid.uuid4()))


async def test_user_email_is_unique(db_session: AsyncSession, make_user: UserFactory) -> None:
    await make_user(email="dup@example.com")

    with pytest.raises(IntegrityError):
        await make_user(email="dup@example.com")
