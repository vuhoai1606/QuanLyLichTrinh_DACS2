-- ====================================================================
-- MIGRATION: Bỏ cột end_date trong system_notifications
-- ====================================================================
-- Created: 2025-12-16
-- Reason: Đơn giản hóa - không cần tự động xóa notification khi hết hạn
--         Thông tin hết hạn sẽ ghi vào nội dung (content)
-- ====================================================================

-- Bỏ cột end_date
ALTER TABLE system_notifications DROP COLUMN IF EXISTS end_date;

-- Cập nhật comment
COMMENT ON TABLE system_notifications IS 'Thông báo toàn hệ thống do admin tạo. Ghi thời gian hết hạn vào nội dung nếu cần.';

-- Log kết quả
DO $$
BEGIN
    RAISE NOTICE '✅ Đã bỏ cột end_date khỏi system_notifications';
    RAISE NOTICE '📝 Admin sẽ ghi thời gian hết hạn vào nội dung thông báo';
END $$;
