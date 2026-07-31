from app.auth.repository import get_user_by_email, create_user
from fastapi import HTTPException, status

# Hàm băm mật khẩu 
def hash_password(password: str) -> str:
    return "hashed_" + password

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hashed_password == "hashed_" + plain_password

def register_user(user_data):
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role
    }
    create_user(new_user)
    return {"message": "User registered successfully", "email": new_user["email"]}

def authenticate_user(form_data):
    user = get_user_by_email(form_data.email)
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Tạo token giả lập trả về cho client
    fake_token = f"fake-jwt-token-for-{user['email']}"
    return {
        "access_token": fake_token,
        "token_type": "bearer",
        "role": user["role"],
        "full_name": user["full_name"]
    }