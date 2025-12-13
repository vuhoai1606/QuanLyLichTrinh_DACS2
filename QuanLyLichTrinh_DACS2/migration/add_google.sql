-- Thêm cột vào bảng users
ALTER TABLE users
    ADD COLUMN google_access_token text,
    ADD COLUMN google_refresh_token text,
    ADD COLUMN google_calendar_id character varying(255),
    ADD COLUMN google_channel_id character varying(255),
    ADD COLUMN google_channel_expiration timestamp with time zone;

-- Thêm cột vào bảng events
ALTER TABLE events
    ADD COLUMN google_event_id character varying(255),
    ADD COLUMN google_etag character varying(255);

-- Nếu bạn muốn đồng bộ tasks riêng biệt, làm tương tự cho bảng tasks
-- ALTER TABLE tasks ADD COLUMN google_task_id character varying(255);