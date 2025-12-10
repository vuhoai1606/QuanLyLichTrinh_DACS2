-- Migration: Cập nhật bảng messages để hỗ trợ nhiều loại tin nhắn
-- Ngày: 2025-12-08
-- Mục đích: Thêm message_type để phân biệt text/image/file/video

-- 1. Tạo ENUM cho message_type
DO $$ BEGIN
    CREATE TYPE message_type_enum AS ENUM ('text', 'image', 'file', 'video');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Thêm cột message_type vào bảng messages
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_type message_type_enum DEFAULT 'text';
    END IF;
END $$;

-- 3. Thêm cột file_name để lưu tên file gốc
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'file_name'
    ) THEN
        ALTER TABLE messages ADD COLUMN file_name VARCHAR(255);
    END IF;
END $$;

-- 4. Thêm cột file_size để lưu kích thước file (bytes)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'file_size'
    ) THEN
        ALTER TABLE messages ADD COLUMN file_size BIGINT;
    END IF;
END $$;

-- 5. Cập nhật index để tăng hiệu suất tìm kiếm tin nhắn 1-1
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, sent_at DESC);

-- 6. Index để tìm tin nhắn chưa đọc
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- 7. Index để tìm tin nhắn theo loại
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- 8. Bảng conversations để theo dõi cuộc trò chuyện (tối ưu hiệu suất)
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id SERIAL PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    last_message_id INT,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count_user1 INT DEFAULT 0,
    unread_count_user2 INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (last_message_id) REFERENCES messages(message_id) ON DELETE SET NULL,
    CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id),
    CONSTRAINT check_different_users CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id, last_message_at DESC);

-- 9. Trigger tự động cập nhật conversations khi có tin nhắn mới
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    smaller_id INT;
    larger_id INT;
    conversation_exists BOOLEAN;
BEGIN
    -- Chỉ xử lý tin nhắn 1-1 (không phải group)
    IF NEW.receiver_id IS NOT NULL AND NEW.group_id IS NULL THEN
        -- Đảm bảo user1_id < user2_id
        IF NEW.sender_id < NEW.receiver_id THEN
            smaller_id := NEW.sender_id;
            larger_id := NEW.receiver_id;
        ELSE
            smaller_id := NEW.receiver_id;
            larger_id := NEW.sender_id;
        END IF;

        -- Kiểm tra conversation đã tồn tại chưa
        SELECT EXISTS(
            SELECT 1 FROM conversations 
            WHERE user1_id = smaller_id AND user2_id = larger_id
        ) INTO conversation_exists;

        IF conversation_exists THEN
            -- Cập nhật conversation hiện có
            UPDATE conversations SET
                last_message_id = NEW.message_id,
                last_message_at = NEW.sent_at,
                updated_at = CURRENT_TIMESTAMP,
                unread_count_user2 = CASE 
                    WHEN NEW.receiver_id = larger_id THEN unread_count_user2 + 1
                    ELSE unread_count_user2
                END,
                unread_count_user1 = CASE 
                    WHEN NEW.receiver_id = smaller_id THEN unread_count_user1 + 1
                    ELSE unread_count_user1
                END
            WHERE user1_id = smaller_id AND user2_id = larger_id;
        ELSE
            -- Tạo conversation mới
            INSERT INTO conversations (user1_id, user2_id, last_message_id, last_message_at, unread_count_user1, unread_count_user2)
            VALUES (
                smaller_id, 
                larger_id, 
                NEW.message_id, 
                NEW.sent_at,
                CASE WHEN NEW.receiver_id = smaller_id THEN 1 ELSE 0 END,
                CASE WHEN NEW.receiver_id = larger_id THEN 1 ELSE 0 END
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Xóa trigger cũ nếu tồn tại
DROP TRIGGER IF EXISTS trigger_update_conversation ON messages;

-- Tạo trigger mới
CREATE TRIGGER trigger_update_conversation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- 10. Function để đánh dấu tin nhắn đã đọc
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_user_id INT, p_other_user_id INT)
RETURNS VOID AS $$
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

    -- Reset unread count trong conversations
    IF p_user_id < p_other_user_id THEN
        smaller_id := p_user_id;
        larger_id := p_other_user_id;
        UPDATE conversations 
        SET unread_count_user1 = 0
        WHERE user1_id = smaller_id AND user2_id = larger_id;
    ELSE
        smaller_id := p_other_user_id;
        larger_id := p_user_id;
        UPDATE conversations 
        SET unread_count_user2 = 0
        WHERE user1_id = smaller_id AND user2_id = larger_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Hoàn tất!
SELECT 'Migration update_messages_table.sql completed successfully!' AS status;
