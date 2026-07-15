# H-Solution - Scooter & Wheelchair Repair Platform (MVP)

H-Solution là nền tảng quản lý và hỗ trợ sửa chữa khẩn cấp (SOS) dành cho các thiết bị hỗ trợ di chuyển (xe lăn, xe scooter điện)[cite: 2]. Dự án này được phát triển dưới dạng MVP tập trung vào luồng xử lý sự cố cốt lõi[cite: 2].

---

## 👥 Thành viên & Phân công nhiệm vụ (Team B)

| Thành viên | Vai trò | Nhiệm vụ chính | Công nghệ sử dụng |
| :--- | :--- | :--- | :--- |
| **Tuyên** | Team Lead / BA | Quản lý tiến độ, làm việc với Team A, chuẩn hóa tài liệu API, điều phối luồng nghiệp vụ[cite: 1]. | Git Projects, Notion |
| **Cường** | Frontend Developer | Phát triển giao diện Admin Web & Technician App, thiết kế UI Kit đồng bộ[cite: 1]. | Next.js, TypeScript, Tailwind CSS |
| **Ly** | Backend Developer | Xây dựng API chung cho toàn bộ hệ thống (gồm cả App của Team A). | Python, FastAPI |
| **Hà** | Database Developer | Thiết kế cấu trúc cơ sở dữ liệu, quản lý lưu trữ hình ảnh chẩn đoán/báo giá. | Supabase PostgreSQL & Storage |

---

## 🛠️ Công nghệ sử dụng (Stack tiêu chuẩn)
Hệ thống tuân thủ nghiêm ngặt khung công nghệ được quy định, không tự ý thêm công nghệ khác:
- **Frontend:** Next.js, TypeScript, Tailwind CSS.
- **Backend:** Python, FastAPI (Chỉ dùng duy nhất 1 backend chung).
- **Database & Storage:** Supabase PostgreSQL & Supabase Storage.

---

## 📂 Cấu trúc thư mục dự án (Team B Repository)

```text
H-Solution-Project/
├── docs/                 # Tài liệu đặc tả và thiết kế hệ thống
│   ├── api-specs/        # Danh sách API & cấu trúc Request/Response
│   ├── ui-guidelines/    # UI Kit (Font Glacier Light, mã màu xanh dương, nút bấm bo góc)[cite: 1]
│   └── flows/            # Luồng User Flow của Admin và Kỹ thuật viên
│
├── backend/              # Mã nguồn Backend chung (Phụ trách bởi Ly & Hà)
│   └── app/              # Theo cấu trúc chuẩn hóa từng module
│       ├── main.py       # Điểm chạy chính của server FastAPI
│       ├── auth/         # Module xác thực người dùng (Đăng ký/Đăng nhập)
│       ├── repair_requests/ # Quản lý yêu cầu sửa chữa/SOS
│       ├── assignments/  # Phân công kỹ thuật viên
│       ├── diagnoses/    # Đăng ký chẩn đoán lỗi
│       └── estimates/    # Tạo và duyệt báo giá
│
├── frontend/             # Mã nguồn Frontend của Team B (Phụ trách bởi Cường)
│   └── src/              # Cấu trúc Next.js chuẩn
│       ├── app/          # Định tuyến các màn hình Admin Web & Tech App
│       ├── components/   # UI chung (nút bấm bo 8-12px, ô nhập liệu)[cite: 1]
│       └── features/     # Logic và màn hình chi tiết theo chức năng
│
├── .gitignore            # Loại bỏ file rác (node_modules, .env, file tạm)
└── README.md             # Tài liệu hướng dẫn này