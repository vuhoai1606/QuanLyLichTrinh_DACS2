-- =======================================
-- MIGRATION: THÊM CÁC CỘT THIẾU (KHÔNG ĐỘNG USERS)
-- =======================================
-- Mục đích: Chỉ thêm các cột thiếu vào events, notifications và enum overdue
-- Ngày tạo: 2025-12-12
-- Lưu ý: KHÔNG thay đổi bảng users, indexes, constraints

-- =======================================
-- PHẦN 1: THÊM CỘT VÀO BẢNG EVENTS
-- =======================================

-- Thêm cột location để lưu địa điểm sự kiện
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN events.location IS 'Địa điểm tổ chức sự kiện';

-- Kiểm tra và thêm calendar_type nếu chưa có
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'calendar_type'
    ) THEN
        ALTER TABLE events ADD COLUMN calendar_type VARCHAR(50) DEFAULT 'Personal';
        COMMENT ON COLUMN events.calendar_type IS 'Loại lịch: Personal, Work, etc.';
    END IF;
END $$;

-- =======================================
-- PHẦN 2: THÊM CỘT VÀO BẢNG NOTIFICATIONS
-- =======================================

-- Thêm redirect_url - URL chuyển hướng khi click thông báo
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Thêm related_id - ID liên quan đến entity
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_id INTEGER;

COMMENT ON COLUMN notifications.redirect_url IS 'URL chuyển hướng khi click vào thông báo';
COMMENT ON COLUMN notifications.related_id IS 'ID liên quan (task_id, event_id, etc.)';

-- =======================================
-- PHẦN 3: THÊM GIÁ TRỊ 'OVERDUE' VÀO STATUS_ENUM
-- =======================================

-- Thêm trạng thái 'overdue' vào ENUM (chỉ thêm nếu chưa có)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'overdue' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_enum')
    ) THEN
        ALTER TYPE status_enum ADD VALUE 'overdue';
    END IF;
END $$;

-- =======================================
-- KẾT QUẢ
-- =======================================

SELECT 'Migration completed successfully!' AS status;
SELECT '✅ Đã thêm vào events: location, calendar_type' AS step1;
SELECT '✅ Đã thêm vào notifications: redirect_url, related_id' AS step2;
SELECT '✅ Đã thêm status_enum: overdue' AS step3;
SELECT 'ℹ️ Bảng users, indexes và constraints giữ nguyên' AS note;
