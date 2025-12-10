-- =======================================
-- MIGRATION: ADMIN SYSTEM
-- =======================================
-- Mục đích: Thêm các bảng và cột cần thiết cho hệ thống admin
-- Bao gồm: audit logs, system notifications, user status

-- =======================================
-- 1. CẬP NHẬT BẢNG USERS
-- =======================================
-- Thêm cột để quản lý trạng thái tài khoản
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Tạo index cho role (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Comment giải thích
COMMENT ON COLUMN users.is_active IS 'Tài khoản có đang hoạt động không (false = bị khóa)';
COMMENT ON COLUMN users.banned_at IS 'Thời điểm bị khóa tài khoản';
COMMENT ON COLUMN users.banned_reason IS 'Lý do khóa tài khoản';
COMMENT ON COLUMN users.last_login_at IS 'Lần đăng nhập cuối cùng';

-- =======================================
-- 2. BẢNG ADMIN_LOGS - Ghi lại hành động admin
-- =======================================
CREATE TABLE IF NOT EXISTS admin_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,                          -- User ID của admin thực hiện
    action_type VARCHAR(50) NOT NULL,               -- 'grant_admin', 'ban_user', 'delete_user', 'create_notification'
    target_user_id INT,                             -- ID người dùng bị tác động (nếu có)
    description TEXT NOT NULL,                      -- Mô tả chi tiết hành động
    metadata JSONB,                                 -- Dữ liệu bổ sung (old_value, new_value, reason, etc.)
    ip_address VARCHAR(45),                         -- IP của admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

COMMENT ON TABLE admin_logs IS 'Audit log - Ghi lại tất cả hành động quan trọng của admin';

-- =======================================
-- 3. BẢNG SYSTEM_NOTIFICATIONS - Thông báo hệ thống
-- =======================================
CREATE TABLE IF NOT EXISTS system_notifications (
    notification_id SERIAL PRIMARY KEY,
    created_by INT NOT NULL,                        -- Admin tạo thông báo
    title VARCHAR(200) NOT NULL,                    -- Tiêu đề thông báo
    content TEXT NOT NULL,                          -- Nội dung thông báo
    notification_type VARCHAR(50) DEFAULT 'info',   -- 'info', 'warning', 'urgent', 'maintenance'
    is_active BOOLEAN DEFAULT TRUE,                 -- Còn hiển thị không
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Bắt đầu hiển thị
    end_date TIMESTAMP,                             -- Kết thúc hiển thị (NULL = vô thời hạn)
    target_users TEXT DEFAULT 'all',                -- 'all' hoặc JSON array user_ids
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(notification_type);

COMMENT ON TABLE system_notifications IS 'Thông báo toàn hệ thống do admin tạo (banner, popup, urgent messages)';

-- =======================================
-- 4. BẢNG USER_ACTIVITY_STATS - Thống kê hoạt động
-- =======================================
-- Bảng này lưu tổng hợp thống kê để query nhanh hơn
CREATE TABLE IF NOT EXISTS user_activity_stats (
    user_id INT PRIMARY KEY,
    total_tasks INT DEFAULT 0,
    total_events INT DEFAULT 0,
    total_messages_sent INT DEFAULT 0,
    last_active_at TIMESTAMP,
    account_created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_activity_last_active ON user_activity_stats(last_active_at DESC);

COMMENT ON TABLE user_activity_stats IS 'Thống kê tổng hợp hoạt động người dùng (tối ưu cho admin dashboard)';

-- =======================================
-- 5. FUNCTION: Cập nhật user_activity_stats
-- =======================================
CREATE OR REPLACE FUNCTION update_user_activity_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Khi tạo task mới
    IF TG_TABLE_NAME = 'tasks' AND TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_stats (user_id, total_tasks, account_created_at)
        VALUES (NEW.user_id, 1, (SELECT created_at FROM users WHERE user_id = NEW.user_id))
        ON CONFLICT (user_id) 
        DO UPDATE SET total_tasks = user_activity_stats.total_tasks + 1;
    END IF;
    
    -- Khi tạo event mới
    IF TG_TABLE_NAME = 'events' AND TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_stats (user_id, total_events, account_created_at)
        VALUES (NEW.user_id, 1, (SELECT created_at FROM users WHERE user_id = NEW.user_id))
        ON CONFLICT (user_id) 
        DO UPDATE SET total_events = user_activity_stats.total_events + 1;
    END IF;
    
    -- Khi gửi message mới
    IF TG_TABLE_NAME = 'messages' AND TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_stats (user_id, total_messages_sent, account_created_at)
        VALUES (NEW.sender_id, 1, (SELECT created_at FROM users WHERE user_id = NEW.sender_id))
        ON CONFLICT (user_id) 
        DO UPDATE SET total_messages_sent = user_activity_stats.total_messages_sent + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =======================================
-- 6. TRIGGERS: Tự động cập nhật stats
-- =======================================
DROP TRIGGER IF EXISTS update_stats_on_task_insert ON tasks;
CREATE TRIGGER update_stats_on_task_insert
AFTER INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION update_user_activity_stats();

DROP TRIGGER IF EXISTS update_stats_on_event_insert ON events;
CREATE TRIGGER update_stats_on_event_insert
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION update_user_activity_stats();

DROP TRIGGER IF EXISTS update_stats_on_message_insert ON messages;
CREATE TRIGGER update_stats_on_message_insert
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_user_activity_stats();

-- =======================================
-- 7. VIEW: Admin Dashboard Overview
-- =======================================
CREATE OR REPLACE VIEW admin_dashboard_overview AS
SELECT 
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS active_users,
    (SELECT COUNT(*) FROM users WHERE is_active = FALSE) AS banned_users,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_last_7_days,
    (SELECT COUNT(*) FROM users WHERE last_login_at >= NOW() - INTERVAL '24 hours') AS active_today,
    (SELECT COUNT(*) FROM tasks) AS total_tasks,
    (SELECT COUNT(*) FROM events) AS total_events,
    (SELECT COUNT(*) FROM messages) AS total_messages,
    (SELECT COUNT(*) FROM admin_logs WHERE created_at >= NOW() - INTERVAL '24 hours') AS admin_actions_today;

COMMENT ON VIEW admin_dashboard_overview IS 'Tổng quan thống kê cho admin dashboard';

-- =======================================
-- 8. FUNCTION: Tạo audit log
-- =======================================
CREATE OR REPLACE FUNCTION create_admin_log(
    p_admin_id INT,
    p_action_type VARCHAR(50),
    p_target_user_id INT,
    p_description TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    log_id INT;
BEGIN
    INSERT INTO admin_logs (admin_id, action_type, target_user_id, description, metadata, ip_address)
    VALUES (p_admin_id, p_action_type, p_target_user_id, p_description, p_metadata, p_ip_address)
    RETURNING admin_logs.log_id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_admin_log IS 'Helper function để tạo admin audit log';

-- =======================================
-- 9. SEED INITIAL DATA
-- =======================================
-- Tạo user_activity_stats cho các user hiện có
INSERT INTO user_activity_stats (user_id, total_tasks, total_events, total_messages_sent, account_created_at)
SELECT 
    u.user_id,
    COALESCE((SELECT COUNT(*) FROM tasks WHERE user_id = u.user_id), 0),
    COALESCE((SELECT COUNT(*) FROM events WHERE user_id = u.user_id), 0),
    COALESCE((SELECT COUNT(*) FROM messages WHERE sender_id = u.user_id), 0),
    u.created_at
FROM users u
ON CONFLICT (user_id) DO NOTHING;

-- =======================================
-- HOÀN TẤT MIGRATION
-- =======================================
-- Hiển thị kết quả
DO $$
BEGIN
    RAISE NOTICE '✅ Migration hoàn tất!';
    RAISE NOTICE '📊 Đã tạo:';
    RAISE NOTICE '   - Bảng admin_logs (audit trail)';
    RAISE NOTICE '   - Bảng system_notifications (thông báo hệ thống)';
    RAISE NOTICE '   - Bảng user_activity_stats (thống kê tối ưu)';
    RAISE NOTICE '   - View admin_dashboard_overview';
    RAISE NOTICE '   - Function create_admin_log()';
    RAISE NOTICE '   - Triggers tự động cập nhật stats';
    RAISE NOTICE '🎉 Hệ thống admin đã sẵn sàng!';
END $$;
