-- Dọn dẹp các bảng cũ để tránh lỗi "already exists" khi chạy lại file
-- DROP TABLE IF EXISTS reviews CASCADE;
-- DROP TABLE IF EXISTS quote_items CASCADE;
-- DROP TABLE IF EXISTS repair_quotes CASCADE;
-- DROP TABLE IF EXISTS repair_status_history CASCADE;
-- DROP TABLE IF EXISTS repair_requests CASCADE;
-- DROP TABLE IF EXISTS technician_profiles CASCADE;
-- DROP TABLE IF EXISTS otps CASCADE;
-- DROP TABLE IF EXISTS refresh_tokens CASCADE;
-- DROP TABLE IF EXISTS customer_devices CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;

-- 1. ROLES
CREATE TABLE roles (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255) NULL
);

-- 2. USERS
CREATE TABLE users (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    role_id VARCHAR(10) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    address VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 3. CUSTOMER DEVICES
CREATE TABLE customer_devices (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    customer_id VARCHAR(10) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('WHEELCHAIR', 'SCOOTER')),
    manufacturer VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NULL,
    image_url VARCHAR(255) NULL,
    notes TEXT NULL,
    frame_number VARCHAR(100) NULL,
    purchase_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- 4. REFRESH TOKENS
CREATE TABLE refresh_tokens (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    user_id VARCHAR(10) NOT NULL,
    token_hash VARCHAR(500) NOT NULL,
    device_info VARCHAR(255) NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. OTPS
CREATE TABLE otps (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_otps_phone ON otps (phone, created_at);

-- 6. TECHNICIAN PROFILES
CREATE TABLE technician_profiles (
    user_id VARCHAR(10) PRIMARY KEY NOT NULL,
    id_card_number VARCHAR(12) NOT NULL UNIQUE,
    id_card_front_url VARCHAR(500) NOT NULL,
    id_card_back_url VARCHAR(500) NOT NULL,
    certificate_url VARCHAR(500) NOT NULL,
    skills VARCHAR(50) NOT NULL DEFAULT 'BOTH' CHECK (skills IN ('WHEELCHAIR', 'SCOOTER', 'BOTH')),
    specialization VARCHAR(255) NULL,
    experience_years SMALLINT NOT NULL DEFAULT 0,
    kyc_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    kyc_reviewed_by VARCHAR(10) NULL,
    kyc_reviewed_at TIMESTAMP NULL,
    kyc_note TEXT NULL,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_latitude DECIMAL(10, 8) NULL,
    last_longitude DECIMAL(11, 8) NULL,
    last_location_at TIMESTAMP NULL,
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_jobs_done INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (kyc_reviewed_by) REFERENCES users(id)
);
CREATE INDEX idx_tech_available ON technician_profiles (is_online, kyc_status);

-- 7. REPAIR REQUESTS
CREATE TABLE repair_requests (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    request_code VARCHAR(10) NOT NULL UNIQUE,
    customer_id VARCHAR(10) NOT NULL,
    technician_id VARCHAR(10) NULL,
    device_id VARCHAR(10) NOT NULL,
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('BATTERY', 'MOTOR', 'TIRE', 'BRAKE', 'OTHER')),
    issue_description TEXT NOT NULL,
    location_address VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    is_sos BOOLEAN NOT NULL DEFAULT FALSE,
    inspection_images TEXT NULL,
    after_repair_images TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'DIAGNOSED', 'REPAIRING', 'COMPLETED', 'CANCELLED')),
    assigned_at TIMESTAMP NULL,
    accepted_at TIMESTAMP NULL,
    arrived_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancel_reason TEXT NULL,
    payment_method VARCHAR(50) NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID')),
    total_amount DECIMAL(12,0) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (technician_id) REFERENCES users(id),
    FOREIGN KEY (device_id) REFERENCES customer_devices(id)
);
CREATE INDEX idx_requests_status ON repair_requests (status);
CREATE INDEX idx_customer_requests ON repair_requests (customer_id, status);
CREATE INDEX idx_tech_requests ON repair_requests (technician_id, status);

-- 8. REPAIR STATUS HISTORY
CREATE TABLE repair_status_history (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    repair_id VARCHAR(10) NOT NULL,
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(10) NOT NULL,
    api_endpoint VARCHAR(100) NULL,
    note TEXT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_id) REFERENCES repair_requests(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- 9. REPAIR QUOTES
CREATE TABLE repair_quotes (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    repair_id VARCHAR(10) NOT NULL,
    diagnosis_note TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('MINOR', 'MAJOR')),
    labor_fee DECIMAL(12,0) NOT NULL DEFAULT 0,
    parts_cost DECIMAL(12,0) NOT NULL DEFAULT 0,
    estimated_price DECIMAL(12,0) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    reject_reason TEXT NULL,
    replied_by VARCHAR(10) NULL,
    replied_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_id) REFERENCES repair_requests(id),
    FOREIGN KEY (replied_by) REFERENCES users(id)
);

-- 10. QUOTE ITEMS
CREATE TABLE quote_items (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    quote_id VARCHAR(10) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('SPARE_PART', 'LABOR', 'SERVICE')),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,0) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,0) NOT NULL DEFAULT 0,
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES repair_quotes(id)
);

-- 11. REVIEWS
CREATE TABLE reviews (
    id VARCHAR(10) PRIMARY KEY NOT NULL,
    repair_id VARCHAR(10) NOT NULL UNIQUE,
    customer_id VARCHAR(10) NOT NULL,
    technician_id VARCHAR(10) NOT NULL,
    rating SMALLINT NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_id) REFERENCES repair_requests(id),
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);



