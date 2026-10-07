from fastapi import APIRouter

from app.api.deps import CurrentUserDep
from app.schemas.user import CurrentUser

router = APIRouter(tags=["users"])


@router.get("/me")
async def read_current_user(user: CurrentUserDep) -> CurrentUser:
    return user
