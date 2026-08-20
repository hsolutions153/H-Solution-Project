# Scooter Repair Platform – Project Functions

## 1. Tổng quan

**Scooter Repair Platform** là nền tảng quản lý quy trình sửa chữa và vòng đời thiết bị hỗ trợ di chuyển điện, tập trung vào:

- Xe lăn điện
- Xe tay ga hỗ trợ / mobility scooter
- Các thiết bị hỗ trợ di chuyển khác trong tương lai

Nền tảng kết nối ba nhóm người dùng chính:

- **CUSTOMER** – Khách hàng
- **ADMIN** – Quản trị viên
- **TECHNICIAN** – Kỹ thuật viên

Quy ước API hiện tại:

- **Base URL:** `/api/v1`
- **Format:** JSON
- **Authentication:** Bearer Token
- **Header:** `Authorization: Bearer <token>`

---

# 2. Nhóm chức năng chính

Dự án MVP hiện tại có 7 nhóm chức năng chính:

1. Authentication
2. Device Management
3. Repair Requests & SOS
4. Assignments
5. Diagnosis & Estimates
6. Completion & Repair History
7. Admin Management

Tổng cộng hiện có **18 API** được định nghĩa trong API Contract MVP.

---

# 3. Authentication

## 3.1. Đăng nhập

Cho phép Customer, Admin và Technician đăng nhập vào hệ thống.

**API**

```http
POST /api/v1/auth/login
```

**Request**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response**

```json
{
  "access_token": "token",
  "role": "CUSTOMER",
  "user": {
    "id": "uuid",
    "name": "string",
    "phone": "string"
  }
}
```

**Roles**

- `CUSTOMER`
- `ADMIN`
- `TECHNICIAN`

---

## 3.2. Đăng ký tài khoản Customer

Cho phép khách hàng tạo tài khoản mới.

**API**

```http
POST /api/v1/auth/signup
```

**Request**

```json
{
  "name": "string",
  "phone": "string",
  "email": "string",
  "password": "string",
  "address": "string"
}
```

---

# 4. Device Management

## 4.1. Thêm thiết bị

Customer đăng ký thiết bị thuộc sở hữu của mình.

**API**

```http
POST /api/v1/devices/
```

**Request**

```json
{
  "customer_id": "uuid",
  "device_name": "string",
  "model": "string",
  "serial_number": "string",
  "notes": "string"
}
```

---

## 4.2. Xem danh sách thiết bị của Customer

**API**

```http
GET /api/v1/devices/customer/{id}
```

**Query Parameters**

- `page`
- `limit`

Một Customer có thể sở hữu nhiều thiết bị.

```text
Customer
├── Device 1
├── Device 2
└── Device 3
```

---

# 5. Repair Requests & SOS

Đây là module trung tâm của hệ thống.

## 5.1. Tạo yêu cầu sửa chữa

Customer có thể tạo yêu cầu sửa chữa thông thường hoặc SOS.

**API**

```http
POST /api/v1/repair-requests/
```

**Request**

```json
{
  "customer_id": "uuid",
  "device_id": "uuid",
  "request_type": "SOS",
  "issue_description": "string",
  "address": "string",
  "images": ["url1"],
  "scheduled_date": "YYYY-MM-DD"
}
```

**Request Types**

- `NORMAL`
- `SOS`

Yêu cầu mới có trạng thái:

```text
REQUESTED
```

---

## 5.2. Xem danh sách Repair Request

Admin và Technician có thể xem danh sách yêu cầu sửa chữa.

**API**

```http
GET /api/v1/repair-requests/
```

**Filters**

- `status`
- `type`
- `technician_id`
- `customer_id`

---

## 5.3. Xem chi tiết Repair Request

**API**

```http
GET /api/v1/repair-requests/{id}
```

Chi tiết có thể bao gồm:

```text
Repair Request
├── Customer
├── Device
├── Technician
└── Timeline
```

---

## 5.4. Admin xác nhận hoặc hủy yêu cầu

**API**

```http
PATCH /api/v1/repair-requests/{id}/status
```

**Request**

```json
{
  "status": "CONFIRMED",
  "reason": "string"
}
```

**Allowed Status**

- `CONFIRMED`
- `CANCELLED`

---

# 6. Assignments

Module dùng để phân công kỹ thuật viên xử lý yêu cầu sửa chữa.

## 6.1. Admin phân công Technician

**API**

```http
POST /api/v1/assignments/
```

**Request**

```json
{
  "request_id": "uuid",
  "technician_id": "uuid"
}
```

Sau khi phân công:

```text
Repair Request
      ↓
   ASSIGNED
      ↓
Technician
```

---

## 6.2. Technician xem danh sách công việc

**API**

```http
GET /api/v1/assignments/technician/{id}
```

**Query**

- `status`

---

## 6.3. Technician cập nhật trạng thái di chuyển

**API**

```http
PATCH /api/v1/assignments/{id}/status
```

**Các trạng thái**

```text
ACCEPTED
    ↓
EN_ROUTE
    ↓
ARRIVED
```

---

# 7. Diagnosis & Estimates

## 7.1. Ghi nhận kết quả chẩn đoán

Technician ghi lại tình trạng thiết bị sau khi kiểm tra.

**API**

```http
POST /api/v1/diagnoses/
```

**Request**

```json
{
  "request_id": "uuid",
  "diagnosis_content": "string",
  "repairable_at_site": true,
  "before_images": ["url1"]
}
```

Trạng thái liên quan:

```text
DIAGNOSING
```

---

## 7.2. Tạo báo giá

Technician tạo báo giá sau khi chẩn đoán.

**API**

```http
POST /api/v1/estimates/
```

**Request**

```json
{
  "request_id": "uuid",
  "spare_parts": [
    {
      "name": "Bánh",
      "price": 200000,
      "qty": 1
    }
  ],
  "labor_cost": 100000
}
```

Backend tính:

```text
Tổng tiền phụ tùng
+
Chi phí nhân công
=
Total Amount
```

Sau khi gửi báo giá:

```text
WAITING_FOR_APPROVAL
```

---

## 7.3. Customer duyệt hoặc từ chối báo giá

**API**

```http
PATCH /api/v1/estimates/{id}/approval
```

**Request**

```json
{
  "action": "APPROVE",
  "rejection_reason": null
}
```

**Actions**

- `APPROVE`
- `REJECT`

**Kết quả**

- `ESTIMATE_APPROVED`
- `ESTIMATE_REJECTED`

---

# 8. Completion & Repair History

## 8.1. Technician xác nhận hoàn tất sửa chữa

**API**

```http
POST /api/v1/completions/
```

**Request**

```json
{
  "request_id": "uuid",
  "repair_details": "string",
  "after_images": ["url1"],
  "final_cost": 300000
}
```

Luồng:

```text
REPAIRING
    ↓
COMPLETED
```

---

## 8.2. Xem lịch sử sửa chữa

**API**

```http
GET /api/v1/repair-history/
```

**Filters**

- `customer_id`
- `device_id`

Lịch sử sửa chữa giúp hình thành dữ liệu vòng đời của thiết bị.

```text
Device
├── Repair #1
├── Repair #2
├── Repair #3
└── ...
```

---

# 9. Admin Management

## 9.1. Quản lý danh sách Customer

**API**

```http
GET /api/v1/customers/
```

**Query**

- `search`
- `page`
- `limit`

Thông tin có thể bao gồm:

- `customer_id`
- `name`
- `phone`
- `total_devices`

---

## 9.2. Quản lý danh sách Technician

**API**

```http
GET /api/v1/technicians/
```

**Filter**

- `AVAILABLE`
- `BUSY`

---

# 10. Danh sách toàn bộ API

| # | Method | Endpoint | Chức năng |
|---|---|---|---|
| 1 | POST | `/auth/login` | Đăng nhập |
| 2 | POST | `/auth/signup` | Đăng ký Customer |
| 3 | POST | `/devices/` | Thêm thiết bị |
| 4 | GET | `/devices/customer/{id}` | Lấy thiết bị của Customer |
| 5 | POST | `/repair-requests/` | Tạo yêu cầu sửa chữa |
| 6 | GET | `/repair-requests/` | Lấy danh sách yêu cầu |
| 7 | GET | `/repair-requests/{id}` | Xem chi tiết yêu cầu |
| 8 | PATCH | `/repair-requests/{id}/status` | Xác nhận / hủy request |
| 9 | POST | `/assignments/` | Phân công Technician |
| 10 | GET | `/assignments/technician/{id}` | Lấy task của Technician |
| 11 | PATCH | `/assignments/{id}/status` | Technician cập nhật trạng thái |
| 12 | POST | `/diagnoses/` | Ghi nhận chẩn đoán |
| 13 | POST | `/estimates/` | Tạo báo giá |
| 14 | PATCH | `/estimates/{id}/approval` | Customer duyệt báo giá |
| 15 | POST | `/completions/` | Xác nhận hoàn tất sửa chữa |
| 16 | GET | `/repair-history/` | Xem lịch sử sửa chữa |
| 17 | GET | `/customers/` | Quản lý Customer |
| 18 | GET | `/technicians/` | Quản lý Technician |

> Tất cả endpoint trên đều sử dụng prefix `/api/v1`.

---

# 11. Chức năng theo từng Role

## CUSTOMER

- Đăng ký
- Đăng nhập
- Thêm thiết bị
- Xem danh sách thiết bị
- Tạo yêu cầu sửa chữa NORMAL
- Tạo yêu cầu SOS
- Xem chi tiết yêu cầu
- Theo dõi tiến trình sửa chữa
- Duyệt báo giá
- Từ chối báo giá
- Xem lịch sử sửa chữa

---

## TECHNICIAN

- Đăng nhập
- Xem công việc được giao
- Chấp nhận công việc
- Cập nhật `EN_ROUTE`
- Cập nhật `ARRIVED`
- Chẩn đoán thiết bị
- Ghi nội dung chẩn đoán
- Upload ảnh trước sửa chữa
- Tạo báo giá
- Khai báo phụ tùng
- Khai báo chi phí nhân công
- Thực hiện sửa chữa
- Upload ảnh sau sửa chữa
- Xác nhận hoàn thành

---

## ADMIN

- Đăng nhập
- Xem tất cả Repair Request
- Filter Repair Request
- Xem chi tiết Repair Request
- Xác nhận request
- Hủy request
- Phân công Technician
- Quản lý Customer
- Quản lý Technician

---

# 12. Repair Request Status

Các trạng thái được định nghĩa trong API Contract:

```text
REQUESTED
CONFIRMED
ASSIGNED
ACCEPTED
EN_ROUTE
ARRIVED
DIAGNOSING
ESTIMATE_SUBMITTED
WAITING_FOR_APPROVAL
ESTIMATE_APPROVED
ESTIMATE_REJECTED
REPAIRING
COMPLETED
CANCELLED
```

---

# 13. Business Rule quan trọng

Backend phải chặn kỹ thuật viên chuyển sang:

```text
REPAIRING
```

nếu báo giá chưa ở trạng thái:

```text
ESTIMATE_APPROVED
```

Luồng hợp lệ:

```text
WAITING_FOR_APPROVAL
        ↓
ESTIMATE_APPROVED
        ↓
    REPAIRING
```

Luồng không hợp lệ:

```text
WAITING_FOR_APPROVAL
        ↓
    REPAIRING
        ❌
```

Business rule này phải được validate ở Backend, không chỉ kiểm soát bằng giao diện Frontend.

---

# 14. Workflow tổng thể của hệ thống

```text
CUSTOMER
   │
   ├── Signup
   │
   └── Login
        ↓
Add Device
        ↓
Create Repair Request
        ↓
REQUESTED
        ↓
ADMIN
        ↓
Confirm
        ↓
CONFIRMED
        ↓
Assign Technician
        ↓
ASSIGNED
        ↓
TECHNICIAN
        ↓
ACCEPTED
        ↓
EN_ROUTE
        ↓
ARRIVED
        ↓
Diagnosis
        ↓
DIAGNOSING
        ↓
Create Estimate
        ↓
WAITING_FOR_APPROVAL
        ↓
CUSTOMER
      ↙     ↘
 REJECT    APPROVE
   ↓          ↓
ESTIMATE_   ESTIMATE_
REJECTED    APPROVED
               ↓
          Technician Repair
               ↓
           REPAIRING
               ↓
           Completion
               ↓
           COMPLETED
               ↓
         Repair History
```

---

# 15. Các chức năng chưa được API Contract MVP định nghĩa

Các chức năng dưới đây **chưa có API chính thức trong tài liệu MVP hiện tại**:

- Quên mật khẩu
- Reset mật khẩu
- Refresh Token
- Logout
- CRUD đầy đủ Customer
- CRUD đầy đủ Technician
- Sửa thiết bị
- Xóa thiết bị
- Thanh toán
- Hoàn tiền
- Notification
- Chat
- Upload file API riêng
- Quản lý phụ tùng đầy đủ
- Marketplace thiết bị cũ
- Bản đồ trung tâm sửa chữa
- Reminder bảo trì
- Dashboard dữ liệu

Các chức năng trên chỉ nên được bổ sung khi có API Contract hoặc yêu cầu nghiệp vụ mới được thống nhất.
