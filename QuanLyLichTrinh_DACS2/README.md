# 📚 QUẢN LÝ LỊCH TRÌNH - Hướng dẫn đầy đủ cho Sinh viên

## 📖 MỤC LỤC

1. [Giới thiệu dự án](#giới-thiệu-dự-án)
2. [Cài đặt từ đầu](#cài-đặt-từ-đầu)
3. [Hiểu kiến trúc MVC + Services](#hiểu-kiến-trúc-mvc--services)
4. [Những gì đã làm xong](#những-gì-đã-làm-xong)
5. [Những gì BẠN cần làm tiếp](#những-gì-bạn-cần-làm-tiếp)
6. [Hướng dẫn code chi tiết](#hướng-dẫn-code-chi-tiết)
7. [Giải thích từng phần](#giải-thích-từng-phần)

---

## 🎯 GIỚI THIỆU DỰ ÁN

Đây là web app quản lý lịch trình cá nhân với các tính năng:

✅ **Authentication nâng cao:**

- Đăng ký với xác thực OTP qua email
- Mật khẩu bắt buộc có chữ + số, tối thiểu 6 ký tự
- Captcha chống bot
- Đăng nhập Google OAuth

✅ **Quản lý Tasks:**

- CRUD đầy đủ (Create, Read, Update, Delete)
- Filter theo status, priority
- Search theo keyword
- Thống kê tasks

✅ **Quản lý Events (Calendar):**

- Tạo sự kiện với thời gian, địa điểm
- Xem theo tháng
- Link meeting online
- Kiểm tra conflict thời gian

✅ **Kiến trúc chuẩn:**

- Backend: Routes → Controllers → Services → Models
- Frontend: Chỉ xử lý UI + gọi API
- Database: PostgreSQL với migration scripts

---

## 💻 CÀI ĐẶT TỪ ĐẦU

### Bước 1: Chuẩn bị môi trường

**Cài đặt cần thiết:**

- Node.js (v14+): https://nodejs.org/
- PostgreSQL (v12+): https://www.postgresql.org/download/
- VS Code hoặc IDE bất kỳ

### Bước 2: Tạo Database

Mở **pgAdmin** hoặc **psql**, chạy:

```sql
CREATE DATABASE QuanLyLichTrinh;
```

### Bước 3: Clone project và cài packages

```bash
cd "d:\lập trình\Năm 2 kì 1\Đồ án\DACS2\QuanLiLichTrinh"
npm install
```

### Bước 4: Cấu hình file .env

File `.env` đã có sẵn. Bạn CẦN SỬA các thông tin sau:

```env
# PostgreSQL - SỬA password của bạn
DB_PASSWORD=your_postgres_password

# Email - CẦN CẤU HÌNH để gửi OTP
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Google OAuth - CẦN CẤU HÌNH để đăng nhập Google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

**Hướng dẫn lấy Gmail App Password:**

1. Vào: https://myaccount.google.com/apppasswords
2. Đăng nhập Gmail của bạn
3. Chọn "Mail" và "Other (Custom name)"
4. Nhập tên: `QuanLyLichTrinh`
5. Click "Generate"
6. Copy mật khẩu 16 ký tự (có dạng: `abcd efgh ijkl mnop`)
7. Paste vào `EMAIL_PASSWORD` trong .env

**Hướng dẫn lấy Google OAuth:**

1. Vào: https://console.cloud.google.com/
2. Tạo project mới: "QuanLyLichTrinh"
3. Enable APIs: **Google+ API**
4. Tạo credentials → OAuth 2.0 Client IDs
5. Application type: Web application
6. Authorized redirect URIs: `http://localhost:8888/auth/google/callback`
7. Copy Client ID và Client Secret vào .env

### Bước 5: Chạy Migration (Tạo tables)

```bash
node migration/runMigration.js
node migration/runUpdate.js
```

Kết quả:

```
✅ Migration hoàn tất!
📊 Database đã được khởi tạo thành công.
✅ Cập nhật database hoàn tất!
```

### Bước 6: Chạy server

```bash
npm run dev
```

Truy cập: http://localhost:8888

---

## 🏗️ HIỂU KIẾN TRÚC MVC + SERVICES

### Kiến trúc CŨ (SAI ❌):

```
Frontend (assets/js/tasks.js)
    ↓
Xử lý TẤT CẢ logic ngay trong browser
    ↓
Lưu vào localStorage (không an toàn)
```

**Vấn đề:**

- Logic lộ ra ngoài → User có thể hack
- Không thể làm mobile app
- Code lộn xộn, khó maintain

### Kiến trúc MỚI (ĐÚNG ✅):

```
Frontend           Routes              Controllers         Services            Models
(assets/js)     (định tuyến)        (điều phối)     (logic nghiệp vụ)   (database)
    │                 │                   │                  │                 │
    │  HTTP Request   │                   │                  │                 │
    ├────────────────→│  Tìm endpoint     │                  │                 │
    │                 ├──────────────────→│  Gọi service     │                 │
    │                 │                   ├─────────────────→│  Query DB       │
    │                 │                   │                  ├────────────────→│
    │                 │                   │                  │  Return data    │
    │                 │                   │  Return data     │←────────────────│
    │                 │  JSON Response    │←─────────────────│                 │
    │←────────────────│←──────────────────│                  │                 │
    │                 │                   │                  │                 │
 Hiển thị UI
```

### Giải thích chi tiết từng layer:

#### 1. **Routes** (Menu nhà hàng) - File: `routes/*.js`

```javascript
// routes/taskRoutes.js
router.get("/api/tasks", taskController.getTasks);
router.post("/api/tasks", taskController.createTask);
```

- **Nhiệm vụ:** Định tuyến URL → Controller nào xử lý
- **Ví dụ:** GET `/api/tasks` → gọi `taskController.getTasks`

#### 2. **Controllers** (Người bồi bàn) - File: `controllers/*.js`

```javascript
// controllers/taskController.js
exports.getTasks = async (req, res) => {
  try {
    const userId = req.session.userId; // Lấy user từ session
    const tasks = await taskService.getTasksByUser(userId); // Gọi service
    res.json({ success: true, tasks }); // Trả về JSON
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

- **Nhiệm vụ:**
  - Nhận request từ Routes
  - Lấy dữ liệu từ req.body, req.params, req.session
  - Gọi Service để xử lý
  - Trả response (JSON hoặc render view)
- **KHÔNG làm:** Business logic, validation phức tạp, tính toán

#### 3. **Services** (Người đầu bếp) - File: `services/*.js`

```javascript
// services/taskService.js
class TaskService {
  async getTasksByUser(userId) {
    // Validation
    if (!userId) throw new Error('User ID required');

    // Query database với điều kiện phức tạp
    const query = `
      SELECT t.*, c.category_name
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE t.user_id = $1
      ORDER BY t.start_time DESC
    `;

    const result = await pool.query(query, [userId]);

    // Xử lý data (nếu cần)
    return result.rows;
  }

  async createTask(userId, taskData) {
    // Validation phức tạp
    if (taskData.title.length > 255) {
      throw new Error('Tiêu đề quá dài');
    }

    if (taskData.endTime < taskData.startTime) {
      throw new Error('Thời gian không hợp lệ');
    }

    // Business logic: Kiểm tra conflict
    const hasConflict = await this.checkConflict(userId, taskData);
    if (hasConflict) {
      console.warn('Task trùng giờ với task khác');
    }

    // Insert vào DB
    const result = await pool.query(
      'INSERT INTO tasks (...) VALUES (...) RETURNING *',
      [userId, taskData.title, ...]
    );

    return result.rows[0];
  }
}
```

- **Nhiệm vụ:**
  - Validation phức tạp
  - Business logic (tính toán, điều kiện nghiệp vụ)
  - Tương tác với nhiều Models
  - Gọi các service khác (emailService, ...)
  - Xử lý data trước khi trả về

#### 4. **Models** (Nguyên liệu) - File: `models/*.js`

```javascript
// models/User.js
class User {
  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, ...) VALUES ($1, $2, ...) RETURNING *',
      [userData.username, hashedPassword, ...]
    );
    return result.rows[0];
  }
}
```

- **Nhiệm vụ:**
  - CRUD database đơn giản
  - Không có business logic
  - Chỉ tương tác với 1 table (hoặc vài table liên quan)

#### 5. **Frontend** (Khách hàng) - File: `assets/js/*.js`

```javascript
// assets/js/tasks.js
async function loadTasks() {
  // GỌI API
  const response = await fetch("/api/tasks");
  const data = await response.json();

  // HIỂN THỊ UI
  if (data.success) {
    displayTasks(data.tasks);
  }
}

function displayTasks(tasks) {
  const container = document.getElementById("task-list");
  container.innerHTML = tasks
    .map(
      (task) => `
    <div class="task">
      <h3>${task.title}</h3>
      <p>${task.description}</p>
    </div>
  `
    )
    .join("");
}
```

- **Nhiệm vụ:**
  - Gọi API với fetch/axios
  - Hiển thị dữ liệu lên UI
  - Xử lý events (click, submit, ...)
  - KHÔNG có business logic

---

## ✅ NHỮNG GÌ ĐÃ LÀM XONG

### 1. Database Schema

- ✅ Bảng `users` với các cột:

  - `user_id`, `username`, `email`, `password_hash`
  - `is_email_verified` (xác thực email chưa)
  - `google_id` (đăng nhập Google)
  - `avatar_url`, `login_provider`

- ✅ Bảng `otp_codes` (lưu mã OTP):

  - `email`, `otp_code`, `purpose`, `expires_at`

- ✅ Bảng `tasks` với các cột mới:

  - `tags` (array), `progress` (0-100), `collaborators`

- ✅ Bảng `events` với:
  - `meeting_link`, `tags`, `location_lat/lng`

### 2. Services (Business Logic)

- ✅ **authService.js**:

  - `validatePassword()` - Kiểm tra pass có chữ + số
  - `initiateRegistration()` - Gửi OTP
  - `completeRegistration()` - Verify OTP và tạo user
  - `login()` - Đăng nhập thông thường
  - `loginWithGoogle()` - OAuth Google

- ✅ **emailService.js**:

  - `sendOTPEmail()` - Gửi email OTP với template đẹp
  - `sendWelcomeEmail()` - Email chào mừng

- ✅ **taskService.js**:

  - `getTasksByUser()` - Lấy tasks với filter, search
  - `createTask()` - Tạo task với validation
  - `updateTask()` - Cập nhật task
  - `deleteTask()` - Xóa task

- ✅ **eventService.js**:
  - `getEventsByMonth()` - Lấy events theo tháng
  - `createEvent()` - Tạo event với validation
  - `checkTimeConflict()` - Kiểm tra trùng giờ

### 3. Controllers

- ✅ **authController.js** (ĐÃ CẬP NHẬT):

  - `initiateRegistration()` - Nhận request đăng ký, gọi authService
  - `verifyOTP()` - Xác thực OTP
  - `login()` - Đăng nhập với captcha
  - `googleLogin()` - Đăng nhập Google
  - `generateCaptcha()` - Tạo captcha SVG

- ⚠️ **taskController.js** (CẦN CẬP NHẬT)
- ⚠️ **eventController.js** (CẦN CẬP NHẬT)

### 4. Views

- ✅ **verify-otp.ejs** - Trang nhập OTP (đã tạo)
- ⚠️ Các view khác cần update

### 5. Migration

- ✅ `init_database.sql` - Tạo tables ban đầu
- ✅ `update_database.sql` - Thêm OTP, Google OAuth
- ✅ Scripts chạy migration

### 6. Packages đã cài

- ✅ `nodemailer` - Gửi email
- ✅ `google-auth-library` - Google OAuth
- ✅ `svg-captcha` - Tạo captcha
- ✅ `express-validator` - Validation

---

## 🚧 NHỮNG GÌ BẠN CẦN LÀM TIẾP

### NHIỆM VỤ 1: Cập nhật Routes cho Authentication

**File cần sửa:** `routes/authRoutes.js`

**Tìm dòng:**

```javascript
const router = require("express").Router();
const authController = require("../controllers/authController");
```

**Thêm vào sau các routes cũ:**

```javascript
// ============ ROUTES MỚI - OTP & Google OAuth ============

// Bước 1: Khởi tạo đăng ký (gửi OTP)
router.post("/api/register/initiate", authController.initiateRegistration);

// Bước 2: Xác thực OTP
router.post("/api/register/verify-otp", authController.verifyOTP);

// Gửi lại OTP
router.post("/api/register/resend-otp", authController.resendOTP);

// Tạo captcha
router.get("/api/captcha", authController.generateCaptcha);

// Google OAuth
router.post("/api/auth/google", authController.googleLogin);

// Trang verify OTP
router.get("/verify-otp", authController.showVerifyOTPPage);
```

**Giải thích:**

- `initiateRegistration`: User điền form → Gửi OTP qua email
- `verifyOTP`: User nhập OTP → Tạo tài khoản
- `resendOTP`: Nếu không nhận được OTP → Gửi lại
- `generateCaptcha`: Tạo ảnh captcha để hiển thị
- `googleLogin`: Nhận Google token → Đăng nhập/Đăng ký

### NHIỆM VỤ 2: Cập nhật Task Controller

**File cần sửa:** `controllers/taskController.js`

**BACKUP file cũ trước:**

```bash
Copy-Item controllers/taskController.js controllers/taskController.js.old
```

**Thay thế toàn bộ nội dung:**

```javascript
const taskService = require("../services/taskService");

/**
 * TASK CONTROLLER - Sử dụng taskService
 * Giải thích: Controller chỉ nhận request và gọi service
 */

// Lấy danh sách tasks
exports.getTasks = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Lấy filters từ query string
    const filters = {
      status: req.query.status, // ?status=pending
      priority: req.query.priority, // ?priority=high
      search: req.query.search, // ?search=nodejs
      sortBy: req.query.sortBy || "created_at",
      sortOrder: req.query.sortOrder || "DESC",
    };

    // Gọi service để lấy tasks
    const tasks = await taskService.getTasksByUser(userId, filters);

    res.json({
      success: true,
      tasks: tasks,
    });
  } catch (error) {
    console.error("Lỗi get tasks:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy 1 task theo ID
exports.getTaskById = async (req, res) => {
  try {
    const userId = req.session.userId;
    const taskId = req.params.id;

    const task = await taskService.getTaskById(taskId, userId);

    res.json({
      success: true,
      task: task,
    });
  } catch (error) {
    console.error("Lỗi get task:", error);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Tạo task mới
exports.createTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const taskData = req.body;

    // Gọi service để tạo task (có validation trong service)
    const task = await taskService.createTask(userId, taskData);

    res.json({
      success: true,
      message: "Tạo task thành công!",
      task: task,
    });
  } catch (error) {
    console.error("Lỗi create task:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Cập nhật task
exports.updateTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const taskId = req.params.id;
    const updateData = req.body;

    const task = await taskService.updateTask(taskId, userId, updateData);

    res.json({
      success: true,
      message: "Cập nhật task thành công!",
      task: task,
    });
  } catch (error) {
    console.error("Lỗi update task:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Xóa task
exports.deleteTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const taskId = req.params.id;

    await taskService.deleteTask(taskId, userId);

    res.json({
      success: true,
      message: "Xóa task thành công!",
    });
  } catch (error) {
    console.error("Lỗi delete task:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Cập nhật status (quick action)
exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = req.session.userId;
    const taskId = req.params.id;
    const { status } = req.body;

    const task = await taskService.updateTaskStatus(taskId, userId, status);

    res.json({
      success: true,
      task: task,
    });
  } catch (error) {
    console.error("Lỗi update status:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Thống kê tasks
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.session.userId;
    const stats = await taskService.getTaskStatistics(userId);

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    console.error("Lỗi get statistics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
```

**Cập nhật routes/taskRoutes.js:**

```javascript
// Thêm route thống kê
router.get("/api/tasks/statistics", requireAuth, taskController.getStatistics);
```

### NHIỆM VỤ 3: Cập nhật Event Controller

Tương tự Task Controller, tạo file mới `controllers/eventController.js`:

```javascript
const eventService = require("../services/eventService");

exports.getEvents = async (req, res) => {
  try {
    const userId = req.session.userId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      categoryId: req.query.categoryId,
    };

    const events = await eventService.getEventsByUser(userId, filters);

    res.json({
      success: true,
      events: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getEventsByMonth = async (req, res) => {
  try {
    const userId = req.session.userId;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const events = await eventService.getEventsByMonth(userId, year, month);

    res.json({
      success: true,
      events: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const event = await eventService.createEvent(userId, req.body);

    res.json({
      success: true,
      message: "Tạo event thành công!",
      event: event,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const eventId = req.params.id;
    const event = await eventService.updateEvent(eventId, userId, req.body);

    res.json({
      success: true,
      event: event,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    const eventId = req.params.id;
    await eventService.deleteEvent(eventId, userId);

    res.json({
      success: true,
      message: "Xóa event thành công!",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
```

**Cập nhật routes/eventRoutes.js:**

```javascript
const router = require("express").Router();
const eventController = require("../controllers/eventController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/api/events", requireAuth, eventController.getEvents);
router.get("/api/events/month", requireAuth, eventController.getEventsByMonth);
router.post("/api/events", requireAuth, eventController.createEvent);
router.put("/api/events/:id", requireAuth, eventController.updateEvent);
router.delete("/api/events/:id", requireAuth, eventController.deleteEvent);

module.exports = router;
```

### NHIỆM VỤ 4: Cập nhật Register Page (Thêm Captcha + Validation)

**File:** `views/register.ejs`

**Tìm form đăng ký, thêm VÀO TRƯỚC nút "Đăng ký":**

```html
<!-- Password Requirements (hiển thị yêu cầu mật khẩu) -->
<div
  class="password-requirements"
  style="font-size: 13px; color: #666; margin-top: -10px; margin-bottom: 15px;"
>
  <strong>Mật khẩu phải có:</strong>
  <ul style="margin: 5px 0; padding-left: 20px; list-style: none;">
    <li id="req-length" style="color: #999;">
      <span id="icon-length">⭕</span> Ít nhất 6 ký tự
    </li>
    <li id="req-letter" style="color: #999;">
      <span id="icon-letter">⭕</span> Có chữ cái (a-z, A-Z)
    </li>
    <li id="req-number" style="color: #999;">
      <span id="icon-number">⭕</span> Có số (0-9)
    </li>
  </ul>
</div>

<!-- Captcha -->
<div class="form-group">
  <label for="captchaText">Mã xác thực</label>
  <div
    style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;"
  >
    <img
      id="captcha-image"
      src="/api/captcha"
      alt="Captcha"
      style="border: 1px solid #ddd; border-radius: 4px; height: 80px;"
    />
    <button
      type="button"
      onclick="refreshCaptcha()"
      style="padding: 10px 15px; cursor: pointer; border: 1px solid #ddd; background: white; border-radius: 4px;"
    >
      🔄 Đổi mã
    </button>
  </div>
  <input
    type="text"
    id="captchaText"
    name="captchaText"
    placeholder="Nhập mã xác thực"
    required
    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"
  />
</div>
```

**Thêm JavaScript VÀO CUỐI file (trước thẻ `</body>`):**

```html
<script>
  // ===== PASSWORD VALIDATION REAL-TIME =====
  const passwordInput = document.getElementById("password");

  passwordInput.addEventListener("input", (e) => {
    const pass = e.target.value;

    // Kiểm tra độ dài
    const hasLength = pass.length >= 6;
    updateRequirement("length", hasLength);

    // Kiểm tra có chữ cái
    const hasLetter = /[a-zA-Z]/.test(pass);
    updateRequirement("letter", hasLetter);

    // Kiểm tra có số
    const hasNumber = /[0-9]/.test(pass);
    updateRequirement("number", hasNumber);
  });

  function updateRequirement(type, isValid) {
    const element = document.getElementById(`req-${type}`);
    const icon = document.getElementById(`icon-${type}`);

    if (isValid) {
      element.style.color = "green";
      icon.textContent = "✅";
    } else {
      element.style.color = "#999";
      icon.textContent = "⭕";
    }
  }

  // ===== CAPTCHA =====
  function refreshCaptcha() {
    document.getElementById("captcha-image").src =
      "/api/captcha?" + new Date().getTime();
  }

  // ===== FORM SUBMIT =====
  const form = document.getElementById("register-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Lấy dữ liệu form
    const formData = {
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      email: document.getElementById("email").value.trim(),
      fullName: document.getElementById("fullName").value.trim(),
      dateOfBirth: document.getElementById("dateOfBirth").value || null,
      captchaText: document.getElementById("captchaText").value.trim(),
    };

    // Validate password trước khi gửi
    if (formData.password.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    if (!/[a-zA-Z]/.test(formData.password)) {
      alert("Mật khẩu phải có chữ cái!");
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      alert("Mật khẩu phải có số!");
      return;
    }

    // Gửi request
    try {
      const response = await fetch("/api/register/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert("Mã OTP đã được gửi đến email của bạn!");
        // Chuyển đến trang nhập OTP
        window.location.href = "/verify-otp";
      } else {
        alert("Lỗi: " + data.message);
        refreshCaptcha(); // Refresh captcha nếu lỗi
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
      refreshCaptcha();
    }
  });
</script>
```

### NHIỆM VỤ 5: Cập nhật Login Page (Thêm Captcha + Google)

**File:** `views/login.ejs`

**Thêm TRƯỚC nút "Đăng nhập":**

```html
<!-- Captcha -->
<div class="form-group">
  <label for="captchaText">Mã xác thực</label>
  <div
    style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;"
  >
    <img
      id="captcha-image"
      src="/api/captcha"
      alt="Captcha"
      style="border: 1px solid #ddd; border-radius: 4px; height: 80px;"
    />
    <button
      type="button"
      onclick="refreshCaptcha()"
      style="padding: 10px 15px; cursor: pointer; border: 1px solid #ddd; background: white; border-radius: 4px;"
    >
      🔄 Đổi mã
    </button>
  </div>
  <input
    type="text"
    id="captchaText"
    name="captchaText"
    placeholder="Nhập mã xác thực"
    required
  />
</div>
```

**Thêm SAU nút "Đăng nhập":**

```html
<!-- Divider -->
<div style="margin: 30px 0; position: relative; text-align: center;">
  <hr style="border: 0; border-top: 1px solid #ddd;" />
  <span
    style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
               background: white; padding: 0 15px; color: #999; font-size: 14px;"
  >
    Hoặc đăng nhập bằng
  </span>
</div>

<!-- Google OAuth Button -->
<div
  id="google-signin-container"
  style="display: flex; justify-content: center;"
>
  <div
    id="g_id_onload"
    data-client_id="<%= process.env.GOOGLE_CLIENT_ID %>"
    data-callback="handleGoogleLogin"
    data-auto_prompt="false"
  ></div>

  <div
    class="g_id_signin"
    data-type="standard"
    data-shape="rectangular"
    data-theme="outline"
    data-text="signin_with"
    data-size="large"
    data-logo_alignment="left"
  ></div>
</div>

<!-- Load Google Identity Services -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**JavaScript (thêm vào cuối file):**

```html
<script>
  // Captcha
  function refreshCaptcha() {
    document.getElementById("captcha-image").src =
      "/api/captcha?" + new Date().getTime();
  }

  // Google Login Callback
  function handleGoogleLogin(response) {
    console.log("Google token received:", response.credential);

    fetch("/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        googleToken: response.credential,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(data.message);
          window.location.href = "/";
        } else {
          alert("Lỗi: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Có lỗi xảy ra khi đăng nhập với Google");
      });
  }

  // Form submit (login thông thường)
  const loginForm = document.getElementById("login-form");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      rememberMe: document.getElementById("remember-me")?.checked || false,
      captchaText: document.getElementById("captchaText").value.trim(),
    };

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/";
      } else {
        alert("Lỗi: " + data.message);
        refreshCaptcha();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Có lỗi xảy ra");
      refreshCaptcha();
    }
  });
</script>
```

### NHIỆM VỤ 6: Tạo Seeder (Dữ liệu mẫu)

**Tạo file:** `seeder/userSeeder.js`

```javascript
const pool = require("../config/db");
const bcrypt = require("bcrypt");

/**
 * SEEDER: Tạo users mẫu để test
 * Giải thích: Seeder là các file để insert dữ liệu mẫu vào DB
 * Dùng khi develop để không phải tạo data thủ công
 */
async function seedUsers() {
  try {
    console.log("🌱 Đang seed users...");

    const users = [
      {
        username: "admin",
        password: "admin123", // Có chữ + số, >= 6 ký tự
        email: "admin@example.com",
        fullName: "Administrator",
      },
      {
        username: "testuser",
        password: "test123",
        email: "test@example.com",
        fullName: "Nguyễn Văn Test",
      },
    ];

    for (const user of users) {
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Insert user (ON CONFLICT = nếu đã tồn tại thì bỏ qua)
      await pool.query(
        `INSERT INTO users (username, password_hash, email, full_name, is_email_verified)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [user.username, hashedPassword, user.email, user.fullName]
      );

      console.log(
        `✅ Đã tạo user: ${user.username} (password: ${user.password})`
      );
    }

    console.log("🎉 Seed users hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi seed users:", error);
    throw error;
  }
}

module.exports = seedUsers;
```

**Tạo file:** `seeder/index.js`

```javascript
const seedUsers = require("./userSeeder");

/**
 * CHẠY TẤT CẢ SEEDERS
 */
async function runAllSeeders() {
  try {
    console.log("🌱🌱🌱 BẮT ĐẦU SEEDING...\n");

    // Chạy từng seeder
    await seedUsers();
    // await seedCategories(); // Có thể thêm sau
    // await seedTasks();
    // await seedEvents();

    console.log("\n✅✅✅ HOÀN TẤT TẤT CẢ SEEDERS!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌❌❌ LỖI KHI SEED:", error);
    process.exit(1);
  }
}

runAllSeeders();
```

**Chạy seeder:**

```bash
node seeder/index.js
```

**Kết quả:**

```
🌱 Đang seed users...
✅ Đã tạo user: admin (password: admin123)
✅ Đã tạo user: testuser (password: test123)
🎉 Seed users hoàn tất!
✅✅✅ HOÀN TẤT TẤT CẢ SEEDERS!
```

Bây giờ bạn có thể đăng nhập với:

- Username: `admin`, Password: `admin123`
- Username: `testuser`, Password: `test123`

---

## 📚 GIẢI THÍCH TỪNG PHẦN (Cho sinh viên)

### 1. TẠI SAO CẦN SERVICES?

**Ví dụ KHÔNG dùng Services (SAI):**

```javascript
// controllers/taskController.js
exports.createTask = async (req, res) => {
  // Controller làm TẤT CẢ việc → SAI!

  // Validation
  if (!req.body.title) {
    return res.status(400).json({ message: 'Thiếu title' });
  }

  if (req.body.title.length > 255) {
    return res.status(400).json({ message: 'Title quá dài' });
  }

  if (req.body.endTime < req.body.startTime) {
    return res.status(400).json({ message: 'Thời gian không hợp lệ' });
  }

  // Business logic
  const hasConflict = await checkConflict(req.session.userId, req.body);
  if (hasConflict) {
    console.warn('Task trùng giờ');
  }

  // Database query
  const result = await pool.query(
    'INSERT INTO tasks (...) VALUES (...)',
    [...]
  );

  // Gửi email notification
  await sendEmail(req.session.userId, 'Task created');

  res.json({ success: true, task: result.rows[0] });
};
```

**Vấn đề:**

- Controller quá dài, khó đọc
- Không thể tái sử dụng logic (nếu cần createTask từ nơi khác)
- Khó test
- Vi phạm nguyên tắc Single Responsibility

**Ví dụ DÙNG Services (ĐÚNG):**

```javascript
// services/taskService.js
class TaskService {
  async createTask(userId, taskData) {
    // TẤT CẢ logic ở đây
    this.validateTask(taskData);
    await this.checkConflict(userId, taskData);
    const task = await this.insertTask(userId, taskData);
    await emailService.sendTaskNotification(userId, task);
    return task;
  }
}

// controllers/taskController.js
exports.createTask = async (req, res) => {
  try {
    // Controller CHỈ điều phối
    const task = await taskService.createTask(req.session.userId, req.body);
    res.json({ success: true, task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
```

**Lợi ích:**

- Controller ngắn gọn, dễ đọc
- Logic có thể tái sử dụng
- Dễ test
- Dễ bảo trì

### 2. OTP VERIFICATION FLOW

**Bước 1: User điền form đăng ký**

```
User input: username, password, email, fullName
           ↓
Frontend:  Gửi POST /api/register/initiate
           ↓
Backend:   authController.initiateRegistration()
           ├─ Kiểm tra captcha
           ├─ Gọi authService.initiateRegistration()
           │  ├─ Validate password (6+ ký tự, chữ + số)
           │  ├─ Check username/email đã tồn tại chưa
           │  ├─ Tạo OTP (6 số ngẫu nhiên)
           │  ├─ Lưu OTP vào database (expires_at = +5 phút)
           │  └─ Gọi emailService.sendOTPEmail()
           │     └─ Gửi email với template HTML đẹp
           └─ Lưu thông tin tạm vào session
           ↓
Response:  { success: true, message: "OTP đã gửi" }
           ↓
Frontend:  Chuyển đến /verify-otp
```

**Bước 2: User nhập OTP**

```
User input: 123456 (6 số)
           ↓
Frontend:  Gửi POST /api/register/verify-otp
           ↓
Backend:   authController.verifyOTP()
           ├─ Lấy thông tin đăng ký từ session
           ├─ Gọi authService.completeRegistration()
           │  ├─ Kiểm tra OTP:
           │  │  - Email đúng không?
           │  │  - Code đúng không?
           │  │  - Chưa dùng (is_used = false)?
           │  │  - Chưa hết hạn (expires_at > NOW)?
           │  ├─ Hash password với bcrypt
           │  ├─ Insert user vào database
           │  ├─ Update is_email_verified = TRUE
           │  ├─ Đánh dấu OTP is_used = TRUE
           │  └─ Gửi welcome email
           ├─ Lưu user vào session (tự động đăng nhập)
           └─ Xóa pendingRegistration khỏi session
           ↓
Response:  { success: true, user: {...} }
           ↓
Frontend:  Chuyển đến trang chủ (/)
```

### 3. PASSWORD VALIDATION

**Yêu cầu:** Tối thiểu 6 ký tự, có chữ + số

**Code trong authService.js:**

```javascript
validatePassword(password) {
  // Kiểm tra độ dài
  if (!password || password.length < 6) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }

  // Kiểm tra có chữ cái (a-z hoặc A-Z)
  const hasLetter = /[a-zA-Z]/.test(password);

  // Kiểm tra có số (0-9)
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Mật khẩu phải chứa cả chữ và số' };
  }

  return { valid: true };
}
```

**Ví dụ:**

- ✅ `pass123` - OK (có chữ + số, >= 6)
- ✅ `myPassword1` - OK
- ✅ `abc123xyz` - OK
- ❌ `pass` - SAI (< 6 ký tự)
- ❌ `password` - SAI (không có số)
- ❌ `123456` - SAI (không có chữ)

### 4. GOOGLE OAUTH FLOW

**Bước 1: User click "Đăng nhập với Google"**

```
Frontend:  Google SDK hiển thị popup chọn tài khoản
           ↓
User:      Chọn tài khoản Google
           ↓
Google:    Trả về Google ID Token (JWT)
           ↓
Frontend:  Gọi handleGoogleLogin(response)
           ├─ Lấy token: response.credential
           └─ Gửi POST /api/auth/google với { googleToken }
```

**Bước 2: Backend verify token**

```
Backend:   authController.googleLogin()
           ├─ Nhận googleToken từ request
           ├─ Gọi authService.loginWithGoogle(googleToken)
           │  ├─ Verify token với Google API
           │  │  └─ Lấy thông tin: googleId, email, name, avatar
           │  ├─ Tìm user theo google_id
           │  ├─ Nếu tìm thấy → Đăng nhập
           │  ├─ Nếu không → Kiểm tra email đã tồn tại chưa
           │  │  ├─ Có → Link Google vào account cũ
           │  │  └─ Không → Tạo user mới
           │  └─ Return user
           ├─ Lưu vào session
           └─ Trả về { success: true, user: {...} }
```

**Database:**

```sql
-- User đăng ký thông thường
user_id | username | google_id | login_provider
   1    | testuser |   NULL    |     local

-- User đăng nhập Google
user_id | username | google_id | login_provider
   2    | john.doe | 123456789 |    google
```

### 5. CAPTCHA

**Tại sao cần Captcha?**

- Chống bot đăng ký hàng loạt
- Chống brute-force attack (thử mật khẩu nhiều lần)

**Cách hoạt động:**

```
1. Frontend gọi GET /api/captcha
2. Backend tạo SVG captcha (6 ký tự ngẫu nhiên)
3. Backend lưu text vào session
4. Backend trả về SVG image
5. User nhập captcha vào input
6. User submit form
7. Backend so sánh: session.captcha === input.captchaText
8. Nếu đúng → Cho phép đăng ký/đăng nhập
```

**Code:**

```javascript
// Generate captcha
exports.generateCaptcha = (req, res) => {
  const captcha = svgCaptcha.create({
    size: 6, // 6 ký tự
    noise: 3, // Độ nhiễu (khó đọc)
    color: true, // Màu sắc
    background: "#f0f0f0",
  });

  req.session.captcha = captcha.text; // Lưu text
  res.type("svg");
  res.send(captcha.data); // Trả về SVG
};

// Verify captcha
if (req.session.captcha !== req.body.captchaText) {
  return res.status(400).json({ message: "Captcha sai" });
}
```

---

## 🎓 TIPS CHO SINH VIÊN

### 1. Cách debug khi gặp lỗi

**Bước 1: Đọc error message**

```
❌ Lỗi khi đăng ký: Error: Tên đăng nhập đã tồn tại
```

→ Username bị trùng, thử username khác

**Bước 2: Check console log**

```javascript
console.log("Data received:", req.body);
console.log("User ID:", req.session.userId);
```

**Bước 3: Check database**

```sql
SELECT * FROM users WHERE username = 'testuser';
SELECT * FROM otp_codes WHERE email = 'test@example.com';
```

**Bước 4: Check Network tab (F12 trong browser)**

- Status code: 200 (OK), 400 (Bad Request), 500 (Server Error)
- Response body: Xem message lỗi
- Request payload: Xem data đã gửi đúng chưa

### 2. Cách test từng phần

**Test database connection:**

```bash
node -e "require('./config/db').query('SELECT NOW()').then(r => console.log(r.rows[0]))"
```

**Test email service:**

```javascript
// Tạo file test-email.js
const emailService = require("./services/emailService");
emailService
  .sendOTPEmail("your-email@gmail.com", "123456", "Test User")
  .then(() => console.log("✅ Email sent"))
  .catch((err) => console.error("❌ Error:", err));
```

```bash
node test-email.js
```

**Test OTP generation:**

```javascript
const authService = require("./services/authService");
const otp = authService.generateOTP();
console.log("OTP:", otp); // In ra 6 số
```

### 3. Cách đọc hiểu code

**Khi gặp code lạ, hãy:**

1. **Đọc comments** (đã viết rất chi tiết)
2. **Trace luồng xử lý** (theo từ Frontend → Routes → Controller → Service)
3. **Google các hàm không hiểu**:
   - `bcrypt.hash()` - Mã hóa password
   - `pool.query()` - Query PostgreSQL
   - `await` - Chờ Promise resolve
4. **Chạy thử và xem kết quả**

### 4. Best Practices

✅ **Luôn validate input:**

```javascript
if (!username || username.trim().length === 0) {
  throw new Error("Username không được để trống");
}
```

✅ **Luôn try-catch:**

```javascript
try {
  const task = await taskService.createTask(userId, data);
  res.json({ success: true, task });
} catch (error) {
  console.error("Error:", error);
  res.status(400).json({ success: false, message: error.message });
}
```

✅ **Luôn kiểm tra quyền:**

```javascript
// Kiểm tra task có thuộc về user không
const task = await pool.query(
  "SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2",
  [taskId, userId]
);

if (task.rows.length === 0) {
  throw new Error("Không tìm thấy task hoặc bạn không có quyền");
}
```

✅ **Dùng prepared statements (chống SQL injection):**

```javascript
// ✅ ĐÚNG
const result = await pool.query("SELECT * FROM users WHERE username = $1", [
  username,
]);

// ❌ SAI (dễ bị SQL injection)
const result = await pool.query(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

---

## 🔧 TROUBLESHOOTING

### Lỗi: "Cannot send email"

**Nguyên nhân:**

- Chưa cấu hình EMAIL_USER, EMAIL_PASSWORD trong .env
- Chưa enable "App Password" trong Gmail

**Cách fix:**

1. Vào https://myaccount.google.com/apppasswords
2. Generate password cho app
3. Paste vào EMAIL_PASSWORD trong .env
4. Restart server

### Lỗi: "Google OAuth failed"

**Nguyên nhân:**

- GOOGLE_CLIENT_ID sai hoặc chưa cấu hình
- Redirect URI chưa thêm vào Google Console

**Cách fix:**

1. Vào https://console.cloud.google.com/apis/credentials
2. Kiểm tra Client ID
3. Thêm Authorized redirect URIs: `http://localhost:8888/auth/google/callback`
4. Enable Google+ API nếu chưa

### Lỗi: "OTP expired"

**Nguyên nhân:**

- OTP hết hạn sau 5 phút

**Cách fix:**

- Click "Gửi lại OTP" để nhận mã mới

### Lỗi: "Session hết hạn"

**Nguyên nhân:**

- Session cookie bị xóa hoặc hết hạn

**Cách fix:**

- Đăng nhập lại
- Hoặc tăng thời gian session trong server.js:

```javascript
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
}
```

### Lỗi database connection

**Nguyên nhân:**

- PostgreSQL không chạy
- Thông tin trong .env sai

**Cách fix:**

1. Kiểm tra PostgreSQL đang chạy: `pg_ctl status`
2. Kiểm tra DB_PASSWORD trong .env
3. Test connection:

```bash
psql -U postgres -d QuanLyLichTrinh
```

---

## 📞 LIÊN HỆ & HỖ TRỢ

**Nếu gặp vấn đề:**

1. Đọc kỹ README (file này)
2. Check console log
3. Google error message
4. Hỏi thầy hoặc bạn trong nhóm

**Tài liệu tham khảo:**

- Node.js: https://nodejs.org/docs/
- Express.js: https://expressjs.com/
- PostgreSQL: https://www.postgresql.org/docs/
- bcrypt: https://www.npmjs.com/package/bcrypt
- Nodemailer: https://nodemailer.com/

---

## 🎉 KẾT LUẬN

Dự án này đã được tái cấu trúc theo chuẩn MVC + Services với đầy đủ tính năng authentication nâng cao. Bạn cần:

1. ✅ Cấu hình .env (email, Google OAuth)
2. ✅ Cập nhật các routes cho OTP và Google
3. ✅ Cập nhật Task và Event controllers
4. ✅ Cập nhật UI (register, login) với captcha
5. ✅ Tạo seeder để test
6. ✅ Test toàn bộ hệ thống

**Chúc bạn thành công với đồ án! 🚀**

---

**License:** ISC  
**Authors:** Vũ & Tiến  
**Year:** 2025
