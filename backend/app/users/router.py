from fastapi import APIRouter, Depends, Query, status

from app.auth.utils import get_current_user
from app.users.schemas import (
    RoleListResponse,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserStatusUpdate,
    UserUpdate,
)
from app.users.service import (
    create_user,
    delete_user,
    fetch_roles,
    fetch_user,
    fetch_users,
    require_admin,
    update_user,
    update_user_status,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/roles", response_model=RoleListResponse, dependencies=[Depends(require_admin)])
def get_roles():
    return fetch_roles()


@router.get("", response_model=UserListResponse, dependencies=[Depends(require_admin)])
@router.get("/", response_model=UserListResponse, dependencies=[Depends(require_admin)], include_in_schema=False)
def get_users(
    search: str | None = Query(default=None, max_length=100),
    role_id: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    return fetch_users(search, role_id, is_active, page, limit)


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin)])
def get_user(user_id: str):
    return fetch_user(user_id)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)], include_in_schema=False)
def add_user(data: UserCreate):
    return create_user(data)


@router.patch("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin)])
def modify_user(user_id: str, data: UserUpdate, current_user: dict = Depends(get_current_user)):
    return update_user(user_id, current_user, data)


@router.patch("/{user_id}/status", response_model=UserResponse, dependencies=[Depends(require_admin)])
def modify_user_status(user_id: str, data: UserStatusUpdate, current_user: dict = Depends(get_current_user)):
    return update_user_status(user_id, current_user, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def remove_user(user_id: str, current_user: dict = Depends(get_current_user)):
    delete_user(user_id, current_user)
