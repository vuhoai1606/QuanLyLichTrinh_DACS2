# 📧 HƯỚNG DẪN CẤU HÌNH EMAIL (GMAIL SMTP)

## 🎯 MỤC ĐÍCH

Cấu hình Gmail để gửi email OTP (mã xác thực) cho người dùng khi đăng ký tài khoản.

---

## 📝 CHUẨN BỊ

- Tài khoản Gmail (ví dụ: `yourapp@gmail.com`)
- 5-10 phút để setup

---

## 🔐 BƯỚC 1: TẠO APP PASSWORD

### 1.1. Tại sao cần App Password?

Google **KHÔNG cho phép** dùng password thông thường để đăng nhập SMTP từ app ngoài (vì lý do bảo mật).

Bạn phải tạo **App Password** - một mật khẩu riêng biệt chỉ cho app của bạn.

### 1.2. Enable 2-Step Verification

**Bước 1:** Vào https://myaccount.google.com/security

**Bước 2:** Tìm mục **"2-Step Verification"**

**Bước 3:** Nếu chưa bật, click **"Get Started"** và làm theo hướng dẫn:

- Nhập số điện thoại
- Nhận mã xác thực qua SMS
- Nhập mã và hoàn tất

✅ **Kiểm tra:** Phải thấy "2-Step Verification is ON"

### 1.3. Tạo App Password

**Bước 1:** Vào https://myaccount.google.com/apppasswords

Hoặc:

- Vào https://myaccount.google.com/security
- Tìm "App passwords" (ở dưới cùng của mục "2-Step Verification")

**Bước 2:** Click **"App passwords"**

**Bước 3:** Chọn app và device:

```
Select app: Other (Custom name)
            ↓
Enter app name: QuanLyLichTrinh
               (hoặc tên app bạn)
```

**Bước 4:** Click **"Generate"**

**Bước 5:** Google sẽ hiển thị mật khẩu 16 ký tự:

```
┌─────────────────────────────────────┐
│  Generated app password             │
├─────────────────────────────────────┤
│                                     │
│   abcd efgh ijkl mnop               │
│                                     │
│   Copy this password and paste it   │
│   into your app. You won't be able │
│   to see it again.                  │
│                                     │
│   [Done]                            │
└─────────────────────────────────────┘
```

**QUAN TRỌNG:**

- **Copy ngay mật khẩu này** (bỏ dấu cách giữa các chữ)
- Bạn sẽ **KHÔNG thể xem lại** sau này
- Nếu quên, phải tạo mới

**Ví dụ:**

```
Hiển thị:  abcd efgh ijkl mnop
Copy:      abcdefghijklmnop     ← (không có dấu cách)
```

---

## ⚙️ BƯỚC 2: CẤU HÌNH TRONG DỰ ÁN

### 2.1. Cập nhật file `.env`

Mở file `.env` trong dự án:

```env
# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourapp@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=QuanLyLichTrinh <yourapp@gmail.com>
```

**Thay đổi:**

- `yourapp@gmail.com` → Email Gmail của bạn
- `abcdefghijklmnop` → App Password vừa copy (16 ký tự, không có dấu cách)

**Ví dụ thực tế:**

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=clonevclone00@gmail.com
EMAIL_PASSWORD=tybu wugh nmfo jtvn
EMAIL_FROM=QuanLyLichTrinh <clonevclone00@gmail.com>
```

⚠️ **Lưu ý:** Giữ nguyên dấu cách trong App Password nếu copy từ Google (code sẽ tự xử lý).

### 2.2. Kiểm tra cấu hình

File `.env` hoàn chỉnh sẽ như thế này:

```env
PORT=8888

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=QuanLyLichTrinh
DB_USER=postgres
DB_PASSWORD=your-db-password

# JWT Secret
JWT_SECRET=your-secret-key

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourapp@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=QuanLyLichTrinh <yourapp@gmail.com>

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 🧪 BƯỚC 3: TEST GỬI EMAIL

### 3.1. Tạo file test

Tạo file `test-email.js` trong thư mục gốc:

```javascript
require("dotenv").config();
const nodemailer = require("nodemailer");

async function testEmail() {
  // Tạo transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true cho port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Gửi email test
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: "your-personal-email@gmail.com", // ← Thay bằng email của bạn
      subject: "Test Email - QuanLyLichTrinh",
      html: `
        <h1>✅ Email đã được cấu hình thành công!</h1>
        <p>Đây là email test từ QuanLyLichTrinh.</p>
        <p>Nếu bạn nhận được email này, nghĩa là cấu hình SMTP đã hoạt động.</p>
      `,
    });

    console.log("✅ Email đã gửi thành công!");
    console.log("📧 Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Lỗi gửi email:", error.message);
  }
}

testEmail();
```

### 3.2. Chạy test

```bash
node test-email.js
```

**Kết quả mong đợi:**

```
✅ Email đã gửi thành công!
📧 Message ID: <1234567890@gmail.com>
```

**Kiểm tra:** Vào email `your-personal-email@gmail.com` (email bạn điền ở code) để xem có nhận được không.

---

## 🐛 TROUBLESHOOTING

### Lỗi 1: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Nguyên nhân:** App Password sai hoặc chưa bật 2-Step Verification.

**Cách fix:**

1. Kiểm tra lại App Password (16 ký tự)
2. Đảm bảo đã bật 2-Step Verification
3. Tạo App Password mới
4. Copy lại (không có dấu cách)

### Lỗi 2: "Missing credentials"

**Nguyên nhân:** Biến `EMAIL_USER` hoặc `EMAIL_PASSWORD` chưa load từ `.env`.

**Cách fix:**

1. Kiểm tra file `.env` có tồn tại
2. Kiểm tra tên biến đúng chưa (không có dấu cách)
3. Restart server: `npm run dev`
4. Thử chạy: `node -e "require('dotenv').config(); console.log(process.env.EMAIL_USER)"`

### Lỗi 3: "Connection timeout"

**Nguyên nhân:** Firewall block port 587 hoặc Internet connection yếu.

**Cách fix:**

1. Kiểm tra Internet
2. Thử đổi `EMAIL_PORT` từ `587` sang `465`:

```env
EMAIL_PORT=465
```

Và trong code nodemailer, đổi `secure: false` thành `secure: true`.

### Lỗi 4: "Recipient address rejected"

**Nguyên nhân:** Email người nhận không hợp lệ.

**Cách fix:**

1. Kiểm tra email trong `test-email.js`
2. Đảm bảo email đúng format: `user@domain.com`

### Lỗi 5: Email vào Spam

**Nguyên nhân:** Gmail chưa tin tưởng email từ app.

**Cách fix:**

1. Kiểm tra thư mục Spam/Junk
2. Đánh dấu "Not spam"
3. Thêm sender vào contacts
4. Sau vài lần gửi, Gmail sẽ tự học và không spam nữa

---

## 📚 TÀI LIỆU THAM KHẢO

- Gmail SMTP settings: https://support.google.com/mail/answer/7126229
- Nodemailer docs: https://nodemailer.com/
- Gmail App Passwords: https://support.google.com/accounts/answer/185833

---

## ✅ CHECKLIST

- [ ] Đã bật 2-Step Verification cho Gmail
- [ ] Đã tạo App Password (16 ký tự)
- [ ] Đã cập nhật `EMAIL_USER` và `EMAIL_PASSWORD` trong `.env`
- [ ] Chạy `test-email.js` → Thành công
- [ ] Nhận được email test trong inbox
- [ ] Đã xóa file `test-email.js` (không cần thiết nữa)

---

## 🎉 HOÀN TẤT!

Giờ hệ thống đã có thể gửi email OTP khi người dùng đăng ký!

**Test flow đầy đủ:**

1. Vào `/register`
2. Điền form đăng ký
3. Click "Đăng ký"
4. Kiểm tra email → Nhận được mã OTP 6 số
5. Nhập OTP → Tạo tài khoản thành công

Chúc bạn thành công! 🚀
