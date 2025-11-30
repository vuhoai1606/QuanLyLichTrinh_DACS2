-- Migration script để khởi tạo database
-- Chạy file này trong PostgreSQL để tạo các bảng cần thiết

-- =======================================
-- 1. BẢNG USERS - Quản lý người dùng
-- =======================================
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Mã hóa bằng bcrypt
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    avatar_url VARCHAR(255),
    remember_token VARCHAR(255), -- Token để ghi nhớ đăng nhập
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);

-- Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================================
-- 2. BẢNG CATEGORIES - Phân loại sự kiện
-- =======================================
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#4285F4', -- Mã màu hex
    is_default BOOLEAN DEFAULT FALSE, -- Phân loại mặc định (tên người dùng)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_category ON categories(user_id, category_id);

-- =======================================
-- 3. BẢNG TASKS - Quản lý công việc
-- =======================================
DO $$ BEGIN
    CREATE TYPE repeat_type_enum AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_enum AS ENUM ('pending', 'in_progress', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP, -- Optional
    is_all_day BOOLEAN DEFAULT FALSE,
    repeat_type repeat_type_enum DEFAULT 'none',
    priority priority_enum DEFAULT 'medium',
    status status_enum DEFAULT 'pending',
    kanban_column VARCHAR(50) DEFAULT 'todo', -- Cột trong Kanban
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_task ON tasks(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_status ON tasks(status);

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================================
-- 4. BẢNG EVENTS - Quản lý sự kiện
-- =======================================
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    repeat_type repeat_type_enum DEFAULT 'none',
    alarm_enabled BOOLEAN DEFAULT FALSE,
    alarm_time TIMESTAMP, -- Thời gian báo thức
    alarm_sound_url VARCHAR(255), -- Đường dẫn âm thanh báo thức
    color VARCHAR(7) DEFAULT '#4285F4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location TEXT;
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_event ON events(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_time ON events(start_time, end_time);

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================================
-- 5. BẢNG SHARED_EVENTS - Chia sẻ sự kiện
-- =======================================
DO $$ BEGIN
    CREATE TYPE share_type_enum AS ENUM ('shared', 'copied');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_enum AS ENUM ('view', 'edit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS shared_events (
    share_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    owner_id INT NOT NULL, -- Người chia sẻ
    shared_with_user_id INT NOT NULL, -- Người được chia sẻ
    share_type share_type_enum NOT NULL, -- Kiểu 1: shared, Kiểu 2: copied
    permission permission_enum DEFAULT 'view', -- Quyền truy cập
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_share UNIQUE (event_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_user ON shared_events(shared_with_user_id);

-- =======================================
-- 6. BẢNG GROUPS - Nhóm chat
-- =======================================
CREATE TABLE IF NOT EXISTS chat_groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    group_description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator ON chat_groups(created_by);

-- =======================================
-- 7. BẢNG GROUP_MEMBERS - Thành viên nhóm
-- =======================================
CREATE TABLE IF NOT EXISTS group_members (
    member_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES chat_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_user ON group_members(group_id, user_id);

-- =======================================
-- 8. BẢNG MESSAGES - Tin nhắn
-- =======================================
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT, -- NULL nếu là tin nhắn nhóm
    group_id INT, -- NULL nếu là tin nhắn 1-1
    message_content TEXT NOT NULL,
    attachment_url VARCHAR(255), -- Đính kèm file
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

CREATE INDEX IF NOT EXISTS idx_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_group ON messages(group_id);

-- =======================================
-- 9. BẢNG ALARM_SOUNDS - Âm thanh báo thức
-- =======================================
CREATE TABLE IF NOT EXISTS alarm_sounds (
    sound_id SERIAL PRIMARY KEY,
    user_id INT, -- NULL nếu là âm thanh mặc định của hệ thống
    sound_name VARCHAR(100) NOT NULL,
    sound_url VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE, -- Âm thanh mặc định
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sound ON alarm_sounds(user_id);

-- =======================================
-- 10. BẢNG NOTIFICATIONS - Thông báo
-- =======================================
DO $$ BEGIN
    CREATE TYPE notification_type_enum AS ENUM ('task', 'event', 'message', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type notification_type_enum DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redirect_url TEXT,
    related_id INT;
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notif ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS sprints (
    sprint_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index để tìm nhanh theo user
CREATE INDEX IF NOT EXISTS idx_sprints_user ON sprints(user_id);
