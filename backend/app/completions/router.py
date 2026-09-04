from fastapi import APIRouter, Depends, status

from app.auth.utils import get_current_user
from app.completions.schemas import CompletionCreate, CompletionResponse
from app.completions.service import confirm_completion

router = APIRouter(prefix="/completions", tags=["Completions"])


@router.post("", response_model=CompletionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CompletionResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def complete_repair(data: CompletionCreate, current_user: dict = Depends(get_current_user)):
    return confirm_completion(current_user, data)
