# 🚀 HƯỚNG DẪN KHỞI ĐỘNG NHANH

## ⚡ BẮT ĐẦU NGAY (5 PHÚT)

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Setup database

```bash
npm run setup
```

Lệnh này sẽ:

- ✅ Chạy migration (tạo bảng)
- ✅ Seed data mẫu (3 users: admin, user1, user2)

### 3. Khởi động server

```bash
npm run dev
```

Server chạy tại: http://localhost:8888

### 4. Test đăng nhập

**Tài khoản mẫu:**

- Username: `admin` / Password: `admin123`
- Username: `user1` / Password: `user123`
- Username: `user2` / Password: `user456`

---

## 📝 CẤU HÌNH BỔ SUNG (TÙY CHỌN)

### ✉️ Cấu hình Email (để gửi OTP)

**File:** `.env`

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Hướng dẫn chi tiết:** Đọc file `EMAIL_SETUP_GUIDE.md`

**Nhanh:**

1. Vào https://myaccount.google.com/apppasswords
2. Tạo App Password
3. Copy vào `.env`

### 🔐 Cấu hình Google OAuth (để đăng nhập Google)

**File:** `.env`

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Hướng dẫn chi tiết:** Đọc file `GOOGLE_OAUTH_GUIDE.md`

**Nhanh:**

1. Vào https://console.cloud.google.com/
2. Tạo OAuth Client ID
3. Copy vào `.env`

---

## 🎯 CÁC TÍNH NĂNG CHÍNH

### ✅ Đã sẵn sàng sử dụng (không cần cấu hình)

- ✅ **Đăng nhập/Đăng ký thông thường** - Với captcha
- ✅ **Quản lý Tasks** - CRUD, filter, search
- ✅ **Quản lý Calendar** - Events, time conflict check
- ✅ **Kanban Board** - Drag & drop tasks
- ✅ **Dashboard** - Thống kê tổng quan
- ✅ **Profile** - Quản lý thông tin cá nhân

### 🔧 Cần cấu hình Email (.env)

- 📧 **OTP Email Verification** - Xác thực email khi đăng ký
- 📧 **Forgot Password** - Gửi link reset password

### 🔧 Cần cấu hình Google OAuth (.env)

- 🔐 **Google Sign-In** - Đăng nhập bằng tài khoản Google

---

## 📂 CẤU TRÚC DỰ ÁN

```
QuanLiLichTrinh/
│
├── 📘 COMPLETE_SUMMARY.md        ← Tóm tắt toàn bộ dự án
├── 📗 GOOGLE_OAUTH_GUIDE.md      ← Hướng dẫn Google OAuth chi tiết
├── 📙 EMAIL_SETUP_GUIDE.md       ← Hướng dẫn Gmail SMTP chi tiết
├── 📕 QUICK_START.md             ← File này (hướng dẫn nhanh)
│
├── controllers/                  ← HTTP request handlers
├── services/                     ← Business logic
├── models/                       ← Database models
├── routes/                       ← API routes
├── views/                        ← EJS templates
├── assets/                       ← CSS, JS, Images
├── migration/                    ← Database migrations
└── seeder/                       ← Test data seeders
```

---

## 🧪 TEST CÁC TÍNH NĂNG

### Test 1: Đăng nhập thông thường

```
1. Vào http://localhost:8888/login
2. Username: admin
3. Password: admin123
4. Nhập captcha
5. Click "Đăng nhập"
6. ✅ Thành công → Redirect về dashboard
```

### Test 2: Tạo Task mới

```
1. Vào http://localhost:8888/tasks
2. Click "New Task"
3. Điền: Title, Description, Priority
4. Click "Save"
5. ✅ Task xuất hiện trong danh sách
```

### Test 3: Xem Calendar

```
1. Vào http://localhost:8888/calendar
2. Click vào ngày bất kỳ
3. Tạo event mới
4. ✅ Event hiển thị trên calendar
```

### Test 4: Đăng ký với OTP (nếu đã cấu hình email)

```
1. Vào http://localhost:8888/register
2. Điền form (password >= 6 ký tự, có chữ + số)
3. Nhập captcha
4. Click "Đăng ký"
5. Check email → Nhận OTP 6 số
6. Nhập OTP tại /verify-otp
7. ✅ Tạo tài khoản thành công
```

### Test 5: Google OAuth (nếu đã cấu hình)

```
1. Vào http://localhost:8888/login
2. Click "Đăng nhập với Google"
3. Chọn tài khoản Google
4. Allow permissions
5. ✅ Tự động đăng nhập
```

---

## 🐛 LỖI THƯỜNG GẶP

### Lỗi: "Port 8888 already in use"

**Fix:**

```bash
# Đổi port trong .env
PORT=3000
```

### Lỗi: "Cannot connect to database"

**Fix:**

```bash
# Kiểm tra PostgreSQL đang chạy
psql -U postgres

# Kiểm tra .env có đúng DB_NAME, DB_USER, DB_PASSWORD
```

### Lỗi: "Cannot find module"

**Fix:**

```bash
npm install
```

### Lỗi: Email không gửi được

**Fix:**

- Kiểm tra `.env` có `EMAIL_USER` và `EMAIL_PASSWORD`
- Đọc file `EMAIL_SETUP_GUIDE.md`

### Lỗi: Google OAuth không hoạt động

**Fix:**

- Kiểm tra `.env` có `GOOGLE_CLIENT_ID`
- Đọc file `GOOGLE_OAUTH_GUIDE.md`

---

## 📚 TÀI LIỆU CHI TIẾT

**Nếu bạn muốn hiểu sâu hơn, đọc các file sau:**

1. **`COMPLETE_SUMMARY.md`** - Tổng quan toàn bộ dự án, tính năng, kiến trúc
2. **`GOOGLE_OAUTH_GUIDE.md`** - Hướng dẫn từng bước cấu hình Google OAuth (500+ dòng)
3. **`EMAIL_SETUP_GUIDE.md`** - Hướng dẫn từng bước cấu hình Gmail SMTP (300+ dòng)
4. **`README.md`** - Tài liệu tổng quan dự án gốc

---

## 🎓 HỌC GÌ TỪ DỰ ÁN NÀY?

- ✅ **Backend:** Node.js + Express + PostgreSQL
- ✅ **Architecture:** MVC + Services pattern
- ✅ **Authentication:** JWT, OTP, Google OAuth
- ✅ **Email:** Nodemailer với Gmail SMTP
- ✅ **Security:** Password hashing, Captcha, CSRF protection
- ✅ **Database:** Migration, Seeder, Relations
- ✅ **Frontend:** EJS templates, AJAX, Form validation

---

## 🚀 BƯỚC TIẾP THEO

1. **Chạy server:** `npm run dev`
2. **Test tính năng cơ bản** (login, tasks, calendar)
3. **Cấu hình Email** (nếu muốn OTP)
4. **Cấu hình Google OAuth** (nếu muốn Google Sign-In)
5. **Deploy lên server thật** (Heroku, Railway, Vercel...)

---

## 💡 TIPS

- 🔍 **Gặp lỗi?** Xem Console Log (F12) trong browser
- 📖 **Không hiểu?** Đọc file `COMPLETE_SUMMARY.md`
- 🐛 **Debug?** Thêm `console.log()` ở khắp nơi
- 🔧 **Thay đổi code?** Backup trước: `copy file.js file.js.backup`

---

## 📞 HỖ TRỢ

**Nếu gặp vấn đề:**

1. Kiểm tra Console Log (F12)
2. Đọc lại documentation
3. Google error message
4. Hỏi trên Stack Overflow

---

**Chúc bạn thành công! 🎉**

Nếu bạn thấy dự án hữu ích, hãy cho một ⭐ trên GitHub!
