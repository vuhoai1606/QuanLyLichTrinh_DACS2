# 📚 HƯỚNG DẪN DỰ ÁN QUẢN LÝ LỊCH TRÌNH

> **Tài liệu tổng hợp duy nhất** - Tất cả thông tin bạn cần ở đây!

---

## 📖 MỤC LỤC

1. [Khởi động nhanh (5 phút)](#-khởi-động-nhanh)
2. [Cấu hình Email & Google OAuth](#-cấu-hình-bổ-sung)
3. [Tối ưu hiệu suất đã thực hiện](#-tối-ưu-hiệu-suất)
4. [Cấu trúc dự án](#-cấu-trúc-dự-án)
5. [Troubleshooting](#-troubleshooting)

---

## 🚀 KHỞI ĐỘNG NHANH

### Bước 1: Cài đặt

```bash
npm install
```

### Bước 2: Setup database

```bash
npm run setup
```

Lệnh này sẽ:

- ✅ Chạy migration (tạo bảng)
- ✅ Seed data mẫu (admin, user1, user2)

### Bước 3: Khởi động server

```bash
npm run dev
```

Server chạy tại: **http://localhost:8888**

### Bước 4: Test đăng nhập

**Tài khoản mẫu:**

- Username: `admin` / Password: `admin123`
- Username: `user1` / Password: `user123`
- Username: `user2` / Password: `user456`

---

## ⚙️ CẤU HÌNH BỔ SUNG

### 📧 Cấu hình Email (Gmail SMTP)

**Mục đích:** Gửi OTP khi đăng ký tài khoản

**Bước 1:** Bật 2-Step Verification

1. Vào: https://myaccount.google.com/security
2. Bật "2-Step Verification"
3. Làm theo hướng dẫn (nhập SĐT, nhận SMS)

**Bước 2:** Tạo App Password

1. Vào: https://myaccount.google.com/apppasswords
2. Chọn app: **Other (Custom name)**
3. Nhập tên: `QuanLyLichTrinh`
4. Click **Generate**
5. Copy mật khẩu 16 ký tự (bỏ dấu cách)

**Bước 3:** Cập nhật `.env`

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

---

### 🔐 Cấu hình Google OAuth

**Mục đích:** Đăng nhập bằng tài khoản Google

#### Bước 1: Tạo Google Cloud Project

1. Vào: https://console.cloud.google.com/
2. Click **Select a project** → **New Project**
3. Tên project: `QuanLyLichTrinh`
4. Click **Create**

#### Bước 2: Enable Google+ API

1. Vào **APIs & Services** → **Library**
2. Tìm: `Google+ API`
3. Click **Enable**

#### Bước 3: Tạo OAuth 2.0 Credentials

1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Name: `QuanLyLichTrinh Web Client`

**Cấu hình URIs:**

```
Authorized JavaScript origins:
http://localhost:8888

Authorized redirect URIs:
(để trống - không cần cho popup flow)
```

5. Click **Create**
6. Copy **Client ID** và **Client Secret**

#### Bước 4: Cập nhật `.env`

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Bước 5: Restart server

```bash
npm run dev
```

---

## ⚡ TỐI ƯU HIỆU SUẤT

### 🎯 Vấn đề đã fix

**Trước khi tối ưu:**

- CPU: 3% → 20-30% khi chạy web
- GPU: 0% → 50-66% khi chạy web

**Nguyên nhân:** CSS animations chạy liên tục

### ✅ Các tối ưu đã thực hiện

#### 1. Server-side

- ✅ **Compression middleware** - Giảm 60-80% kích thước response
- ✅ **Database pool** - Giảm từ 20 → 10 connections (đủ cho localhost)
- ✅ **Static files caching** - Cache 1 ngày, giảm requests
- ✅ **Request size limiting** - Giới hạn 1MB
- ✅ **Tắt logging** - Comment console.log trong services

#### 2. Frontend

- ✅ **Tắt background animations** - Comment gradientShift (15s infinite)
- ✅ **Tắt floating particles** - Comment 4 animations (18s-25s)
- ✅ **Tắt shine effects** - Comment hover effects
- ✅ **Giảm backdrop-filter** - Blur 20px → 10px
- ✅ **Giảm hover distance** - translateY(-8px) → (-4px)
- ✅ **Thêm will-change hints** - GPU optimization

**Files đã chỉnh:**

- `assets/css/login.css` - Background + shine disabled
- `assets/css/register.css` - Animations disabled + scroll added

**Tất cả code đã comment (không xóa)** với tag `/* PERFORMANCE: */`

### 📊 Kết quả dự kiến

| Metric    | Trước    | Sau        | Cải thiện |
| --------- | -------- | ---------- | --------- |
| CPU Usage | 20-30%   | 3-5%       | ~85% ↓    |
| GPU Usage | 50-66%   | 0-5%       | ~90% ↓    |
| Page Load | Baseline | 60% faster | 🚀        |
| FPS       | 30-45    | 60         | Stable    |

### 🔄 Nếu muốn bật lại animations

**File:** `assets/css/login.css` hoặc `register.css`

Tìm comment: `/* PERFORMANCE: Disabled` và uncomment code bên dưới.

**Khuyến nghị:** Bật từng cái một và test CPU/GPU usage.

---

## 📂 CẤU TRÚC DỰ ÁN

```
QuanLiLichTrinh/
│
├── 📘 HƯỚNG_DẪN_DỰ_ÁN.md        ← File này (tài liệu tổng hợp)
│
├── config/
│   └── db.js                    ← Kết nối PostgreSQL (pool optimized)
│
├── controllers/
│   ├── authController.js        ← HTTP handlers cho auth
│   ├── taskController.js        ← HTTP handlers cho tasks
│   └── eventController.js       ← HTTP handlers cho events
│
├── services/
│   ├── authService.js           ← Business logic: login, register, OAuth
│   ├── emailService.js          ← Gửi email OTP, welcome, reset password
│   ├── taskService.js           ← CRUD tasks, validation
│   └── eventService.js          ← CRUD events, time conflict check
│
├── routes/
│   ├── authRoutes.js            ← /api/login, /api/register, /api/auth/google
│   ├── taskRoutes.js            ← /api/tasks/*
│   └── eventRoutes.js           ← /api/events/*
│
├── middleware/
│   └── authMiddleware.js        ← Kiểm tra đăng nhập, set user locals
│
├── models/
│   └── User.js                  ← Database queries cho users
│
├── migration/
│   ├── init_database.sql        ← Schema ban đầu
│   ├── update_database.sql      ← Updates: OTP, Google OAuth, tags
│   ├── runMigration.js          ← Chạy init
│   └── runUpdate.js             ← Chạy update
│
├── seeder/
│   ├── userSeeder.js            ← Tạo users mẫu
│   └── index.js                 ← Chạy tất cả seeders
│
├── views/                       ← EJS templates
│   ├── login.ejs                ← Trang đăng nhập
│   ├── register.ejs             ← Trang đăng ký
│   ├── verify-otp.ejs           ← Trang nhập OTP
│   ├── index.ejs                ← Dashboard
│   ├── tasks.ejs                ← Quản lý tasks
│   ├── calendar.ejs             ← Calendar view
│   └── ... (20+ views)
│
└── assets/
    ├── css/                     ← Stylesheets (optimized)
    ├── js/                      ← Frontend JS (with debug logs)
    └── img/                     ← Images
```

---

## 🔧 TROUBLESHOOTING

### ❌ Google OAuth không hoạt động

**Triệu chứng:** Click "Đăng nhập với Google" → Nothing happens hoặc "Something went wrong"

**Debug:**

1. Mở browser console (F12) → Tab Console
2. Click nút "Đăng nhập với Google"
3. Xem log output (bắt đầu với `🔍 ===== DEBUG GOOGLE OAUTH =====`)

**Lỗi thường gặp:**

| Log message                         | Nguyên nhân                      | Giải pháp                                                                                                   |
| ----------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `CLIENT_ID: undefined`              | `.env` chưa có GOOGLE_CLIENT_ID  | Cấu hình `.env` (xem phần Cấu hình Google OAuth)                                                            |
| `google object: undefined`          | Google SDK chưa load             | Reload trang, kiểm tra internet                                                                             |
| `google.accounts.id không tồn tại`  | Script chưa load xong            | Đợi 2-3s, thử lại                                                                                           |
| Backend error: `Token không hợp lệ` | Token expired hoặc sai Client ID | Kiểm tra GOOGLE_CLIENT_ID match với Google Console                                                          |
| `origin_mismatch`                   | JavaScript origin không khớp     | Vào Google Console → Edit OAuth Client → Thêm `http://localhost:8888` vào **Authorized JavaScript origins** |

**Kiểm tra Google Console:**

1. Vào: https://console.cloud.google.com/apis/credentials
2. Click vào OAuth Client ID của bạn
3. Đảm bảo:
   - ✅ **Authorized JavaScript origins:** `http://localhost:8888`
   - ❌ **Authorized redirect URIs:** Để trống (popup flow không cần)

---

### ❌ Email OTP không gửi được

**Triệu chứng:** Đăng ký → "Email đã được gửi" nhưng không nhận được email

**Kiểm tra:**

1. **Email có đúng không?** - Kiểm tra typo
2. **Kiểm tra spam folder** - OTP email có thể vào spam
3. **App Password đúng chưa?**
   ```bash
   # Check .env
   EMAIL_PASSWORD=abcdefghijklmnop  # 16 ký tự, không có dấu cách
   ```
4. **2-Step Verification đã bật chưa?**
   - Vào: https://myaccount.google.com/security
   - Kiểm tra "2-Step Verification is ON"

**Test email:**

```javascript
// Thêm vào server.js (test route)
app.get("/test-email", async (req, res) => {
  try {
    await emailService.sendOTPEmail(
      "your-email@gmail.com",
      "123456",
      "Test User"
    );
    res.send("Email sent!");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});
```

---

### ❌ Database connection error

**Triệu chứng:** `Error: connect ECONNREFUSED` hoặc `password authentication failed`

**Giải pháp:**

1. Kiểm tra PostgreSQL đã start chưa

   ```bash
   # Windows - Check service
   Get-Service postgresql*
   # Nếu Stopped → Start service
   Start-Service postgresql-x64-14
   ```

2. Kiểm tra `.env`

   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=QuanLyLichTrinh
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password  # ← Sửa password đúng
   ```

3. Test connection
   ```bash
   # Trong psql
   psql -U postgres -d QuanLyLichTrinh
   ```

---

### ❌ CPU/GPU vẫn cao sau khi tối ưu

**Kiểm tra:**

1. **Animations đã tắt chưa?**

   - Mở `assets/css/login.css`
   - Tìm: `animation: gradientShift`
   - Phải thấy: `/* animation: gradientShift 15s ease infinite; */` (đã comment)

2. **Restart server chưa?**

   ```bash
   Ctrl + C  # Dừng server
   npm run dev  # Start lại
   ```

3. **Clear browser cache**

   ```
   Ctrl + Shift + Del → Clear cached images and files
   ```

4. **Test với browser khác**

   - Chrome có thể tốn GPU hơn Firefox
   - Thử Microsoft Edge hoặc Firefox

5. **Kiểm tra Task Manager**
   ```
   Ctrl + Shift + Esc → Performance tab
   Mở http://localhost:8888/login
   Xem CPU và GPU usage
   ```

**Nếu vẫn cao:**

- Có thể do extensions (AdBlock, etc.) → Test incognito mode
- Có thể do hardware acceleration → Tắt trong Chrome settings
- Background processes khác → Close apps không cần thiết

---

## 📝 SCRIPTS COMMANDS

```bash
# Development
npm run dev          # Start server với nodemon (auto-reload)
npm start            # Start server production

# Database
npm run migrate      # Chạy migrations (init + update)
npm run seed         # Seed data mẫu
npm run setup        # migrate + seed (all-in-one)

# Testing
npm test             # (Chưa implement)
```

---

## 🎯 TÍNH NĂNG CHÍNH

### ✅ Đã sẵn sàng (không cần cấu hình)

- ✅ Đăng nhập/Đăng ký với captcha
- ✅ Quản lý Tasks (CRUD, filter, search)
- ✅ Kanban Board (drag & drop)
- ✅ Calendar (events, time conflict check)
- ✅ Dashboard (thống kê)
- ✅ Profile management

### 🔧 Cần cấu hình Email

- 📧 OTP Email Verification
- 📧 Forgot Password (reset link)
- 📧 Welcome Email

### 🔧 Cần cấu hình Google OAuth

- 🔐 Đăng nhập bằng Google
- 🔐 Đăng ký bằng Google

---

## 🛡️ BẢO MẬT

**Đã implement:**

- ✅ Password hashing (bcrypt)
- ✅ Session-based authentication
- ✅ Captcha chống bot
- ✅ OTP email verification
- ✅ Password validation (chữ + số, >= 6 ký tự)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (EJS auto-escaping)

**Best practices:**

- 🔒 Không bao giờ commit `.env` (đã có trong `.gitignore`)
- 🔒 JWT_SECRET phải random strong (production)
- 🔒 HTTPS khi deploy (production)
- 🔒 Rate limiting khi deploy (production)

---

## 📞 HỖ TRỢ

**Nếu gặp vấn đề không nằm trong Troubleshooting:**

1. **Check logs:** Xem terminal output khi chạy `npm run dev`
2. **Browser console:** F12 → Console tab → Copy error messages
3. **Database logs:** pgAdmin → Tools → Server Logs
4. **Google Cloud Console:** Monitoring → Logs Explorer

**Debug tips:**

- Luôn mở Console (F12) khi test
- Đọc error messages từ dưới lên trên (root cause thường ở dưới)
- Test từng phần một (auth → tasks → events)
- Rollback changes nếu break (git reset hoặc uncomment code)

---

**Chúc bạn code vui vẻ! 🚀**

_Cập nhật lần cuối: 2025-11-26_
