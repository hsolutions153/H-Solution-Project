from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.auth.utils import get_current_user
from app.technicians.schemas import (
    BankAccountResponse,
    BankAccountUpsert,
    TechnicianCreate,
    TechnicianKycReview,
    TechnicianPresenceUpdate,
    TechnicianResponse,
    TechnicianSelfUpdate,
    TechnicianUpdate,
)
from app.technicians.service import (
    create_technician,
    delete_my_bank_account,
    delete_technician,
    fetch_all_technicians,
    fetch_my_technician,
    fetch_technician_by_user_id,
    require_admin,
    require_technician,
    review_technician_kyc,
    update_my_presence,
    update_technician,
    upload_my_avatar,
    upsert_my_bank_account,
)

router = APIRouter(prefix="/technicians", tags=["Technicians"])


@router.get("/me", response_model=TechnicianResponse, dependencies=[Depends(require_technician)])
def get_my_technician(current_user: dict = Depends(get_current_user)):
    return fetch_my_technician(current_user)


@router.put("/me", response_model=TechnicianResponse, dependencies=[Depends(require_technician)])
@router.patch("/me", response_model=TechnicianResponse, dependencies=[Depends(require_technician)])
def update_my_profile(data: TechnicianSelfUpdate, current_user: dict = Depends(get_current_user)):
    return update_technician(current_user["sub"], data)


# STK ngân hàng KTV

@router.put(
    "/me/bank-account",
    response_model=BankAccountResponse,
    dependencies=[Depends(require_technician)],
    summary="Thêm hoặc cập nhật STK ngân hàng của bản thân",
)
def put_my_bank_account(
    data: BankAccountUpsert,
    current_user: dict = Depends(get_current_user),
):
    return upsert_my_bank_account(current_user, data)


@router.delete(
    "/me/bank-account",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_technician)],
    summary="Xóa STK ngân hàng của bản thân",
)
def delete_my_bank_account_route(current_user: dict = Depends(get_current_user)):
    delete_my_bank_account(current_user)


@router.post("/me/avatar", response_model=TechnicianResponse, dependencies=[Depends(require_technician)])
def upload_my_technician_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    return upload_my_avatar(current_user, file)


@router.patch("/me/presence", response_model=TechnicianResponse, dependencies=[Depends(require_technician)])
def modify_my_presence(data: TechnicianPresenceUpdate, current_user: dict = Depends(get_current_user)):
    return update_my_presence(current_user, data)


@router.get("", response_model=list[TechnicianResponse], dependencies=[Depends(require_admin)])
@router.get("/", response_model=list[TechnicianResponse], dependencies=[Depends(require_admin)], include_in_schema=False)
def get_technicians(kyc_status: str | None = Query(default=None)):
    return fetch_all_technicians(kyc_status)


@router.get("/{user_id}", response_model=TechnicianResponse, dependencies=[Depends(require_admin)])
def get_technician(user_id: str):
    return fetch_technician_by_user_id(user_id)


@router.post("", response_model=TechnicianResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
@router.post("/", response_model=TechnicianResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)], include_in_schema=False)
def add_technician(data: TechnicianCreate):
    return create_technician(data)


@router.put("/{user_id}", response_model=TechnicianResponse, dependencies=[Depends(require_admin)])
@router.patch("/{user_id}", response_model=TechnicianResponse, dependencies=[Depends(require_admin)])
def modify_technician(user_id: str, data: TechnicianUpdate):
    return update_technician(user_id, data)


@router.patch("/{user_id}/kyc", response_model=TechnicianResponse, dependencies=[Depends(require_admin)])
def review_kyc(user_id: str, data: TechnicianKycReview, current_user: dict = Depends(get_current_user)):
    return review_technician_kyc(user_id, data, current_user["sub"])


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def remove_technician(user_id: str):
    delete_technician(user_id)
