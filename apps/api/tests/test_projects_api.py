import uuid
from typing import Any

import httpx2
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.project import Project
from tests.conftest import TokenFactory, UserFactory, bearer

Headers = dict[str, str]


@pytest.fixture
async def owner(make_user: UserFactory) -> User:
    return await make_user(name="Owner")


@pytest.fixture
def owner_headers(owner: User, make_token: TokenFactory) -> Headers:
    return bearer(make_token(owner.id))


@pytest.fixture
async def intruder_headers(make_user: UserFactory, make_token: TokenFactory) -> Headers:
    intruder = await make_user(name="Intruder")
    return bearer(make_token(intruder.id))


async def create(api: httpx2.AsyncClient, headers: Headers, **body: Any) -> dict[str, Any]:
    response = await api.post(
        "/api/v1/projects", json={"name": "HR suite", **body}, headers=headers
    )
    assert response.status_code == 201, response.text
    project: dict[str, Any] = response.json()
    return project


# --- Create ------------------------------------------------------------------------------------


async def test_create_project_defaults_to_draft_and_owner(
    api: httpx2.AsyncClient, owner: User, owner_headers: Headers
) -> None:
    project = await create(api, owner_headers, name="  HR suite  ", description="Payroll + leave")

    assert project["name"] == "HR suite"
    assert project["description"] == "Payroll + leave"
    assert project["status"] == "draft"
    assert project["created_by"] == str(owner.id)
    uuid.UUID(project["id"])
    assert project["created_at"]
    assert project["updated_at"]


async def test_create_persists_to_database(
    api: httpx2.AsyncClient, owner_headers: Headers, db_session: AsyncSession
) -> None:
    project = await create(api, owner_headers)

    stored = await db_session.scalar(select(Project).where(Project.id == uuid.UUID(project["id"])))
    assert stored is not None
    assert stored.name == "HR suite"


async def test_blank_description_is_stored_as_null(
    api: httpx2.AsyncClient, owner_headers: Headers
) -> None:
    project = await create(api, owner_headers, description="   ")

    assert project["description"] is None


@pytest.mark.parametrize(
    "body",
    [
        pytest.param({}, id="missing-name"),
        pytest.param({"name": ""}, id="empty-name"),
        pytest.param({"name": "   "}, id="whitespace-name"),
        pytest.param({"name": "x" * 201}, id="name-too-long"),
        pytest.param({"name": "ok", "description": "x" * 5001}, id="description-too-long"),
        pytest.param({"name": "ok", "status": "completed"}, id="status-not-client-settable"),
        pytest.param({"name": "ok", "created_by": str(uuid.uuid4())}, id="owner-not-settable"),
    ],
)
async def test_create_rejects_invalid_input(
    api: httpx2.AsyncClient, owner_headers: Headers, body: dict[str, Any]
) -> None:
    response = await api.post("/api/v1/projects", json=body, headers=owner_headers)

    assert response.status_code == 422


# --- List --------------------------------------------------------------------------------------


async def test_list_returns_only_own_projects(
    api: httpx2.AsyncClient, owner_headers: Headers, intruder_headers: Headers
) -> None:
    first = await create(api, owner_headers, name="First")
    second = await create(api, owner_headers, name="Second")
    await create(api, intruder_headers, name="Not mine")

    response = await api.get("/api/v1/projects", headers=owner_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    ids = [item["id"] for item in body["items"]]
    assert set(ids) == {first["id"], second["id"]}
    assert all(item["name"] != "Not mine" for item in body["items"])


async def test_list_paginates(api: httpx2.AsyncClient, owner_headers: Headers) -> None:
    for index in range(3):
        await create(api, owner_headers, name=f"Project {index}")

    page = (await api.get("/api/v1/projects?limit=2&offset=2", headers=owner_headers)).json()

    assert page["total"] == 3
    assert page["limit"] == 2
    assert page["offset"] == 2
    assert len(page["items"]) == 1


@pytest.mark.parametrize("query", ["limit=0", "limit=101", "offset=-1", "limit=abc"])
async def test_list_rejects_invalid_pagination(
    api: httpx2.AsyncClient, owner_headers: Headers, query: str
) -> None:
    response = await api.get(f"/api/v1/projects?{query}", headers=owner_headers)

    assert response.status_code == 422


async def test_list_is_empty_for_new_user(api: httpx2.AsyncClient, owner_headers: Headers) -> None:
    body = (await api.get("/api/v1/projects", headers=owner_headers)).json()

    assert body == {"items": [], "total": 0, "limit": 50, "offset": 0}


# --- Get ---------------------------------------------------------------------------------------


async def test_get_own_project(api: httpx2.AsyncClient, owner_headers: Headers) -> None:
    project = await create(api, owner_headers)

    response = await api.get(f"/api/v1/projects/{project['id']}", headers=owner_headers)

    assert response.status_code == 200
    assert response.json() == project


async def test_get_unknown_project_is_404(api: httpx2.AsyncClient, owner_headers: Headers) -> None:
    response = await api.get(f"/api/v1/projects/{uuid.uuid4()}", headers=owner_headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found"}


async def test_get_invalid_project_id_is_422(
    api: httpx2.AsyncClient, owner_headers: Headers
) -> None:
    response = await api.get("/api/v1/projects/not-a-uuid", headers=owner_headers)

    assert response.status_code == 422


# --- Update ------------------------------------------------------------------------------------


async def test_update_name_and_description(api: httpx2.AsyncClient, owner_headers: Headers) -> None:
    project = await create(api, owner_headers, description="old")

    response = await api.patch(
        f"/api/v1/projects/{project['id']}",
        json={"name": "Renamed", "description": "new"},
        headers=owner_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Renamed"
    assert body["description"] == "new"
    assert body["status"] == "draft"


async def test_update_can_clear_description(
    api: httpx2.AsyncClient, owner_headers: Headers
) -> None:
    project = await create(api, owner_headers, description="old")

    response = await api.patch(
        f"/api/v1/projects/{project['id']}", json={"description": None}, headers=owner_headers
    )

    assert response.status_code == 200
    assert response.json()["description"] is None
    assert response.json()["name"] == "HR suite"


@pytest.mark.parametrize(
    "body",
    [
        pytest.param({}, id="empty"),
        pytest.param({"name": None}, id="null-name"),
        pytest.param({"name": ""}, id="empty-name"),
        pytest.param({"status": "completed"}, id="status"),
    ],
)
async def test_update_rejects_invalid_input(
    api: httpx2.AsyncClient, owner_headers: Headers, body: dict[str, Any]
) -> None:
    project = await create(api, owner_headers)

    response = await api.patch(
        f"/api/v1/projects/{project['id']}", json=body, headers=owner_headers
    )

    assert response.status_code == 422


# --- Delete ------------------------------------------------------------------------------------


async def test_delete_own_project(api: httpx2.AsyncClient, owner_headers: Headers) -> None:
    project = await create(api, owner_headers)

    response = await api.delete(f"/api/v1/projects/{project['id']}", headers=owner_headers)

    assert response.status_code == 204
    after = await api.get(f"/api/v1/projects/{project['id']}", headers=owner_headers)
    assert after.status_code == 404


# --- Authorization -----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "body"),
    [("GET", None), ("PATCH", {"name": "Hijacked"}), ("DELETE", None)],
)
async def test_other_users_project_is_not_found(
    api: httpx2.AsyncClient,
    owner_headers: Headers,
    intruder_headers: Headers,
    method: str,
    body: dict[str, str] | None,
) -> None:
    project = await create(api, owner_headers)

    response = await api.request(
        method, f"/api/v1/projects/{project['id']}", json=body, headers=intruder_headers
    )

    assert response.status_code == 404
    unchanged = await api.get(f"/api/v1/projects/{project['id']}", headers=owner_headers)
    assert unchanged.status_code == 200
    assert unchanged.json()["name"] == "HR suite"


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/v1/projects"),
        ("POST", "/api/v1/projects"),
        ("GET", f"/api/v1/projects/{uuid.uuid4()}"),
        ("PATCH", f"/api/v1/projects/{uuid.uuid4()}"),
        ("DELETE", f"/api/v1/projects/{uuid.uuid4()}"),
    ],
)
async def test_every_project_endpoint_requires_authentication(
    api: httpx2.AsyncClient, method: str, path: str
) -> None:
    response = await api.request(method, path, json={"name": "x"})

    assert response.status_code == 401
