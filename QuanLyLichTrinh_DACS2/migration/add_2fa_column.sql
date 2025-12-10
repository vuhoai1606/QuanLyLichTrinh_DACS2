-- Add 2FA and settings columns to users table
-- Run: node migration/run_add_2fa.js

-- 1. Thêm cột 2FA (bảo mật, quan trọng)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- 2. Thêm cột language (ảnh hưởng nhiều tính năng)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'vi';

-- 3. Thêm cột settings (JSONB - linh hoạt cho các preferences khác)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"theme": "system", "notifications": true}'::jsonb;

-- Tạo index cho JSONB để query nhanh
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING GIN (settings);

-- Comments
COMMENT ON COLUMN users.is_2fa_enabled IS 'Xác thực 2 bước: true = bật, false = tắt';
COMMENT ON COLUMN users.language IS 'Ngôn ngữ hiển thị: vi = Tiếng Việt, en = English';
COMMENT ON COLUMN users.settings IS 'Các cài đặt khác dạng JSON: theme, notifications, v.v.';
