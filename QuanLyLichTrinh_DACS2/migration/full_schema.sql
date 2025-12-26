-- ====================================================================
-- FULL DATABASE SCHEMA - Quản Lý Lịch Trình
-- ====================================================================
-- Created: 2025-12-16
-- Description: Tệp này chứa toàn bộ cấu trúc database
-- Chạy file này để tạo lại toàn bộ bảng, cột, kiểu dữ liệu
-- ====================================================================

-- ====================================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ====================================================================

-- Loại lặp lại sự kiện
CREATE TYPE repeat_type_enum AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly');

-- Mức độ ưu tiên
CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high');

-- Trạng thái công việc
CREATE TYPE status_enum AS ENUM ('todo', 'in_progress', 'done', 'overdue');

-- Loại chia sẻ
CREATE TYPE share_type_enum AS ENUM ('shared', 'copied');

-- Quyền trên sự kiện được chia sẻ
CREATE TYPE permission_enum AS ENUM ('view', 'edit');

-- Loại thông báo
CREATE TYPE notification_type_enum AS ENUM ('task', 'event', 'message', 'system', 'sprint');

-- Loại tin nhắn
CREATE TYPE message_type_enum AS ENUM ('text', 'file', 'image', 'video');

-- ====================================================================
-- 2. HELPER FUNCTIONS
-- ====================================================================

-- Function tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function xóa OTP đã hết hạn
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() OR is_used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function đánh dấu tin nhắn đã đọc
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_user_id INT, p_other_user_id INT)
RETURNS void AS $$
DECLARE
    smaller_id INT;
    larger_id INT;
BEGIN
    -- Đánh dấu tất cả tin nhắn từ other_user chưa đọc thành đã đọc
    UPDATE messages
    SET is_read = TRUE
    WHERE receiver_id = p_user_id
      AND sender_id = p_other_user_id
      AND is_read = FALSE;
    
    -- Cập nhật unread_count trong conversations
    IF p_user_id < p_other_user_id THEN
        smaller_id := p_user_id;
        larger_id := p_other_user_id;
    ELSE
        smaller_id := p_other_user_id;
        larger_id := p_user_id;
    END IF;
    
    UPDATE conversations
    SET unread_count = 0,
        updated_at = NOW()
    WHERE user1_id = smaller_id 
      AND user2_id = larger_id;
END;
$$ LANGUAGE plpgsql;

-- Function tự động cập nhật conversation khi có tin nhắn mới
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    smaller_id INT;
    larger_id INT;
    conversation_exists BOOLEAN;
BEGIN
    -- Chỉ xử lý tin nhắn 1-1 (không phải group)
    IF NEW.receiver_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Xác định user1_id và user2_id (smaller < larger)
    IF NEW.sender_id < NEW.receiver_id THEN
        smaller_id := NEW.sender_id;
        larger_id := NEW.receiver_id;
    ELSE
        smaller_id := NEW.receiver_id;
        larger_id := NEW.sender_id;
    END IF;
    
    -- Kiểm tra conversation có tồn tại chưa
    SELECT EXISTS(
        SELECT 1 FROM conversations 
        WHERE user1_id = smaller_id AND user2_id = larger_id
    ) INTO conversation_exists;
    
    IF conversation_exists THEN
        -- Update conversation hiện tại
        UPDATE conversations
        SET last_message_id = NEW.message_id,
            unread_count = unread_count + 1,
            updated_at = NOW()
        WHERE user1_id = smaller_id 
          AND user2_id = larger_id;
    ELSE
        -- Tạo conversation mới
        INSERT INTO conversations (user1_id, user2_id, last_message_id, unread_count)
        VALUES (smaller_id, larger_id, NEW.message_id, 1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function tạo admin log
CREATE OR REPLACE FUNCTION create_admin_log(
    p_admin_id INT,
    p_action_type VARCHAR,
    p_target_user_id INT,
    p_description TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL
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

-- Function tự động cập nhật user activity stats
CREATE OR REPLACE FUNCTION update_user_activity_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Khi tạo task mới
    IF TG_TABLE_NAME = 'tasks' AND TG_OP = 'INSERT' THEN
        UPDATE user_activity_stats
        SET total_tasks = total_tasks + 1,
            last_active_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Khi tạo event mới
    IF TG_TABLE_NAME = 'events' AND TG_OP = 'INSERT' THEN
        UPDATE user_activity_stats
        SET total_events = total_events + 1,
            last_active_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Khi gửi tin nhắn
    IF TG_TABLE_NAME = 'messages' AND TG_OP = 'INSERT' THEN
        UPDATE user_activity_stats
        SET total_messages_sent = total_messages_sent + 1,
            last_active_at = NOW()
        WHERE user_id = NEW.sender_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 3. MAIN TABLES
-- ====================================================================

-- -----------------------
-- 3.1. BẢNG USERS
-- -----------------------
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT DEFAULT '/img/default-avatar.jpg',
    google_id VARCHAR(255) UNIQUE,
    login_provider VARCHAR(20) DEFAULT 'local' NOT NULL,
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'vi',
    settings JSONB DEFAULT '{}',
    gender VARCHAR(20),
    phone_number VARCHAR(15),
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    ban_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'))
);

COMMENT ON COLUMN users.google_id IS 'ID từ Google OAuth, unique cho mỗi tài khoản Google';
COMMENT ON COLUMN users.login_provider IS 'Phương thức đăng nhập: local (username/password) hoặc google (OAuth)';
COMMENT ON COLUMN users.is_2fa_enabled IS 'Xác thực 2 bước: true = bật, false = tắt';
COMMENT ON COLUMN users.language IS 'Ngôn ngữ hiển thị: vi = Tiếng Việt, en = English';
COMMENT ON COLUMN users.settings IS 'Các cài đặt khác dạng JSON: theme, notifications, v.v.';
COMMENT ON COLUMN users.gender IS 'Giới tính: Nam, Nữ, hoặc Khác';
COMMENT ON COLUMN users.phone_number IS 'Số điện thoại (tùy chọn, đúng 10 số)';
COMMENT ON COLUMN users.role IS 'Vai trò: admin hoặc user';
COMMENT ON COLUMN users.is_active IS 'Tài khoản có đang hoạt động không (false = bị khóa)';
COMMENT ON COLUMN users.last_login_at IS 'Lần đăng nhập cuối cùng';
COMMENT ON COLUMN users.is_banned IS 'Tài khoản có bị khóa không (true = bị khóa)';
COMMENT ON COLUMN users.ban_reason IS 'Lý do khóa tài khoản';
COMMENT ON COLUMN users.ban_date IS 'Thời điểm bị khóa tài khoản';

-- -----------------------
-- 3.2. BẢNG CATEGORIES
-- -----------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    color_code VARCHAR(7) DEFAULT '#3498db',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- -----------------------
-- 3.3. BẢNG TASKS
-- -----------------------
CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    priority priority_enum DEFAULT 'medium',
    status status_enum DEFAULT 'todo',
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    reminder_time TIMESTAMP,
    repeat_type repeat_type_enum DEFAULT 'none',
    notes TEXT,
    calendar_type VARCHAR(50) DEFAULT 'Work',
    kanban_column VARCHAR(50) DEFAULT 'todo',
    sprint_id INT,
    is_overdue BOOLEAN DEFAULT FALSE,
    overdue_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

COMMENT ON COLUMN tasks.calendar_type IS 'Loại lịch: Work, Personal, etc.';

-- -----------------------
-- 3.4. BẢNG EVENTS
-- -----------------------
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(255),
    is_all_day BOOLEAN DEFAULT FALSE,
    priority priority_enum DEFAULT 'medium',
    status status_enum DEFAULT 'todo',
    reminder_time TIMESTAMP,
    repeat_type repeat_type_enum DEFAULT 'none',
    notes TEXT,
    calendar_type VARCHAR(100) DEFAULT 'Personal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT check_event_time CHECK (start_time < end_time)
);

COMMENT ON COLUMN events.location IS 'Địa điểm tổ chức sự kiện';
COMMENT ON COLUMN events.calendar_type IS 'Loại lịch: Personal, Work, etc.';

-- -----------------------
-- 3.5. BẢNG SHARED_EVENTS
-- -----------------------
CREATE TABLE IF NOT EXISTS shared_events (
    share_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    owner_id INT NOT NULL,
    shared_with_user_id INT NOT NULL,
    share_type share_type_enum DEFAULT 'shared',
    permission permission_enum DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- -----------------------
-- 3.6. BẢNG CHAT_GROUPS
-- -----------------------
CREATE TABLE IF NOT EXISTS chat_groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- -----------------------
-- 3.7. BẢNG GROUP_MEMBERS
-- -----------------------
CREATE TABLE IF NOT EXISTS group_members (
    member_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES chat_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- -----------------------
-- 3.8. BẢNG MESSAGES
-- -----------------------
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT,
    group_id INT,
    message_content TEXT NOT NULL,
    message_type message_type_enum DEFAULT 'text',
    file_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES chat_groups(group_id) ON DELETE CASCADE,
    CONSTRAINT check_message_type CHECK (
        (receiver_id IS NOT NULL AND group_id IS NULL) OR 
        (receiver_id IS NULL AND group_id IS NOT NULL)
    )
);

-- -----------------------
-- 3.9. BẢNG ALARM_SOUNDS
-- -----------------------
CREATE TABLE IF NOT EXISTS alarm_sounds (
    sound_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    sound_name VARCHAR(100) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- -----------------------
-- 3.10. BẢNG NOTIFICATIONS
-- -----------------------
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type notification_type_enum DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redirect_url TEXT,
    related_id INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

COMMENT ON COLUMN notifications.redirect_url IS 'URL chuyển hướng khi click vào thông báo';
COMMENT ON COLUMN notifications.related_id IS 'ID liên quan (task_id, event_id, etc.)';

-- -----------------------
-- 3.11. BẢNG OTP_CODES
-- -----------------------
CREATE TABLE IF NOT EXISTS otp_codes (
    otp_id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE otp_codes IS 'Lưu mã OTP cho xác thực email';
COMMENT ON COLUMN otp_codes.purpose IS 'Mục đích sử dụng OTP: registration, password_reset, email_change';
COMMENT ON COLUMN otp_codes.expires_at IS 'OTP hết hiệu lực sau 5 phút';

-- -----------------------
-- 3.12. BẢNG ACTIVITY_LOGS
-- -----------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE activity_logs IS 'Lưu lịch sử hoạt động của user để audit';
COMMENT ON COLUMN activity_logs.details IS 'Lưu chi tiết thay đổi dưới dạng JSON';

-- -----------------------
-- 3.13. BẢNG USER_SESSIONS
-- -----------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

COMMENT ON TABLE user_sessions IS 'Bảng lưu session data cho Remember Me và user authentication';

-- -----------------------
-- 3.14. BẢNG SPRINTS
-- -----------------------
CREATE TABLE IF NOT EXISTS sprints (
    sprint_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE sprints IS 'Bảng quản lý sprint cho agile project management';

-- -----------------------
-- 3.15. BẢNG CONVERSATIONS
-- -----------------------
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id SERIAL PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    last_message_id INT,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT check_different_users CHECK (user1_id < user2_id),
    UNIQUE(user1_id, user2_id)
);

-- -----------------------
-- 3.16. BẢNG ADMIN_LOGS
-- -----------------------
CREATE TABLE IF NOT EXISTS admin_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_user_id INT,
    description TEXT,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE admin_logs IS 'Audit log - Ghi lại tất cả hành động quan trọng của admin';

-- -----------------------
-- 3.17. BẢNG SYSTEM_NOTIFICATIONS
-- -----------------------
CREATE TABLE IF NOT EXISTS system_notifications (
    notification_id SERIAL PRIMARY KEY,
    created_by INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'info',
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    target_users TEXT DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE system_notifications IS 'Thông báo toàn hệ thống do admin tạo. Ghi thời gian hết hạn vào nội dung nếu cần.';

-- -----------------------
-- 3.18. BẢNG USER_ACTIVITY_STATS
-- -----------------------
CREATE TABLE IF NOT EXISTS user_activity_stats (
    user_id INT PRIMARY KEY,
    total_tasks INT DEFAULT 0,
    total_events INT DEFAULT 0,
    total_messages_sent INT DEFAULT 0,
    last_active_at TIMESTAMP,
    account_created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE user_activity_stats IS 'Thống kê tổng hợp hoạt động người dùng (tối ưu cho admin dashboard)';

-- ====================================================================
-- 4. INDEXES
-- ====================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_user_task ON tasks(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_sprint ON tasks(sprint_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_user_event ON events(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_time ON events(start_time, end_time);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_user_notif ON notifications(user_id, is_read);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- System notifications indexes
CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active, start_date);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(notification_type);

-- User sessions index
CREATE INDEX IF NOT EXISTS idx_session_expire ON user_sessions(expire);

-- Sprints indexes
CREATE INDEX IF NOT EXISTS idx_user_sprint ON sprints(user_id, sprint_id);

-- ====================================================================
-- 5. TRIGGERS
-- ====================================================================

-- Trigger tự động cập nhật updated_at cho users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger tự động cập nhật updated_at cho tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger tự động cập nhật updated_at cho events
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger tự động cập nhật updated_at cho sprints
DROP TRIGGER IF EXISTS update_sprints_updated_at ON sprints;
CREATE TRIGGER update_sprints_updated_at 
BEFORE UPDATE ON sprints
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger tự động cập nhật conversation khi có tin nhắn mới
DROP TRIGGER IF EXISTS trigger_update_conversation ON messages;
CREATE TRIGGER trigger_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Triggers cho user activity stats
DROP TRIGGER IF EXISTS trigger_task_stats ON tasks;
CREATE TRIGGER trigger_task_stats
AFTER INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION update_user_activity_stats();

DROP TRIGGER IF EXISTS trigger_event_stats ON events;
CREATE TRIGGER trigger_event_stats
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION update_user_activity_stats();

DROP TRIGGER IF EXISTS trigger_message_stats ON messages;
CREATE TRIGGER trigger_message_stats
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_user_activity_stats();

-- ====================================================================
-- 6. VIEWS
-- ====================================================================

-- View tổng quan dashboard cho admin
CREATE OR REPLACE VIEW admin_dashboard_overview AS
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE is_banned = TRUE) AS banned_users,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_last_30_days,
    (SELECT COUNT(*) FROM tasks) AS total_tasks,
    (SELECT COUNT(*) FROM events) AS total_events,
    (SELECT COUNT(*) FROM messages) AS total_messages,
    (SELECT COUNT(*) FROM system_notifications WHERE is_active = TRUE) AS active_notifications;

COMMENT ON VIEW admin_dashboard_overview IS 'Tổng quan thống kê cho admin dashboard';

-- ====================================================================
-- HOÀN TẤT
-- ====================================================================

-- Log kết quả
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Tables: users, categories, tasks, events, shared_events,';
    RAISE NOTICE '        chat_groups, group_members, messages, alarm_sounds,';
    RAISE NOTICE '        notifications, otp_codes, activity_logs, user_sessions,';
    RAISE NOTICE '        sprints, conversations, admin_logs, system_notifications,';
    RAISE NOTICE '        user_activity_stats';
    RAISE NOTICE '====================================';
END $$;
