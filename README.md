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
│   ├── ui-guidelines/    # UI Kit (Font Glacier Light, mã màu xanh dương)[cite: 1]
│   └── flows/            # Luồng User Flow của Admin và Kỹ thuật viên
│
├── backend/              # Mã nguồn Backend chung (Phụ trách bởi Ly & Hà)
│   └── app/              
│       ├── main.py       # Điểm chạy chính của server FastAPI
│       │
│       # --- MỖI MODULE CHỨA ĐỦ 5 FILE: router.py, schemas.py, models.py, service.py, repository.py ---
│       ├── auth/             # Xác thực người dùng (Đăng ký/Đăng nhập)
│       ├── customers/        # Quản lý khách hàng
│       ├── devices/          # Quản lý thiết bị (Scooter/Xe lăn)
│       ├── repair_requests/  # Quản lý yêu cầu sửa chữa/SOS
│       ├── assignments/      # Phân công kỹ thuật viên
│       ├── diagnoses/        # Đăng ký chẩn đoán lỗi
│       ├── estimates/        # Tạo và duyệt báo giá
│       ├── completions/      # Hoàn thành sửa chữa
│       ├── repair_history/   # Lịch sử sửa chữa
│       └── uploads/          # Quản lý hình ảnh tải lên (Supabase Storage)
│
├── frontend/             # Mã nguồn Frontend của Team B (Phụ trách bởi Cường)
│   └── src/              
│       ├── app/          # Trang và định tuyến màn hình Admin Web & Tech App
│       ├── components/   # UI chung dùng toàn dự án (Nút bấm bo góc, ô nhập liệu)
│       ├── features/     # Màn hình & logic chi tiết theo chức năng
│       ├── services/     # Các hàm gọi API lên Backend (Axios / Fetch)
│       ├── types/        # Định nghĩa kiểu dữ liệu (TypeScript Types)
│       ├── constants/    # Giá trị trạng thái (14 status) & hằng số dùng chung
│       ├── hooks/        # Các React Custom Hooks dùng chung
│       └── utils/        # Hàm tiện ích chung (định dạng ngày tháng, tiền tệ...)
│
├── .gitignore            # Loại bỏ file rác (node_modules, .env, file tạm)
└── README.md             # Tài liệu hướng dẫn này