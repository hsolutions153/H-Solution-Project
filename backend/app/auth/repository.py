# Mock database chứa danh sách người dùng
fake_users_db = []

def get_user_by_email(email: str):
    for user in fake_users_db:
        if user["email"] == email:
            return user
    return None

def create_user(user_data: dict):
    fake_users_db.append(user_data)
    return user_data