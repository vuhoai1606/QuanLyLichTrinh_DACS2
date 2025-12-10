-- TEST: Query settings từ JSONB
-- Chạy trong PostgreSQL để test

-- 1. Xem tất cả settings của users
SELECT user_id, username, language, is_2fa_enabled, settings 
FROM users 
LIMIT 5;

-- 2. Query users có theme = 'dark'
SELECT user_id, username, settings->>'theme' as theme 
FROM users 
WHERE settings->>'theme' = 'dark';

-- 3. Query users bật notifications
SELECT user_id, username, settings->'notifications' as notifications
FROM users 
WHERE (settings->>'notifications')::boolean = true;

-- 4. Update settings cho 1 user cụ thể
-- UPDATE users 
-- SET settings = jsonb_set(settings, '{theme}', '"light"')
-- WHERE user_id = 1;

-- 5. Thêm field mới vào settings
-- UPDATE users 
-- SET settings = settings || '{"darkMode": false}'::jsonb
-- WHERE user_id = 1;

-- 6. Performance test với index
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE settings @> '{"theme": "dark"}'::jsonb;
