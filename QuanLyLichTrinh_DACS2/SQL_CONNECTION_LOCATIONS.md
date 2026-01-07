# 📍 Danh Sách Các Vị Trí Chứa Câu Lệnh Kết Nối SQL

## 📌 TÓM TẮT
Project sử dụng **PostgreSQL** với connection pool từ thư viện `pg`. Dưới đây là danh sách tất cả các file chứa câu lệnh kết nối SQL.

---

## 🔴 FILE CHÍNH QUẢN LÝ KẾT NỐI

### 1. **`config/db.js`** - ⭐ FILE CHÍNH KHỞI TẠO POOL
```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,           // localhost
  port: process.env.DB_PORT,           // 5432
  database: process.env.DB_NAME,       // QuanLyLichTrinh
  user: process.env.DB_USER,           // postgres
  password: process.env.DB_PASSWORD,   // v01215335600
  max: 10,                             // Max connections
  min: 2,                              // Min connections
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});
```
📍 **Vị trí**: `d:\abc\QuanLyLichTrinh_DACS2\QuanLyLichTrinh_DACS2\config\db.js`

---

### 2. **`.env`** - CẤU HÌNH KẾT NỐI (NHẠY CẢM)
```env
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=QuanLyLichTrinh
DB_USER=postgres
DB_PASSWORD=v01215335600

# Email SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=clonevclone00@gmail.com
EMAIL_PASSWORD=tybuwughnmfojtvn

# Google OAuth
GOOGLE_CLIENT_ID=782580850896-scdrgpulhcsqseak9fmn1vfon3itj8ms.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```
📍 **Vị trí**: `d:\abc\QuanLyLichTrinh_DACS2\QuanLyLichTrinh_DACS2\.env`
⚠️ **CHỈ SỬ DỤNG TỪ `.env`, KHÔNG HỌC VÀO GIT**

---

## 🟠 CÁC FILE IMPORT `pool` TỪ `config/db.js`

### **MIDDLEWARE** (Kiểm tra auth)
| File | Dòng | Nội dung |
|------|------|---------|
| `middleware/authMiddleware.js` | 1 | `const pool = require('../config/db');` |
| `middleware/authMiddleware.js` | 21 | `const result = await pool.query(...)` |
| `middleware/adminMiddleware.js` | 7 | `const pool = require('../config/db');` |
| `middleware/adminMiddleware.js` | 21 | `const result = await pool.query(...)` |

---

### **CONTROLLERS** (Xử lý request)

#### 📍 `controllers/authController.js`
- Dòng 79: `const pool = require('../config/db');`
- Dòng 80: `await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [result.user.user_id]);`
- Dòng 179, 258: Update last_login_at
- Dòng 419: SQL query SELECT từ users
- Dòng 547: SQL query UPDATE users

#### 📍 `controllers/eventController.js`
- Dòng 5: `const pool = require('../config/db');`
- Dòng 24: `await pool.query(...)` - Auto-refresh token
- Dòng 185, 302, 393: SELECT queries lấy thông tin user
- Dòng 221: UPDATE/INSERT events

#### 📍 `controllers/googleController.js`
- Dòng 4: `const pool = require('../config/db');`
- Dòng 21: `const result = await pool.query('SELECT user_id, google_refresh_token, google_channel_id FROM users WHERE user_id = $1', [userId]);`
- Dòng 38, 84: UPDATE users (commented out)
- Dòng 138: `await pool.query(...)` - INSERT/UPDATE Google tokens
- Dòng 196: Query user từ channel_id
- Dòng 224: `const { rows: [user] } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);`
- Dòng 242: UPDATE users với Google channel info

#### 📍 `controllers/taskController.js`
- Dòng 4: `const pool = require('../config/db');`
- Dòng 142: `const check = await pool.query(...)` - Kiểm tra task tồn tại
- Dòng 173, 175: Dynamic SQL UPDATE tasks
- Dòng 435: SELECT tasks cho kanban
- Dòng 451, 459, 474: UPDATE tasks
- Dòng 501: SELECT tasks
- Dòng 526-538: **Transaction** - BEGIN/COMMIT/ROLLBACK

#### 📍 `controllers/profileController.js`
- Dòng 2: `const pool = require('../config/db');`
- Dòng 43-66: Build dynamic UPDATE query cho profile
- Dòng 110: `const userResult = await pool.query(...)` - Check email
- Dòng 237: UPDATE password
- Dòng 265: `await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);` - ⚠️ DELETE USER
- Dòng 289: SELECT user info
- Dòng 355: SELECT user current info
- Dòng 381-388: Update JSONB settings

#### 📍 `controllers/kanbanController.js`
- Dòng 10: Lấy filters từ req.query

#### 📍 `controllers/timelineController.js`
- Dòng 2: `const pool = require('../config/db');`
- Dòng 10, 19, 36: SELECT sprints, tasks, milestones
- Dòng 77: INSERT sprint

---

### **SERVICES** (Business logic)

#### 📍 `services/authService.js`
- Cấu hình 2FA (speakeasy, qrcode)
- Password validation, OTP verification
- Google OAuth integration

#### 📍 `services/taskService.js`
- Dòng 1: `const pool = require('../config/db');`
- Dòng 30-95: Build dynamic queries với filters
- Dòng 122, 185, 281-320: SELECT/INSERT/UPDATE tasks
- Dòng 95: `const result = await pool.query(query, params);`

#### 📍 `services/eventService.js`
- Event CRUD operations
- Calendar sync logic

#### 📍 `services/messageService.js`
- Search users, get conversations
- Message queries

#### 📍 `services/notificationService.js`
- Dòng 2: `const pool = require('../config/db');`
- Dòng 22-29: INSERT notification
- Dòng 42-60: SELECT notifications với filter
- Dòng 63: Count unread notifications
- Dòng 86: UPDATE notifications (mark as read)
- Dòng 91: UPDATE tất cả notifications của user

#### 📍 `services/reportService.js`
- Dòng 3: `const pool = require('../config/db');`
- Dòng 9-80: Complex SQL queries for reports
- Task status report, event type report, period reports

#### 📍 `services/adminService.js`
- Dashboard overview queries
- User management queries
- Audit logs queries

#### 📍 `services/notificationScheduler.js`
- Dòng 2: `const pool = require('../config/db');`
- Scheduler để check system notifications

---

### **CONFIG FILES**

#### 📍 `config/googleSyncScheduler.js`
- Dòng 3: `const pool = require('./db');`
- Dòng 13: `const { rows } = await pool.query(...)` - Watch channel queries

---

## 🔵 MIGRATION FILES (SQL Scripts)

Tất cả file SQL để khởi tạo/cập nhật database:

| File | Mục đích |
|------|---------|
| `migration/init_database.sql` | Tạo bảng cơ bản (users, tasks, events, etc.) |
| `migration/full_schema.sql` | Toàn bộ schema database |
| `migration/add_2fa_column.sql` | Thêm 2FA, language, settings |
| `migration/add_admin_system.sql` | Admin logs, system notifications |
| `migration/add_ban_columns.sql` | is_banned, ban_reason, ban_date |
| `migration/add_google.sql` | Google OAuth tokens |
| `migration/add_missing_columns_only.sql` | Thêm location, message_type |
| `migration/add_profile_fields.sql` | Gender, phone_number |
| `migration/add_task_overdue_fields.sql` | is_overdue, grace_end_time |
| `migration/create_user_sessions_table.sql` | Session store table |
| `migration/update_database.sql` | Email verification, OTP |
| `migration/update_messages_table.sql` | Message types, file names |
| `migration/update_phone_constraint.sql` | Phone number validation |

📍 **Vị trí**: `d:\abc\QuanLyLichTrinh_DACS2\QuanLyLichTrinh_DACS2\migration\`

---

## 🟡 ROUTES (API Endpoints)

Tất cả routes sử dụng database qua controllers:

| File | Mục đích |
|------|---------|
| `routes/index.js` | Main router |
| `routes/authRoutes.js` | Login, Register, Logout |
| `routes/taskRoutes.js` | Task CRUD |
| `routes/eventRoutes.js` | Event/Calendar CRUD |
| `routes/kanbanRoutes.js` | Kanban board |
| `routes/messageRoutes.js` | Messaging |
| `routes/notificationRoutes.js` | Notifications |
| `routes/profileRoutes.js` | User profile |
| `routes/adminRoutes.js` | Admin panel |
| `routes/reportRoutes.js` | Reports |
| `routes/timelineRoutes.js` | Timeline/Sprint |
| `routes/googleRoutes.js` | Google OAuth |
| `routes/calendarRoutes.js` | Calendar invitations |

---

## 🟢 SERVER.JS - ĐIỂM KHỞI ĐẦU

📍 **Vị trí**: `d:\abc\QuanLyLichTrinh_DACS2\QuanLyLichTrinh_DACS2\server.js`

```javascript
// Dòng 11: Import pool
const pool = require('./config/db');

// Dòng 35: Export socket.io globally
global.io = io;

// Dòng 39: Track online users
global.onlineUsers = onlineUsers;
```

---

## 📊 TỔNG THỐNG

| Loại File | Số Lượng | Ghi Chú |
|-----------|----------|--------|
| Controllers với `pool` | 8 | authController, eventController, googleController, kanbanController, taskController, profileController, timelineController, messageController |
| Services với `pool` | 6 | authService, taskService, notificationService, reportService, adminService, notificationScheduler |
| Middleware với `pool` | 2 | authMiddleware, adminMiddleware |
| Migration SQL files | 13 | Schema + seed data |
| Routes | 13 | Định nghĩa endpoints |

---

## ⚠️ NHẠY CẢM - CREDENTIALS

**NHỮNG THÔNG TIN CẦN BẢO MẬT:**

```env
DB_PASSWORD=v01215335600                    # ⚠️ DB Password
JWT_SECRET=v01215335600                     # ⚠️ JWT Secret
EMAIL_PASSWORD=tybuwughnmfojtvn             # ⚠️ Gmail App Password
GOOGLE_CLIENT_SECRET=GOCSPX-Cm7Ryo8a...    # ⚠️ Google Secret
```

**ACTION ITEMS:**
- ✅ KHÔNG commit `.env` vào Git
- ✅ Thêm `.env` vào `.gitignore` (đã có)
- ✅ Use environment variables cho deployment

---

## 🔗 KỲ VỌNG CONNECTION STRING

```
postgresql://postgres:v01215335600@localhost:5432/QuanLyLichTrinh
```

---

## 📋 QUICK REFERENCE

**Để thêm query SQL mới:**
1. Import `const pool = require('../config/db');`
2. Viết query: `await pool.query(sqlString, [params])`
3. Dùng `$1, $2, ...` cho parameterized queries
4. Xử lý errors với try-catch

**Ví dụ:**
```javascript
const { rows } = await pool.query(
  'SELECT * FROM users WHERE user_id = $1',
  [userId]
);
```

---

**Tạo bởi**: GitHub Copilot  
**Ngày**: 2026-01-06  
**Status**: ✅ Tất cả SQL connections đã được mapping
