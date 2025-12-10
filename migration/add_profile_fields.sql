-- Migration: Thêm gender và phone_number vào bảng users
-- Run: node migration/run_add_profile_fields.js

-- Thêm cột giới tính
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('Nam', 'Nữ', 'Khác'));

-- Thêm cột số điện thoại (chỉ 10 số)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(10) CHECK (phone_number IS NULL OR phone_number ~ '^[0-9]{10}$');

-- Comments
COMMENT ON COLUMN users.gender IS 'Giới tính: Nam, Nữ, hoặc Khác';
COMMENT ON COLUMN users.phone_number IS 'Số điện thoại (tùy chọn, đúng 10 số)';

-- Index cho phone_number để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_phone_number ON users(phone_number);
