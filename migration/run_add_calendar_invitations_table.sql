-- run_add_calendar_invitations_table.sql
-- Migration để tạo bảng lưu lời mời chia sẻ lịch (Calendar Invitations)

CREATE TABLE IF NOT EXISTS calendar_invitations (
    invitation_id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    invite_email VARCHAR(255) NOT NULL,
    permissions VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permissions IN ('view', 'edit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE NULL,
    accepted_by INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL
);

-- Index để tìm nhanh theo token (rất quan trọng cho route accept-invite)
CREATE INDEX IF NOT EXISTS idx_calendar_invitations_token ON calendar_invitations(token);

-- Index hỗ trợ tìm theo email (nếu cần quản lý sau này)
CREATE INDEX IF NOT EXISTS idx_calendar_invitations_email ON calendar_invitations(invite_email);

-- Index hỗ trợ dọn dẹp invitation cũ (nếu bạn muốn thêm cron job xóa sau 30 ngày)
CREATE INDEX IF NOT EXISTS idx_calendar_invitations_created_at ON calendar_invitations(created_at);

-- Comment mô tả bảng (tùy chọn nhưng rất hữu ích)
COMMENT ON TABLE calendar_invitations IS 'Lưu trữ lời mời chia sẻ lịch cá nhân giữa các user';
COMMENT ON COLUMN calendar_invitations.token IS 'Token duy nhất để xác thực lời mời (hex 64 ký tự)';
COMMENT ON COLUMN calendar_invitations.permissions IS 'Quyền được cấp: view (chỉ xem) hoặc edit (chỉnh sửa)';
COMMENT ON COLUMN calendar_invitations.accepted_at IS 'Thời điểm người nhận chấp nhận lời mời';