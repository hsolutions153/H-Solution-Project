# H-Solution - Scooter & Wheelchair Repair Platform (MVP)

H-Solution là nền tảng quản lý và hỗ trợ sửa chữa khẩn cấp (SOS) dành cho các thiết bị hỗ trợ di chuyển (xe lăn, xe scooter điện). Dự án này được phát triển dưới dạng MVP, tập trung tối ưu hóa luồng xử lý sự cố cốt lõi.

---

## 👥 Thành viên & Phân công nhiệm vụ (Team B)

| Thành viên | Vai trò | Nhiệm vụ chính | Công nghệ sử dụng |
| :--- | :--- | :--- | :--- |
| **Tuyên** | Team Lead / BA | Quản lý tiến độ, làm việc với Team A, chuẩn hóa tài liệu API, điều phối luồng nghiệp vụ. | Git Projects, Notion |
| **Cường** | Frontend Developer | Phát triển giao diện Admin Web & Technician App, thiết kế UI Kit đồng bộ. | Next.js, TypeScript, Tailwind CSS |
| **Ly** | Backend Developer | Xây dựng API chung cho toàn bộ hệ thống (gồm cả App của Team A). | Python, FastAPI |
| **Hà** | Database Developer | Thiết kế cấu trúc cơ sở dữ liệu, quản lý lưu trữ hình ảnh chẩn đoán/báo giá. | Supabase PostgreSQL & Storage |

---

## 🛠️ Công nghệ sử dụng (Stack tiêu chuẩn)

Hệ thống tuân thủ nghiêm ngặt khung công nghệ được quy định:
*   **Frontend:** Next.js, TypeScript, Tailwind CSS.
*   **Backend:** Python, FastAPI (Chỉ dùng duy nhất 1 backend chung).
*   **Database & Storage:** Supabase PostgreSQL & Supabase Storage.

---

## 📂 Cấu trúc thư mục dự án

```text
H-Solution-Project/
├── docs/                 # Tài liệu đặc tả và thiết kế hệ thống
│   ├── api-specs.md      # Tài liệu API & cấu trúc Request/Response
│   ├── database-schema.md# Sơ đồ & Tài liệu cơ sở dữ liệu
│   └── git-cheatsheet.md # Hướng dẫn sử dụng Git cho Team
│
├── backend/              # Mã nguồn Backend chung (Ly & Hà)
│   ├── app/              # Chứa các module (Feature-based structure)
│   │   ├── api/          # Khởi tạo API Router
│   │   ├── auth/         # Xác thực người dùng (Đăng ký/Đăng nhập)
│   │   ├── core/         # Cấu hình hệ thống (Settings, Security)
│   │   ├── db/           # Kết nối Supabase & Database
│   │   ├── devices/      # Quản lý thiết bị (Scooter/Xe lăn)
│   │   └── technicians/  # Quản lý kỹ thuật viên
│   ├── main.py           # Điểm chạy chính của server FastAPI
│   └── requirements.txt  # Danh sách thư viện Python
│
├── frontend/             # Mã nguồn Frontend của Team B (Cường)
│   ├── Admin-web/        # Next.js Web App dành cho Quản trị viên
│   └── Technician-app/   # Next.js Web App dành cho Kỹ thuật viên
│
├── .gitignore            # Loại bỏ file rác (node_modules, venv, .env)
└── README.md             # Tài liệu tổng quan dự án
🚀 Hướng dẫn khởi chạy (Getting Started)
1. Khởi chạy Backend (FastAPI)

cd backend
python -m venv venv
.\venv\Scripts\activate  # (Với Windows)
pip install -r requirements.txt
uvicorn app.main:app --reload
API Docs (Swagger UI): http://127.0.0.1:8000/docs

2. Khởi chạy Admin Web

cd frontend/Admin-web
npm install
npm run dev
3. Khởi chạy Technician App

cd frontend/Technician-app
npm install
npm run dev

---
---

### 🇬🇧 Bản Tiếng Anh (English Version - For Ari)

```markdown
# H-Solution - Scooter & Wheelchair Repair Platform (MVP)

H-Solution is a management and emergency repair support platform (SOS) dedicated to mobility devices (wheelchairs, electric scooters). This project is developed as an MVP, focusing on optimizing the core incident resolution flow.

---

## 👥 Team Members & Roles (Team B)

| Member | Role | Main Responsibilities | Technologies Used |
| :--- | :--- | :--- | :--- |
| **Tuyên** | Team Lead / BA | Project management, coordinating with Team A, API documentation standardization, business flow management. | Git Projects, Notion |
| **Cường** | Frontend Developer | Developing Admin Web & Technician App interfaces, designing consistent UI Kits. | Next.js, TypeScript, Tailwind CSS |
| **Ly** | Backend Developer | Building core APIs for the entire system (including Team A's App). | Python, FastAPI |
| **Hà** | Database Developer | Designing database schema, managing diagnostic/quotation image storage. | Supabase PostgreSQL & Storage |

---

## 🛠️ Technology Stack

The system strictly adheres to the defined technology stack:
*   **Frontend:** Next.js, TypeScript, Tailwind CSS.
*   **Backend:** Python, FastAPI (Single unified backend).
*   **Database & Storage:** Supabase PostgreSQL & Supabase Storage.

---

## 📂 Project Structure

```text
H-Solution-Project/
├── docs/                 # System design and specifications
│   ├── api-specs.md      # API documentation & Request/Response structures
│   ├── database-schema.md# Database schema definitions
│   └── git-cheatsheet.md # Git workflow guidelines for the team
│
├── backend/              # Unified Backend source code (Ly & Hà)
│   ├── app/              # Feature-based modules
│   │   ├── api/          # API Routers initialization
│   │   ├── auth/         # User Authentication (Login/Register)
│   │   ├── core/         # System configurations (Settings, Security)
│   │   ├── db/           # Supabase & Database connections
│   │   ├── devices/      # Device Management (Scooters/Wheelchairs)
│   │   └── technicians/  # Technician Management
│   ├── main.py           # FastAPI server entry point
│   └── requirements.txt  # Python dependencies
│
├── frontend/             # Frontend source code (Cường)
│   ├── Admin-web/        # Next.js Web App for Administrators
│   └── Technician-app/   # Next.js Web App for Technicians
│
├── .gitignore            # Ignore system/env files (node_modules, venv, .env)
└── README.md             # Project overview documentation
🚀 Getting Started
1. Running the Backend (FastAPI)

cd backend
python -m venv venv
.\venv\Scripts\activate  # (For Windows)
pip install -r requirements.txt
uvicorn app.main:app --reload
API Docs (Swagger UI): http://127.0.0.1:8000/docs

2. Running the Admin Web


cd frontend/Admin-web
npm install
npm run dev
3. Running the Technician App


cd frontend/Technician-app
npm install
npm run dev