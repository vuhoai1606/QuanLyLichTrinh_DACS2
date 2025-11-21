# 🎯 HƯỚNG DẪN NHANH

## ✅ Đã hoàn thành

Hệ thống đăng nhập/đăng ký đã được cài đặt thành công với các tính năng:

1. ✅ Đăng ký tài khoản mới
2. ✅ Đăng nhập với username/password
3. ✅ Mã hóa mật khẩu bằng bcrypt
4. ✅ Session management
5. ✅ Hiển thị tên người dùng trên header sau khi đăng nhập
6. ✅ Tự động chuyển về dashboard sau đăng ký/đăng nhập
7. ✅ Bảo vệ các route cần đăng nhập

## 🚀 Server đang chạy

Server hiện đang chạy tại: **http://localhost:8888**

## 📝 Các bước tiếp theo

### 1. Truy cập trang đăng ký

```
http://localhost:8888/register
```

Điền thông tin:

- Tên đăng nhập: `testuser`
- Họ và tên: `Nguyễn Văn A`
- Email: `test@example.com`
- Mật khẩu: `123456` (tối thiểu 6 ký tự)
- Ngày sinh: (không bắt buộc)

### 2. Sau khi đăng ký thành công

- Bạn sẽ tự động đăng nhập
- Chuyển về trang Dashboard (/)
- Tên của bạn sẽ hiển thị thay cho "Tài khoản" trên thanh menu

### 3. Đăng nhập lại

```
http://localhost:8888/login
```

Nhập:

- Tên đăng nhập: `testuser`
- Mật khẩu: `123456`

### 4. Đăng xuất

- Click vào tên của bạn trên thanh menu
- Chọn "Đăng xuất"

## 🔍 Kiểm tra Database

Bạn có thể kiểm tra database bằng cách:

### Trong pgAdmin hoặc psql:

```sql
-- Xem danh sách users
SELECT user_id, username, email, full_name, created_at FROM users;

-- Xem user cụ thể
SELECT * FROM users WHERE username = 'testuser';
```

### Qua API endpoint:

```
http://localhost:8888/test-db
```

## 📂 Cấu trúc code quan trọng

### Backend

- `models/User.js` - Model User với các method: create, findByUsername, findByEmail, comparePassword
- `controllers/authController.js` - Xử lý logic đăng ký, đăng nhập, đăng xuất
- `middleware/authMiddleware.js` - Middleware bảo vệ routes
- `routes/authRoutes.js` - Định nghĩa API endpoints
- `routes/index.js` - Routes cho các trang cần đăng nhập

### Frontend

- `views/login.ejs` - Trang đăng nhập
- `views/register.ejs` - Trang đăng ký
- `views/index.ejs` - Dashboard (hiển thị tên người dùng)
- `views/header.ejs` - Header với dropdown menu
- `assets/js/login.js` - JavaScript xử lý form đăng nhập
- `assets/js/register.js` - JavaScript xử lý form đăng ký
- `assets/js/header.js` - JavaScript xử lý dropdown và đăng xuất

## 🛠️ Các script npm

```bash
# Chạy development mode (với nodemon)
npm run dev

# Chạy migration (nếu cần reset database)
node migration/runMigration.js
```

## 🔐 Bảo mật

- ✅ Mật khẩu được hash bằng bcrypt (salt rounds = 10)
- ✅ Session được lưu trữ server-side
- ✅ Cookie httpOnly để bảo vệ khỏi XSS
- ✅ Middleware requireAuth bảo vệ các route

## ⚠️ Lưu ý

1. Đảm bảo PostgreSQL đang chạy
2. Database `QuanLyLichTrinh` đã được tạo
3. Thông tin trong `.env` phải đúng
4. Không commit file `.env` lên Git (đã có trong .gitignore)

## 🎨 Tùy chỉnh

### Thay đổi thời gian session

Trong `server.js`, dòng 29:

```javascript
cookie: {
  maxAge: 24 * 60 * 60 * 1000, // 24 giờ
  // Thay đổi thành thời gian bạn muốn
}
```

### Thay đổi cổng server

Trong file `.env`:

```env
PORT=8888  # Thay đổi thành cổng khác
```

## 📧 Test accounts

Bạn có thể tạo nhiều tài khoản test để thử nghiệm:

```
User 1:
- Username: testuser1
- Email: user1@test.com
- Password: 123456

User 2:
- Username: testuser2
- Email: user2@test.com
- Password: 123456
```

## 🎉 Chúc mừng!

Hệ thống authentication của bạn đã hoạt động! Giờ bạn có thể:

- Đăng ký tài khoản mới
- Đăng nhập
- Truy cập các trang được bảo vệ
- Đăng xuất an toàn

Nếu có lỗi, kiểm tra terminal để xem log chi tiết.
