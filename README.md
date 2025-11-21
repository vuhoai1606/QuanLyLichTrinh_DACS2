# Hướng dẫn cài đặt và sử dụng hệ thống Quản Lý Lịch Trình

## 📋 Yêu cầu hệ thống

- Node.js (v14 trở lên)
- PostgreSQL (v12 trở lên)
- npm hoặc yarn

## 🚀 Cài đặt

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Cấu hình Database

1. Tạo database PostgreSQL với tên `QuanLyLichTrinh`
2. Kiểm tra file `.env` và đảm bảo thông tin kết nối đúng:

```env
PORT=8888

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=QuanLyLichTrinh
DB_USER=postgres
DB_PASSWORD=v01215335600

# JWT Secret
JWT_SECRET=v01215335600
```

### Bước 3: Chạy Migration (Khởi tạo Database)

Có 2 cách để chạy migration:

**Cách 1: Sử dụng Node.js**

```bash
node migration/runMigration.js
```

**Cách 2: Chạy trực tiếp SQL trong PostgreSQL**

- Mở pgAdmin hoặc psql
- Kết nối đến database `QuanLyLichTrinh`
- Chạy file `migration/init_database.sql`

### Bước 4: Kiểm tra kết nối Database

```bash
npm run dev
```

Sau đó truy cập: http://localhost:8888/test-db

Nếu thấy thông báo "Kết nối database thành công!" là OK.

## 🎯 Chạy ứng dụng

### Development mode (với nodemon)

```bash
npm run dev
```

### Production mode

```bash
node server.js
```

Ứng dụng sẽ chạy tại: http://localhost:8888

## 📖 Cách sử dụng

### 1. Đăng ký tài khoản mới

- Truy cập: http://localhost:8888/register
- Điền thông tin:
  - Tên đăng nhập (username)
  - Họ và tên (full name)
  - Email
  - Mật khẩu (tối thiểu 6 ký tự)
  - Ngày sinh (không bắt buộc)
- Nhấn "Đăng ký"
- Sau khi đăng ký thành công, bạn sẽ tự động đăng nhập và chuyển đến Dashboard

### 2. Đăng nhập

- Truy cập: http://localhost:8888/login
- Nhập tên đăng nhập và mật khẩu
- Có thể chọn "Ghi nhớ đăng nhập" để duy trì phiên đăng nhập lâu hơn
- Nhấn "Đăng nhập"
- Sau khi đăng nhập thành công, bạn sẽ được chuyển đến Dashboard

### 3. Dashboard

- Sau khi đăng nhập, bạn sẽ thấy tên của mình hiển thị trên thanh menu (thay vì "Tài khoản")
- Có thể truy cập các chức năng:
  - Tasks: Quản lý công việc
  - Calendar: Lịch
  - Kanban: Bảng Kanban
  - Timeline: Dòng thời gian
  - Groups: Nhóm
  - Notifications: Thông báo
  - Profile: Hồ sơ cá nhân
  - Settings: Cài đặt

### 4. Đăng xuất

- Click vào tên của bạn trên thanh menu
- Chọn "Đăng xuất"

## 🔐 Bảo mật

- Mật khẩu được mã hóa bằng **bcrypt** với salt rounds = 10
- Phiên đăng nhập được quản lý bằng **express-session**
- Các route cần đăng nhập được bảo vệ bởi middleware `requireAuth`

## 📁 Cấu trúc dự án

```
QuanLiLichTrinh/
├── assets/               # Static files (CSS, JS, images)
│   ├── css/             # Các file CSS
│   ├── js/              # Các file JavaScript client-side
│   └── img/             # Hình ảnh
├── config/              # Cấu hình
│   └── db.js            # Cấu hình kết nối PostgreSQL
├── controllers/         # Controllers xử lý logic
│   └── authController.js # Controller xác thực
├── middleware/          # Middleware
│   └── authMiddleware.js # Middleware xác thực
├── migration/           # Database migration
│   ├── init_database.sql # SQL script
│   └── runMigration.js   # Node script để chạy migration
├── models/              # Models
│   └── User.js          # User model
├── routes/              # Routes
│   ├── authRoutes.js    # Routes xác thực
│   └── index.js         # Routes chính
├── views/               # EJS templates
│   ├── login.html       # Trang đăng nhập
│   ├── register.html    # Trang đăng ký
│   ├── index.html       # Dashboard
│   ├── header.html      # Header template
│   └── ...              # Các trang khác
├── .env                 # Biến môi trường
├── .gitignore
├── package.json
└── server.js            # Entry point
```

## 🛠️ Các API endpoints

### Authentication

- `POST /api/register` - Đăng ký tài khoản mới
- `POST /api/login` - Đăng nhập
- `POST /api/logout` - Đăng xuất
- `GET /api/check-auth` - Kiểm tra trạng thái đăng nhập

### Pages

- `GET /` - Dashboard (cần đăng nhập)
- `GET /login` - Trang đăng nhập
- `GET /register` - Trang đăng ký
- `GET /tasks` - Trang quản lý công việc (cần đăng nhập)
- `GET /calendar` - Trang lịch (cần đăng nhập)
- ... (các trang khác)

## 🐛 Xử lý lỗi thường gặp

### Lỗi kết nối database

```
Error: connect ECONNREFUSED
```

**Giải pháp**:

- Kiểm tra PostgreSQL đã chạy chưa
- Kiểm tra thông tin kết nối trong file `.env`

### Lỗi "relation does not exist"

**Giải pháp**: Chạy lại migration để tạo các bảng

### Lỗi "Cannot set headers after they are sent"

**Giải pháp**: Kiểm tra code không gọi `res.send()` hoặc `res.json()` nhiều lần

## 📝 Lưu ý

- Mật khẩu phải có ít nhất 6 ký tự
- Email và username phải là duy nhất
- Session mặc định tồn tại 24 giờ
- Nếu chọn "Ghi nhớ đăng nhập", session sẽ tồn tại 30 ngày

## 👥 Tác giả

- Vũ & Tiến

## 📄 License

ISC
