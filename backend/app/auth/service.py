from fastapi import HTTPException, status
from app.auth import repository
from app.auth.utils import verify_password, create_access_token, hash_password

def authenticate_user(email: str, password: str):
    user = repository.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # Kiểm tra mật khẩu đã hash
    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is locked or inactive",
        )
    
    # Tạo JWT token chứa thông tin định danh
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user["id"],
        "full_name": user["full_name"],
        "role": user.get("roles")
    }

def register_user(data: dict):
    # Kiểm tra xem email đã tồn tại chưa
    existing_user = repository.get_user_by_email(data["email"])
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Mã hóa mật khẩu trước khi lưu
    data["password_hash"] = hash_password(data["password_hash"])
    
    # Tạo user mới qua repository
    new_user = repository.create_user(data)
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    return {"message": "User registered successfully", "user_id": new_user["id"]}