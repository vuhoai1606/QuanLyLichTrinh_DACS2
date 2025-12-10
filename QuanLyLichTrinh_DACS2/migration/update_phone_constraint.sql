-- Migration: Cập nhật constraint cho phone_number (chỉ 10 số)
-- Run: node migration/run_update_phone_constraint.js

-- Xóa dữ liệu phone_number không hợp lệ (nếu có)
UPDATE users 
SET phone_number = NULL 
WHERE phone_number IS NOT NULL 
  AND (LENGTH(phone_number) != 10 OR phone_number !~ '^[0-9]{10}$');

-- Thay đổi kiểu dữ liệu và thêm constraint
ALTER TABLE users 
ALTER COLUMN phone_number TYPE VARCHAR(10);

-- Thêm constraint CHECK
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS check_phone_number;

ALTER TABLE users 
ADD CONSTRAINT check_phone_number 
CHECK (phone_number IS NULL OR phone_number ~ '^[0-9]{10}$');

-- Update comment
COMMENT ON COLUMN users.phone_number IS 'Số điện thoại (tùy chọn, đúng 10 số)';

SELECT 'Phone number constraint updated successfully!' AS result;
