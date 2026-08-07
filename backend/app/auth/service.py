import secrets

from fastapi import HTTPException, status

from app.auth import repository
from app.auth.utils import create_access_token, hash_password, verify_password

CUSTOMER_ROLE_CODE = "CUSTOMER"


def _generate_user_id() -> str:
    """The SQL schema uses VARCHAR(10) user IDs rather than UUIDs."""
    return secrets.token_hex(5).upper()


def authenticate_user(email: str, password: str):
    user = repository.get_user_by_email(email)
    
    if not user or (isinstance(user, list) and len(user) == 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if isinstance(user, list):
        user = user[0]

    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is locked or inactive")

    role = user.get("role") or {}
    role_id = role.get("id")
    role_code = role.get("code")
    if not role_id or not role_code:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User role is not configured")

    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role_id": role_id, "role": role_code}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role_id": role_id,
        "role": role_code,
        "user": {"id": user["id"], "name": user["full_name"], "phone": user.get("phone")},
    }


def register_customer(data):
    if repository.get_user_by_email(str(data.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if data.phone and repository.get_user_by_phone(data.phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already registered")

    customer_role = repository.get_role_by_code(CUSTOMER_ROLE_CODE)
    if not customer_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CUSTOMER role is not configured",
        )
    
    role_id = customer_role[0]["id"] if isinstance(customer_role, list) else customer_role["id"]

    user_data = {
        "id": _generate_user_id(),
        "role_id": role_id,
        "full_name": data.name,
        "phone": data.phone,
        "email": str(data.email),
        "password_hash": hash_password(data.password),
        "address": data.address,
    }
    new_user = repository.create_user(user_data)
    if not new_user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")
    return {"message": "Registered successfully", "user_id": new_user["id"]}