-- ============================================================
--  H-SOLUTION PLATFORM - DATABASE SCHEMA (Từ File Ảnh Thiết Kế)
--  Cơ sở dữ liệu: PostgreSQL
--  Ghi chú: Đã sửa lại các lỗi logic từ bản thiết kế gốc (như sai kiểu dữ liệu BOOLEAN, INT, độ dài Foreign Key, và tham chiếu sai bảng).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ĐỊNH NGHĨA CÁC KIỂU ENUM
-- ============================================================
CREATE TYPE skills_enum AS ENUM ('WHEELCHAIR', 'SCOOTER', 'BOTH');
CREATE TYPE kyc_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE device_type_enum AS ENUM ('WHEELCHAIR', 'SCOOTER');
CREATE TYPE issue_type_enum AS ENUM ('BATTERY', 'MOTOR', 'TIRE', 'BRAKE', 'OTHER');
CREATE TYPE repair_status_enum AS ENUM ('PENDING', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'DIAGNOSED', 'REPAIRING', 'COMPLETED', 'CANCELLED');
CREATE TYPE severity_enum AS ENUM ('MINOR', 'MAJOR');
CREATE TYPE quote_status_enum AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE item_type_enum AS ENUM ('SPARE_PART', 'LABOR', 'SERVICE');

-- ============================================================
-- 2. HÀM TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TẠO BẢNG DỮ LIỆU (TABLES)
-- ============================================================

-- Bảng roles (image.png)
CREATE TABLE roles (
    id VARCHAR(10) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150),
    description TEXT
);

-- Bảng users (image copy.png)
CREATE TABLE users (
    id VARCHAR(10) PRIMARY KEY,
    role_id VARCHAR(10) NOT NULL REFERENCES roles(id),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(10) UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    locked_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bảng refresh_tokens (image copy 2.png)
-- Đã FIX: user_id trỏ về users(id) thay vì roles(id) như trong ảnh
CREATE TABLE refresh_tokens (
    id VARCHAR(10) PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL REFERENCES users(id),
    token_hash VARCHAR(500) NOT NULL,
    device_info VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng otps (image copy 3.png)
-- Đã FIX: is_used chuyển thành BOOLEAN thay vì VARCHAR(1)
CREATE TABLE otps (
    id VARCHAR(10) PRIMARY KEY,
    phone VARCHAR(10) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL, -- Bắt buộc phải có hạn sử dụng
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng technician_profiles (image copy 4.png)
-- Đã FIX: experience_years và total_jobs_done chuyển thành INT, rating thành DECIMAL
CREATE TABLE technician_profiles (
    user_id VARCHAR(10) PRIMARY KEY REFERENCES users(id),
    id_card_number VARCHAR(12) NOT NULL UNIQUE,
    id_card_front_url VARCHAR(500),
    id_card_back_url VARCHAR(500),
    certificate_url VARCHAR(500),
    skills skills_enum NOT NULL DEFAULT 'BOTH',
    specialization VARCHAR(255),
    experience_years INT NOT NULL DEFAULT 0,
    kyc_status kyc_status_enum NOT NULL DEFAULT 'PENDING',
    kyc_reviewed_by VARCHAR(10) REFERENCES users(id), -- Đổi thành có thể NULL khi chưa duyệt
    kyc_reviewed_at TIMESTAMP,
    kyc_note TEXT,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    current_lat DECIMAL(10,8), -- Tọa độ GPS vĩ độ (Dành cho tracking)
    current_lng DECIMAL(11,8), -- Tọa độ GPS kinh độ
    last_location_at TIMESTAMP,
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_jobs_done INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_technician_profiles BEFORE UPDATE ON technician_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bảng repair_requests (image copy 5.png)
-- Đã FIX: customer_id VARCHAR(10) để khớp users(id), arrived_at và cancelled_at cho phép NULL
CREATE TABLE repair_requests (
    id VARCHAR(10) PRIMARY KEY,
    request_code VARCHAR(10) NOT NULL UNIQUE,
    customer_id VARCHAR(10) NOT NULL REFERENCES users(id),
    technician_id VARCHAR(10) REFERENCES users(id),
    device_type device_type_enum NOT NULL,
    issue_type issue_type_enum,
    issue_description TEXT NOT NULL,
    location_address VARCHAR(200) NOT NULL,
    location_lat DECIMAL(10,8), -- Tọa độ khách hàng để thợ tìm đường
    location_lng DECIMAL(11,8),
    is_sos BOOLEAN NOT NULL DEFAULT FALSE,
    status repair_status_enum NOT NULL DEFAULT 'PENDING',
    assigned_at TIMESTAMP,
    accepted_at TIMESTAMP,
    arrived_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    before_photo_url VARCHAR(500), -- Ảnh hiện trạng trước khi sửa
    after_photo_url VARCHAR(500),  -- Ảnh sau khi sửa xong
    customer_signature_url VARCHAR(500), -- Chữ ký nghiệm thu của khách
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_repair_requests BEFORE UPDATE ON repair_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bảng repair_status_history (image copy 6.png)
-- Đã FIX: Default cho api_endpoint và note bị sai trong bản gốc
CREATE TABLE repair_status_history (
    id VARCHAR(10) PRIMARY KEY,
    repair_id VARCHAR(10) NOT NULL REFERENCES repair_requests(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(10) NOT NULL REFERENCES users(id), -- Sửa từ VARCHAR(1) thành VARCHAR(10)
    api_endpoint VARCHAR(100),
    note TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng repair_quotes (image copy 7.png)
CREATE TABLE repair_quotes (
    id VARCHAR(10) PRIMARY KEY,
    repair_id VARCHAR(10) NOT NULL REFERENCES repair_requests(id),
    diagnosis_note TEXT NOT NULL,
    severity severity_enum,
    labor_fee DECIMAL(12,0) NOT NULL DEFAULT 0,
    parts_cost DECIMAL(12,0) DEFAULT 0,
    estimated_price DECIMAL(12,0) NOT NULL DEFAULT 0,
    status quote_status_enum NOT NULL DEFAULT 'PENDING',
    reject_reason TEXT,
    replied_by VARCHAR(10) REFERENCES users(id),
    replied_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_repair_quotes BEFORE UPDATE ON repair_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bảng repair_quote_items (image copy 8.png)
CREATE TABLE repair_quote_items (
    id VARCHAR(10) PRIMARY KEY,
    quote_id VARCHAR(10) NOT NULL REFERENCES repair_quotes(id),
    item_name VARCHAR(200) NOT NULL,
    item_type item_type_enum NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1, -- Đổi sang DECIMAL(10,2) để hỗ trợ số lượng thập phân (VD: 1.5 giờ công)
    unit_price DECIMAL(12,0) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,0) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_repair_quote_items BEFORE UPDATE ON repair_quote_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bảng repair_reviews (image copy 9.png)
-- Đã FIX: rating chuyển thành DECIMAL
CREATE TABLE repair_reviews (
    id VARCHAR(10) PRIMARY KEY,
    repair_id VARCHAR(10) NOT NULL REFERENCES repair_requests(id),
    customer_id VARCHAR(10) NOT NULL REFERENCES users(id),
    technician_id VARCHAR(10) NOT NULL REFERENCES users(id),
    rating DECIMAL(3,2) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_repair_reviews BEFORE UPDATE ON repair_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
