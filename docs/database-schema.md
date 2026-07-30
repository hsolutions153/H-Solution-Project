# H-Solution Database Schema (MVP Phase)

**Database Engine:** PostgreSQL (Supabase)
**Last Updated:** 2026-07-31
**Status:** Draft / Pending Review

---

## 📌 ENUM Types Definitions

*   `request_status_enum`: `('PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')` 
    *(Đã bổ sung trạng thái PENDING theo yêu cầu)*

---

## 🗄️ Tables Definition

### 1. Table: `users`
Lưu trữ thông tin người dùng (Khách hàng và Thợ sửa chữa).

| Column Name | Data Type | PK/FK | NULL | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PK | No | `uuid_generate_v4()` | Mã định danh người dùng (Chuẩn Supabase Auth) |
| `phone_number` | VARCHAR(20) | | No | | Số điện thoại đăng nhập |
| `full_name` | VARCHAR(100) | | Yes | NULL | Họ và tên |
| `role_id` | INT | FK -> `roles.id` | No | | Khóa ngoại trỏ tới bảng phân quyền |
| `created_at` | TIMESTAMP | | No | `now()` | Thời gian tạo tài khoản |

### 2. Table: `roles`
Định nghĩa vai trò người dùng trong hệ thống.

| Column Name | Data Type | PK/FK | NULL | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INT | PK | No | Auto Increment | Mã vai trò |
| `role_name` | VARCHAR(50) | | No | | Tên vai trò (VD: ADMIN, TECHNICIAN, CUSTOMER) |

### 3. Table: `auth_tokens`
Quản lý phiên đăng nhập của người dùng.

| Column Name | Data Type | PK/FK | NULL | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PK | No | `uuid_generate_v4()` | Mã token record |
| `user_id` | UUID | FK -> `users.id` | No | | **[FIXED]** Tham chiếu đúng tới bảng users |
| `token_hash` | VARCHAR(255)| | No | | Chuỗi mã hóa token |
| `created_at` | TIMESTAMP | | No | `now()` | Thời gian tạo token |

### 4. Table: `otp_codes`
Quản lý mã OTP gửi qua SMS.

| Column Name | Data Type | PK/FK | NULL | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PK | No | `uuid_generate_v4()` | Mã OTP record |
| `user_id` | UUID | FK -> `users.id` | No | | Tham chiếu người dùng yêu cầu OTP |
| `code` | VARCHAR(6) | | No | | Mã OTP 6 số |
| `expires_at` | TIMESTAMP | | No | | **[FIXED]** Chuyển từ VARCHAR sang TIMESTAMP |
| `is_used` | BOOLEAN | | No | `FALSE` | **[FIXED]** Chuyển từ VARCHAR sang BOOLEAN |

### 5. Table: `repair_requests`
Bảng cốt lõi quản lý luồng cứu hộ xe lăn/scooter.

| Column Name | Data Type | PK/FK | NULL | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PK | No | `uuid_generate_v4()` | Mã đơn cứu hộ |
| `customer_id` | UUID | FK -> `users.id` | No | | Khách hàng đặt yêu cầu |
| `technician_id`| UUID | FK -> `users.id` | Yes | NULL | Thợ nhận đơn (NULL khi mới tạo) |
| `issue_type` | VARCHAR(100)| | No | | **[FIXED]** Đổi tên từ issue-type thành issue_type |
| `status` | ENUM | | No | `'PENDING'` | **[FIXED]** Default chuẩn là PENDING |
| `latitude` | DECIMAL | | No | | Vĩ độ vị trí sự cố |
| `longitude` | DECIMAL | | No | | Kinh độ vị trí sự cố |
| `arrived_at` | TIMESTAMP | | Yes | NULL | **[FIXED]** Cho phép NULL khi thợ chưa đến |
| `cancelled_at` | TIMESTAMP | | Yes | NULL | **[FIXED]** Cho phép NULL khi chưa bị hủy |
| `changed_by` | UUID | FK -> `users.id` | Yes | NULL | **[FIXED]** Kiểu UUID khớp với users.id, ko dùng VARCHAR(1) |
| `created_at` | TIMESTAMP | | No | `now()` | Thời gian tạo đơn |

---

## 🚀 Implementation Status (Tiến độ thực tế trên Backend)
*Theo yêu cầu rà soát từ Leader/Ari*

- [x] **Database Engine:** Đã khởi tạo Supabase PostgreSQL project.
- [ ] **Table Creation:** Đang chờ duyệt thiết kế này để chạy file Migration.
- [ ] **FastAPI Models:** Ly đang thiết lập cấu trúc thư mục, sẽ tạo SQLAlchemy/SQLModel models vào tuần tới sau khi chốt schema.