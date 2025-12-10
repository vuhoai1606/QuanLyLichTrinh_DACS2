-- Migration: Thêm các tính năng còn thiếu từ backup2
-- Created: 2025-12-08
-- Description: Thêm bảng sprints, cột calendar_type vào tasks, cột role vào users

-- ================================================
-- 1. TẠO BẢNG SPRINTS (nếu chưa có)
-- ================================================
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

CREATE INDEX IF NOT EXISTS idx_user_sprint ON sprints(user_id, sprint_id);

-- Trigger tự động cập nhật updated_at cho sprints
DROP TRIGGER IF EXISTS update_sprints_updated_at ON sprints;
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sprints IS 'Bảng quản lý sprint cho agile project management';

-- ================================================
-- 2. THÊM CỘT CALENDAR_TYPE VÀO TASKS (nếu chưa có)
-- ================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'calendar_type'
    ) THEN
        ALTER TABLE tasks ADD COLUMN calendar_type VARCHAR(50) DEFAULT 'Work';
        COMMENT ON COLUMN tasks.calendar_type IS 'Loại lịch: Work, Personal, etc.';
    END IF;
END $$;

-- ================================================
-- 3. THÊM CỘT ROLE VÀO USERS (nếu chưa có)
-- ================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL;
        COMMENT ON COLUMN users.role IS 'Vai trò: admin hoặc user';
        
        -- Thêm constraint
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

-- Tạo index cho role để tối ưu query
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ================================================
-- KẾT THÚC MIGRATION
-- ================================================
-- Migration completed successfully!
