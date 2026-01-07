# 🎯 CHỈ ĐỊNH CHÍNH XÁC TỪ TỪNG DÒNG - CÁC CÂUU LỆNH KẾT NỐI SQL

---

## 📌 FILE: `server.js`

### ✅ **Dòng 11** - IMPORT POOL
```javascript
const pool = require('./config/db');
```
👉 **Giải thích**: Import connection pool từ `config/db.js`  
🔗 **Kết nối tới**: PostgreSQL pool được khởi tạo trong `config/db.js`

---

### ✅ **Dòng 79-84** - SESSION STORE SỬ DỤNG POOL
```javascript
app.use(session({
  store: new pgSession({
    pool: pool, // ← DÒNG 81: Truyền pool vào pgSession
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
```
👉 **Giải thích**: Sử dụng PostgreSQL pool để lưu session vào database  
🔗 **Thực tế**: Mỗi khi user login, session được lưu vào bảng `user_sessions`

---

## 📌 FILE: `config/db.js`

### ✅ **Dòng 1-2** - IMPORT REQUIRED MODULES
```javascript
const { Pool } = require('pg');
require('dotenv').config();
```

### ✅ **Dòng 4-16** - KHỞI TẠO CONNECTION POOL
```javascript
const pool = new Pool({
  host: process.env.DB_HOST,           // ← Dòng 5: localhost
  port: process.env.DB_PORT,           // ← Dòng 6: 5432
  database: process.env.DB_NAME,       // ← Dòng 7: QuanLyLichTrinh
  user: process.env.DB_USER,           // ← Dòng 8: postgres
  password: process.env.DB_PASSWORD,   // ← Dòng 9: v01215335600
  max: 10,                             // ← Dòng 10: Max 10 connections
  min: 2,                              // ← Dòng 11: Min 2 connections
  idleTimeoutMillis: 10000,            // ← Dòng 12: Timeout 10 giây
  connectionTimeoutMillis: 3000,       // ← Dòng 13: Connect timeout 3 giây
  keepAlive: true,                     // ← Dòng 14: Giữ connection sống
  keepAliveInitialDelayMillis: 10000,  // ← Dòng 15: Delay 10 giây
});                                     // ← Dòng 16: Kết thúc pool config
```
👉 **Giải thích**: Tạo connection pool kết nối tới PostgreSQL  
🔗 **Connection String**: `postgresql://postgres:v01215335600@localhost:5432/QuanLyLichTrinh`

### ✅ **Dòng 19-22** - EVENT LISTENERS
```javascript
pool.on('connect', () => {
  if (!hasConnected) {
    console.log('✅ Kết nối PostgreSQL thành công!');
    hasConnected = true;
  }
});
```
👉 **Giải thích**: Lắng nghe sự kiện kết nối thành công

---

## 📌 FILE: `middleware/authMiddleware.js`

### ✅ **Dòng 1** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 19-24** - SQL QUERY ĐẦU TIÊN
```javascript
try {
    const result = await pool.query(
      'SELECT user_id, username, is_banned, ban_reason FROM users WHERE user_id = $1',
      [req.session.userId]
    );
```
📍 **Location**: `middleware/authMiddleware.js`, dòng 20-23  
🔍 **SQL Query**:
```sql
SELECT user_id, username, is_banned, ban_reason 
FROM users 
WHERE user_id = $1
```
📤 **Parameters**: `[req.session.userId]` → Lấy user_id từ session  
📥 **Kết quả**: Kiểm tra xem tài khoản có bị khóa không

---

## 📌 FILE: `middleware/adminMiddleware.js`

### ✅ **Dòng 7** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 21-24** - SQL QUERY KIỂM TRA ADMIN
```javascript
const result = await pool.query(
  'SELECT user_id, username, role, is_banned, ban_reason FROM users WHERE user_id = $1',
  [req.session.userId]
);
```
📍 **Location**: `middleware/adminMiddleware.js`, dòng 21-24  
🔍 **SQL Query**:
```sql
SELECT user_id, username, role, is_banned, ban_reason 
FROM users 
WHERE user_id = $1
```
📤 **Parameters**: `[req.session.userId]`  
📥 **Kết quả**: Kiểm tra role và banned status của admin

---

## 📌 FILE: `controllers/authController.js`

### ✅ **Dòng 79** - IMPORT POOL TRONG FUNCTION
```javascript
const pool = require('../config/db');
```
📍 **Location**: `controllers/authController.js`, dòng 79

### ✅ **Dòng 80** - UPDATE LAST LOGIN
```javascript
await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [result.user.user_id]);
```
📍 **Location**: `controllers/authController.js`, dòng 80  
🔍 **SQL Query**:
```sql
UPDATE users 
SET last_login_at = NOW() 
WHERE user_id = $1
```
📤 **Parameters**: `[result.user.user_id]`  
📥 **Kết quả**: Cập nhật thời gian login cuối cùng

---

### ✅ **Dòng 179** - IMPORT POOL (SECOND TIME)
```javascript
const pool = require('../config/db');
```
📍 **Location**: `controllers/authController.js`, dòng 179 (Google Login)

### ✅ **Dòng 180** - UPDATE LAST LOGIN (GOOGLE)
```javascript
await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [result.user.user_id]);
```
📍 **Location**: `controllers/authController.js`, dòng 180

---

### ✅ **Dòng 258** - IMPORT POOL (THIRD TIME)
```javascript
const pool = require('../config/db');
```
📍 **Location**: `controllers/authController.js`, dòng 258 (Verify 2FA)

### ✅ **Dòng 259** - UPDATE LAST LOGIN (2FA)
```javascript
await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [result.user.user_id]);
```
📍 **Location**: `controllers/authController.js`, dòng 259

---

### ✅ **Dòng 419** - IMPORT POOL (FORGOT PASSWORD)
```javascript
const pool = require('../config/db');
```
📍 **Location**: `controllers/authController.js`, dòng 419

### ✅ **Dòng 423** - SELECT USER BY EMAIL
```javascript
const result = await pool.query(
  'SELECT user_id, email FROM users WHERE email = $1',
  [email]
);
```
📍 **Location**: `controllers/authController.js`, dòng 423-426  
🔍 **SQL Query**:
```sql
SELECT user_id, email 
FROM users 
WHERE email = $1
```
📤 **Parameters**: `[email]`

---

### ✅ **Dòng 547** - IMPORT POOL (RESEND OTP)
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 553** - UPDATE OTP DATA
```javascript
await pool.query(
  'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3',
  [otpCode, otpExpiresAt, email]
);
```
📍 **Location**: `controllers/authController.js`, dòng 553-556  
🔍 **SQL Query**:
```sql
UPDATE users 
SET otp_code = $1, otp_expires_at = $2 
WHERE email = $3
```
📤 **Parameters**: `[otpCode, otpExpiresAt, email]`

---

## 📌 FILE: `controllers/googleController.js`

### ✅ **Dòng 4** - IMPORT POOL
```javascript
const pool = require('../config/db'); // Dùng DB pool của bạn
```
📍 **Location**: `controllers/googleController.js`, dòng 4

### ✅ **Dòng 21** - SELECT GOOGLE TOKENS
```javascript
const result = await pool.query(
  'SELECT user_id, google_refresh_token, google_channel_id FROM users WHERE user_id = $1', 
  [userId]
);
```
📍 **Location**: `controllers/googleController.js`, dòng 21  
🔍 **SQL Query**:
```sql
SELECT user_id, google_refresh_token, google_channel_id 
FROM users 
WHERE user_id = $1
```

### ✅ **Dòng 138** - UPDATE GOOGLE TOKENS
```javascript
await pool.query(`
  UPDATE users 
  SET 
    google_access_token = $1,
    google_refresh_token = $2,
    google_channel_id = $3,
    google_channel_expiration = $4
  WHERE user_id = $5
`, [access_token, refresh_token, channel_id, channel_expiration, userId]);
```
📍 **Location**: `controllers/googleController.js`, dòng 138-147

### ✅ **Dòng 196** - SELECT USER BY CHANNEL_ID
```javascript
const result = await pool.query(
  'SELECT user_id FROM users WHERE google_channel_id = $1',
  [channel_id]
);
```
📍 **Location**: `controllers/googleController.js`, dòng 196-199

### ✅ **Dòng 224** - SELECT ALL USER INFO
```javascript
const { rows: [user] } = await pool.query(
  'SELECT * FROM users WHERE user_id = $1', 
  [userId]
);
```
📍 **Location**: `controllers/googleController.js`, dòng 224

### ✅ **Dòng 242** - UPDATE GOOGLE SYNC INFO
```javascript
await pool.query(`
  UPDATE users 
  SET google_channel_id = $1, google_channel_expiration = $2 
  WHERE user_id = $3
`, [channel_id, next_expiration, userId]);
```
📍 **Location**: `controllers/googleController.js`, dòng 242-246

---

## 📌 FILE: `controllers/taskController.js`

### ✅ **Dòng 4** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 142** - CHECK TASK EXISTS
```javascript
const check = await pool.query(
  'SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2',
  [taskId, userId]
);
```
📍 **Location**: `controllers/taskController.js`, dòng 142-145

### ✅ **Dòng 173-175** - DYNAMIC UPDATE TASK
```javascript
const query = `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = $${index} RETURNING *`;
const result = await pool.query(query, values);
```
📍 **Location**: `controllers/taskController.js`, dòng 173-175

### ✅ **Dòng 435** - SELECT KANBAN TASKS
```javascript
const { rows } = await pool.query(
  `SELECT * FROM tasks WHERE user_id = $1 ORDER BY status`,
  [userId]
);
```
📍 **Location**: `controllers/taskController.js`, dòng 435-438

### ✅ **Dòng 451, 459, 474** - UPDATE TASK STATUS
```javascript
await pool.query(
  'UPDATE tasks SET status = $1 WHERE task_id = $2',
  [newStatus, taskId]
);
```
📍 **Location**: `controllers/taskController.js`, dòng 451-454, 459-462, 474-477

### ✅ **Dòng 501** - SELECT TASK DETAILS
```javascript
const { rows } = await pool.query(
  'SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2',
  [taskId, userId]
);
```
📍 **Location**: `controllers/taskController.js`, dòng 501-504

### ✅ **Dòng 526** - BEGIN TRANSACTION
```javascript
const client = await pool.connect();
// ...
await client.query('BEGIN');
// ... SQL queries
await client.query('COMMIT');
```
📍 **Location**: `controllers/taskController.js`, dòng 526-538  
🔍 **Ghi chú**: Transaction để đảm bảo tất cả queries thành công hoặc tất cả fail

---

## 📌 FILE: `controllers/profileController.js`

### ✅ **Dòng 2** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 43-66** - DYNAMIC UPDATE PROFILE
```javascript
let updateQuery = `UPDATE users SET full_name = $1, date_of_birth = $2, gender = $3, phone_number = $4`;
// ... build query dynamically
const result = await pool.query(updateQuery, queryParams);
```
📍 **Location**: `controllers/profileController.js`, dòng 43-66

### ✅ **Dòng 110** - CHECK EMAIL EXISTS
```javascript
const userResult = await pool.query(
  'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
  [newEmail, userId]
);
```
📍 **Location**: `controllers/profileController.js`, dòng 110-113

### ✅ **Dòng 237** - UPDATE PASSWORD
```javascript
await pool.query(
  'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
  [newPasswordHash, userId]
);
```
📍 **Location**: `controllers/profileController.js`, dòng 237-240

### ✅ **Dòng 265** - DELETE USER (NGUY HIỂM!)
```javascript
await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
```
📍 **Location**: `controllers/profileController.js`, dòng 265  
⚠️ **CHÚ Ý**: XÓA TOÀN BỘ DỮ LIỆU USER!

### ✅ **Dòng 289** - SELECT USER INFO
```javascript
const result = await pool.query(
  'SELECT * FROM users WHERE user_id = $1',
  [userId]
);
```
📍 **Location**: `controllers/profileController.js`, dòng 289-292

### ✅ **Dòng 355** - SELECT CURRENT PASSWORD
```javascript
const currentResult = await pool.query(
  'SELECT password_hash FROM users WHERE user_id = $1',
  [userId]
);
```
📍 **Location**: `controllers/profileController.js`, dòng 355-358

### ✅ **Dòng 381-388** - UPDATE SETTINGS JSONB
```javascript
const query = `UPDATE users SET settings = $1 WHERE user_id = $2 RETURNING language, is_2fa_enabled, settings`;
const result = await pool.query(query, params);
```
📍 **Location**: `controllers/profileController.js`, dòng 381-388

---

## 📌 FILE: `controllers/eventController.js`

### ✅ **Dòng 5** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 24** - AUTO REFRESH TOKEN
```javascript
await pool.query(
  'UPDATE users SET google_access_token = $1, google_refresh_token = $2 WHERE user_id = $3',
  [newAccessToken, newRefreshToken, userId]
);
```
📍 **Location**: `controllers/eventController.js`, dòng 24-27

### ✅ **Dòng 185, 302, 393** - SELECT USER
```javascript
const { rows: [user] } = await pool.query(
  'SELECT * FROM users WHERE user_id = $1',
  [userId]
);
```
📍 **Location**: `controllers/eventController.js`, dòng 185, 302, 393

### ✅ **Dòng 221** - INSERT EVENT
```javascript
await pool.query(
  'INSERT INTO events (user_id, title, start_time, end_time) VALUES ($1, $2, $3, $4)',
  [userId, title, startTime, endTime]
);
```
📍 **Location**: `controllers/eventController.js`, dòng 221-224

---

## 📌 FILE: `controllers/timelineController.js`

### ✅ **Dòng 2** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 10** - SELECT SPRINTS
```javascript
const sprintsRes = await pool.query(
  'SELECT * FROM sprints WHERE user_id = $1',
  [userId]
);
```
📍 **Location**: `controllers/timelineController.js`, dòng 10-13

### ✅ **Dòng 19** - SELECT TASKS
```javascript
const tasksRes = await pool.query(
  'SELECT * FROM tasks WHERE user_id = $1',
  [userId]
);
```
📍 **Location**: `controllers/timelineController.js`, dòng 19-22

### ✅ **Dòng 36** - SELECT MILESTONES
```javascript
const milestonesRes = await pool.query(
  'SELECT * FROM milestones WHERE user_id = $1',
  [userId]
);
```
📍 **Location**: `controllers/timelineController.js`, dòng 36-39

### ✅ **Dòng 77** - INSERT SPRINT
```javascript
const result = await pool.query(
  'INSERT INTO sprints (user_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
  [userId, name, startDate, endDate]
);
```
📍 **Location**: `controllers/timelineController.js`, dòng 77-80

---

## 📌 FILE: `services/taskService.js`

### ✅ **Dòng 1** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 30-95** - BUILD DYNAMIC QUERY
```javascript
let query = `SELECT * FROM tasks WHERE user_id = $1`;
// Add filters dynamically
if (filters.status) query += ` AND status = $${paramIndex}`;
// ...
const result = await pool.query(query, params);
```
📍 **Location**: `services/taskService.js`, dòng 30-95

### ✅ **Dòng 122** - SELECT TASK BY ID
```javascript
const result = await pool.query(
  'SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2',
  [taskId, userId]
);
```
📍 **Location**: `services/taskService.js`, dòng 122-125

### ✅ **Dòng 185** - INSERT NEW TASK
```javascript
const result = await pool.query(
  `INSERT INTO tasks (user_id, title, description) VALUES ($1, $2, $3) RETURNING *`,
  [userId, title, description]
);
```
📍 **Location**: `services/taskService.js`, dòng 185-188

---

## 📌 FILE: `services/notificationService.js`

### ✅ **Dòng 2** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 22-29** - INSERT NOTIFICATION
```javascript
const query = `
  INSERT INTO notifications (user_id, type, title, message, redirect_url, related_id)
  VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
`;
const result = await pool.query(query, [userId, type, title, message, redirectUrl, relatedId]);
```
📍 **Location**: `services/notificationService.js`, dòng 22-29

### ✅ **Dòng 42-60** - SELECT NOTIFICATIONS
```javascript
let query = `SELECT * FROM notifications WHERE user_id = $1`;
if (filter === 'unread') query += ' AND is_read = false';
query += ' ORDER BY created_at DESC LIMIT 50';
const res = await pool.query(query, values);
```
📍 **Location**: `services/notificationService.js`, dòng 42-60

### ✅ **Dòng 86** - MARK AS READ
```javascript
await pool.query(
  'UPDATE notifications SET is_read = true WHERE notification_id = $1', 
  [id]
);
```
📍 **Location**: `services/notificationService.js`, dòng 86-88

### ✅ **Dòng 91** - MARK ALL AS READ
```javascript
await pool.query(
  'UPDATE notifications SET is_read = true WHERE user_id = $1', 
  [userId]
);
```
📍 **Location**: `services/notificationService.js`, dòng 91-93

---

## 📌 FILE: `services/reportService.js`

### ✅ **Dòng 3** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 9** - SELECT TASK STATUS REPORT
```javascript
const { rows } = await pool.query(
  `SELECT status, COUNT(*) as count FROM tasks WHERE user_id = $1 GROUP BY status`,
  [userId]
);
```
📍 **Location**: `services/reportService.js`, dòng 9-12

### ✅ **Dòng 21-35** - SELECT EVENT REPORT
```javascript
let query = `SELECT c.category_name, COUNT(*) as count FROM events e...`;
const { rows } = await pool.query(query, params);
```
📍 **Location**: `services/reportService.js`, dòng 21-35

---

## 📌 FILE: `services/notificationScheduler.js`

### ✅ **Dòng 2** - IMPORT POOL
```javascript
const pool = require('../config/db');
```

### ✅ **Dòng 52** - SELECT SYSTEM NOTIFICATIONS
```javascript
const query = `
  SELECT * FROM system_notifications 
  WHERE displayed_at IS NULL AND now_display <= NOW()
`;
```
📍 **Location**: `services/notificationScheduler.js`, dòng 52

---

## 📌 FILE: `config/googleSyncScheduler.js`

### ✅ **Dòng 3** - IMPORT POOL
```javascript
const pool = require('./db');
```

### ✅ **Dòng 13** - SELECT USERS WITH GOOGLE
```javascript
const { rows } = await pool.query(`
  SELECT user_id FROM users WHERE google_refresh_token IS NOT NULL
`);
```
📍 **Location**: `config/googleSyncScheduler.js`, dòng 13

---

## 📌 FILE: `.env` - CONFIGURATION (NHẠY CẢM!)

```env
# PostgreSQL Configuration
DB_HOST=localhost          ← Hostname
DB_PORT=5432              ← Port
DB_NAME=QuanLyLichTrinh   ← Database name
DB_USER=postgres          ← Username
DB_PASSWORD=v01215335600  ← PASSWORD (KEEP SECRET!)

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=clonevclone00@gmail.com
EMAIL_PASSWORD=tybuwughnmfojtvn

# Google OAuth
GOOGLE_CLIENT_ID=782580850896-scdrgpulhcsqseak9fmn1vfon3itj8ms.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

---

## 📊 TÓM TẮT

| Loại | Số Lượng | Ví Dụ |
|------|----------|-------|
| **SELECT** | 25+ | `SELECT * FROM users WHERE user_id = $1` |
| **UPDATE** | 20+ | `UPDATE users SET ... WHERE user_id = $1` |
| **INSERT** | 10+ | `INSERT INTO notifications ... VALUES (...)` |
| **DELETE** | 1 | `DELETE FROM users WHERE user_id = $1` |
| **Transaction** | 1 | BEGIN/COMMIT/ROLLBACK |

---

## 🚨 QUERIES NGUY HIỂM

⚠️ **DELETE USER** - `controllers/profileController.js`, dòng 265
```javascript
await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
```

---

Tạo bởi: GitHub Copilot  
Ngày: 2026-01-06  
✅ Hoàn thành mapping tất cả SQL connections
