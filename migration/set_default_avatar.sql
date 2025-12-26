-- migration/set_default_avatar.sql
-- Set avatar mặc định cho tất cả users chưa có avatar

-- Avatar mặc định: /img/default-avatar.jpg
UPDATE users 
SET avatar_url = '/img/default-avatar.jpg'
WHERE avatar_url IS NULL OR avatar_url = '';

-- Log kết quả
SELECT COUNT(*) as updated_users 
FROM users 
WHERE avatar_url = '/img/default-avatar.jpg';
