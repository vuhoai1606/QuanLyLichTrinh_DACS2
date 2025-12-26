-- =======================================
-- MIGRATION: ADD BAN COLUMNS TO USERS TABLE
-- =======================================
-- Mục đích: Thêm các cột is_banned, ban_reason, ban_date cho chức năng khóa tài khoản
-- Ngày tạo: 2025-12-10

-- Thêm các cột mới vào bảng users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS ban_date TIMESTAMP;

-- Tạo index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);

-- Comment giải thích
COMMENT ON COLUMN users.is_banned IS 'Tài khoản có bị khóa không (true = bị khóa)';
COMMENT ON COLUMN users.ban_reason IS 'Lý do khóa tài khoản';
COMMENT ON COLUMN users.ban_date IS 'Thời điểm bị khóa tài khoản';

-- Đảm bảo tất cả tài khoản hiện có có is_banned = FALSE (mặc định)
UPDATE users SET is_banned = FALSE WHERE is_banned IS NULL;

-- Hiển thị kết quả
SELECT 'Migration completed successfully!' AS status;
SELECT 'Columns added: is_banned, ban_reason, ban_date' AS details;
