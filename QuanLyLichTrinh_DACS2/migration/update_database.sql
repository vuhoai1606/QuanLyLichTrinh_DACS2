-- =======================================
-- CẬP NHẬT DATABASE - THÊM CHỨC NĂNG MỚI
-- =======================================
-- File này để cập nhật database với các tính năng:
-- 1. OTP verification (xác thực email)
-- 2. Google OAuth login
-- 3. Enhanced validation cho tasks/events

-- =======================================
-- 1. CẬP NHẬT BẢNG USERS
-- =======================================
-- Thêm các cột mới cho users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS login_provider VARCHAR(20) DEFAULT 'local'; -- 'local' hoặc 'google'
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Tạo index cho google_id
CREATE INDEX IF NOT EXISTS idx_google_id ON users(google_id);

-- =======================================
-- 2. BẢNG OTP_CODES - Lưu mã OTP
-- =======================================
-- Bảng này lưu các mã OTP được gửi qua email
-- Mỗi mã OTP có thời gian hết hạn (5 phút)
CREATE TABLE IF NOT EXISTS otp_codes (
    otp_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,           -- Mã OTP 6 số
    purpose VARCHAR(50) NOT NULL,           -- 'registration', 'password_reset', 'email_change'
    is_used BOOLEAN DEFAULT FALSE,          -- Đã sử dụng chưa
    expires_at TIMESTAMP NOT NULL,          -- Thời gian hết hạn (5 phút sau khi tạo)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- =======================================
-- 3. CẬP NHẬT BẢNG TASKS - Thêm validation
-- =======================================
-- Thêm constraints và columns mới cho tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS tags TEXT[],                    -- Danh sách tags
ADD COLUMN IF NOT EXISTS attachment_urls TEXT[],         -- Đường dẫn file đính kèm
ADD COLUMN IF NOT EXISTS collaborators INTEGER[],        -- Danh sách user_id cộng tác
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Đảm bảo start_time không thể sau end_time (nếu có)
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS check_task_time,
ADD CONSTRAINT check_task_time 
CHECK (end_time IS NULL OR start_time <= end_time);

-- =======================================
-- 4. CẬP NHẬT BẢNG EVENTS - Thêm validation
-- =======================================
-- Thêm columns mới cho events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS attachment_urls TEXT[],         -- Đường dẫn file đính kèm
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),   -- Vị trí địa lý
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS meeting_link TEXT,              -- Link meeting online
ADD COLUMN IF NOT EXISTS tags TEXT[];                    -- Danh sách tags

-- Đảm bảo start_time không thể sau end_time
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS check_event_time,
ADD CONSTRAINT check_event_time 
CHECK (start_time < end_time);

-- =======================================
-- 5. BẢNG ACTIVITY_LOGS - Lưu lịch sử hoạt động
-- =======================================
-- Bảng này lưu lại các hoạt động của user (để audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,            -- 'create_task', 'update_event', 'login', etc.
    entity_type VARCHAR(50),                 -- 'task', 'event', 'user'
    entity_id INTEGER,                       -- ID của task/event được tác động
    details JSONB,                           -- Chi tiết thay đổi
    ip_address VARCHAR(45),                  -- IP address của user
    user_agent TEXT,                         -- Browser/device info
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);

-- =======================================
-- 6. FUNCTION: Xóa OTP codes đã hết hạn
-- =======================================
-- Function này sẽ được gọi định kỳ để dọn dẹp OTP cũ
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() OR is_used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =======================================
-- 7. COMMENTS - Giải thích các bảng và cột
-- =======================================
COMMENT ON TABLE otp_codes IS 'Lưu mã OTP cho xác thực email';
COMMENT ON COLUMN otp_codes.purpose IS 'Mục đích sử dụng OTP: registration, password_reset, email_change';
COMMENT ON COLUMN otp_codes.expires_at IS 'OTP hết hiệu lực sau 5 phút';

COMMENT ON TABLE activity_logs IS 'Lưu lịch sử hoạt động của user để audit';
COMMENT ON COLUMN activity_logs.details IS 'Lưu chi tiết thay đổi dưới dạng JSON';

COMMENT ON COLUMN users.login_provider IS 'Phương thức đăng nhập: local (username/password) hoặc google (OAuth)';
COMMENT ON COLUMN users.google_id IS 'ID từ Google OAuth, unique cho mỗi tài khoản Google';

-- =======================================
-- HOÀN TẤT
-- =======================================
-- Chạy script này bằng cách:
-- 1. Trong psql: \i update_database.sql
-- 2. Hoặc node migration/runUpdate.js
