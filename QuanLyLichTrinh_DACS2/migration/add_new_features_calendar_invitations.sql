-- ============================================
-- MIGRATION: Thêm tính năng Calendar Invitations và Google Calendar Integration
-- Từ backup.sql → quanlylichtrinh1.sql
-- Date: 2026-01-03
-- ============================================

BEGIN;

-- ========================================
-- 1. TẠO BẢNG MỚI: calendar_invitations
-- ========================================

CREATE SEQUENCE IF NOT EXISTS public.calendar_invitations_invitation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.calendar_invitations (
    invitation_id integer NOT NULL DEFAULT nextval('public.calendar_invitations_invitation_id_seq'::regclass),
    token character varying(64) NOT NULL,
    sender_id integer NOT NULL,
    invite_email character varying(255) NOT NULL,
    permissions character varying(20) DEFAULT 'view'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    accepted_by integer,
    CONSTRAINT calendar_invitations_pkey PRIMARY KEY (invitation_id),
    CONSTRAINT calendar_invitations_token_key UNIQUE (token),
    CONSTRAINT calendar_invitations_permissions_check CHECK (((permissions)::text = ANY ((ARRAY['view'::character varying, 'edit'::character varying])::text[]))),
    CONSTRAINT calendar_invitations_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT calendar_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);

ALTER SEQUENCE public.calendar_invitations_invitation_id_seq OWNED BY public.calendar_invitations.invitation_id;

CREATE INDEX IF NOT EXISTS idx_calendar_invitations_token ON public.calendar_invitations USING btree (token);
CREATE INDEX IF NOT EXISTS idx_calendar_invitations_email ON public.calendar_invitations USING btree (invite_email);
CREATE INDEX IF NOT EXISTS idx_calendar_invitations_created_at ON public.calendar_invitations USING btree (created_at);

COMMENT ON TABLE public.calendar_invitations IS 'Lời mời chia sẻ lịch cho người dùng khác';

-- ========================================
-- 2. THÊM CỘT MỚI VÀO BẢNG events
-- Google Calendar Integration
-- ========================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_event_id character varying(255);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS google_etag character varying(255);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurrence text[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurring_event_id text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_recurring_instance boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS original_start_time timestamp without time zone;

COMMENT ON COLUMN public.events.google_event_id IS 'ID sự kiện từ Google Calendar';
COMMENT ON COLUMN public.events.google_etag IS 'ETag từ Google Calendar để sync';
COMMENT ON COLUMN public.events.recurrence IS 'Quy tắc lặp lại của Google Calendar (RRULE)';
COMMENT ON COLUMN public.events.recurring_event_id IS 'ID của sự kiện gốc nếu đây là instance của sự kiện lặp';
COMMENT ON COLUMN public.events.is_recurring_instance IS 'Đánh dấu đây có phải là instance của sự kiện lặp không';
COMMENT ON COLUMN public.events.original_start_time IS 'Thời gian bắt đầu gốc của sự kiện lặp';

-- ========================================
-- 3. THÊM CỘT MỚI VÀO BẢNG tasks
-- Category Support
-- ========================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category_id integer;

-- Thêm foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_category_id_fkey'
    ) THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_category_id_fkey 
            FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks USING btree (category_id);

COMMENT ON COLUMN public.tasks.category_id IS 'Danh mục của task';

-- ========================================
-- 4. THÊM CỘT MỚI VÀO BẢNG users
-- Google OAuth & 2FA Support
-- ========================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_access_token text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_refresh_token text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_calendar_id character varying(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_channel_id character varying(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_channel_expiration timestamp with time zone;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_sync_token text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_google_sync_at timestamp without time zone;

COMMENT ON COLUMN public.users.google_access_token IS 'Access token từ Google OAuth';
COMMENT ON COLUMN public.users.google_refresh_token IS 'Refresh token từ Google OAuth';
COMMENT ON COLUMN public.users.google_calendar_id IS 'ID của Google Calendar chính';
COMMENT ON COLUMN public.users.google_channel_id IS 'ID kênh push notification từ Google Calendar';
COMMENT ON COLUMN public.users.google_channel_expiration IS 'Thời gian hết hạn kênh push notification';
COMMENT ON COLUMN public.users.totp_secret IS 'Secret key cho TOTP 2FA';
COMMENT ON COLUMN public.users.google_sync_token IS 'Token để sync incremental với Google Calendar';
COMMENT ON COLUMN public.users.last_google_sync_at IS 'Lần sync cuối với Google Calendar';

-- Thêm constraint mới cho phone_number (kiểm tra chính xác 10 số)
DO $$ 
BEGIN
    -- Xóa constraint cũ nếu có
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_phone_number;
    
    -- Thêm constraint mới
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_number_check'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_phone_number_check 
            CHECK (((phone_number IS NULL) OR ((phone_number)::text ~ '^[0-9]{10}$'::text)));
    END IF;
END $$;

-- ========================================
-- 5. THÊM CỘT MỚI VÀO BẢNG system_notifications
-- Extended Notification Period
-- ========================================

ALTER TABLE public.system_notifications ADD COLUMN IF NOT EXISTS end_date timestamp without time zone;

COMMENT ON COLUMN public.system_notifications.end_date IS 'Ngày kết thúc hiển thị thông báo';
COMMENT ON TABLE public.system_notifications IS 'Thông báo toàn hệ thống do admin tạo (banner, popup, urgent messages)';

-- ========================================
-- 6. TẠO INDEXES MỚI
-- ========================================

CREATE INDEX IF NOT EXISTS idx_system_notifications_active 
    ON public.system_notifications USING btree (is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_sprints_user 
    ON public.sprints USING btree (user_id);

-- ========================================
-- 7. KẾT THÚC MIGRATION
-- ========================================

COMMIT;

-- ========================================
-- VERIFICATION QUERIES (Run manually to verify)
-- ========================================

-- Kiểm tra bảng calendar_invitations đã được tạo
-- SELECT COUNT(*) FROM calendar_invitations;

-- Kiểm tra cột mới trong events
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('google_event_id', 'google_etag', 'recurrence', 'recurring_event_id', 'is_recurring_instance', 'original_start_time');

-- Kiểm tra cột mới trong tasks
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'category_id';

-- Kiểm tra cột mới trong users
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('google_access_token', 'google_refresh_token', 'google_calendar_id', 'google_channel_id', 'google_channel_expiration', 'totp_secret', 'google_sync_token', 'last_google_sync_at');

-- Kiểm tra cột mới trong system_notifications
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'system_notifications' AND column_name = 'end_date';
