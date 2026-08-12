from fastapi import APIRouter, Depends, Query, status

from app.auth.utils import get_current_user

from app.customers.schemas import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerStatusUpdate,
    CustomerUpdate,
)
from app.customers.service import (
    create_customer,
    delete_customer,
    fetch_customer,
    fetch_customers,
    fetch_own_customer,
    require_customer,
    update_customer,
    update_customer_status,
    update_own_customer,
    require_admin,
)

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/me", response_model=CustomerResponse, dependencies=[Depends(require_customer)])
def get_my_customer(current_user: dict = Depends(get_current_user)):
    return fetch_own_customer(current_user)


@router.patch("/me", response_model=CustomerResponse, dependencies=[Depends(require_customer)])
def modify_my_customer(data: CustomerUpdate, current_user: dict = Depends(get_current_user)):
    return update_own_customer(current_user, data)


@router.get("/", response_model=CustomerListResponse, dependencies=[Depends(require_admin)])
def get_customers(
    search: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    return fetch_customers(search, page, limit)


@router.get("/{customer_id}", response_model=CustomerResponse, dependencies=[Depends(require_admin)])
def get_customer(customer_id: str):
    return fetch_customer(customer_id)


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def add_customer(data: CustomerCreate):
    return create_customer(data)


@router.patch("/{customer_id}", response_model=CustomerResponse, dependencies=[Depends(require_admin)])
def modify_customer(customer_id: str, data: CustomerUpdate):
    return update_customer(customer_id, data)


@router.patch("/{customer_id}/status", response_model=CustomerResponse, dependencies=[Depends(require_admin)])
def modify_customer_status(customer_id: str, data: CustomerStatusUpdate):
    return update_customer_status(customer_id, data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def remove_customer(customer_id: str):
    delete_customer(customer_id)
