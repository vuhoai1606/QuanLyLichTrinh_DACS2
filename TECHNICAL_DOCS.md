# 📚 TÀI LIỆU KỸ THUẬT - QUẢN LÝ LỊCH TRÌNH

> **Mục đích:** Lưu trữ các syntax, cách hoạt động, và kiến thức kỹ thuật của các tính năng trong dự án.
>
> **Cập nhật:** November 28, 2025

---

## 🔐 ĐĂNG NHẬP BẰNG GOOGLE (Google OAuth 2.0)

### 📌 Tổng quan

Dự án sử dụng **Google Identity Services (GIS)** để đăng nhập bằng tài khoản Google. Đây là phương pháp xác thực an toàn, không cần lưu mật khẩu của người dùng.

---

### 🎯 Cách hoạt động

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │────────▶│  Google GIS  │────────▶│ Google OAuth │────────▶│  Server API  │
│  (Client)   │◀────────│   (Client)   │◀────────│   (Google)   │◀────────│  (Backend)   │
└─────────────┘         └──────────────┘         └──────────────┘         └──────────────┘
```

**Bước 1:** User click "Đăng nhập với Google"

- Frontend: `login.js` trigger Google button
- GIS: Mở popup chọn tài khoản Google

**Bước 2:** User chọn tài khoản Google

- Google: Xác thực user
- Google: Tạo JWT token (ID Token)
- GIS: Gửi token về callback function

**Bước 3:** Gửi token đến backend

- Frontend: Gọi `POST /api/auth/google` với token
- Backend: Verify token với Google
- Backend: Lấy thông tin user từ token

**Bước 4:** Tạo/Cập nhật user trong database

- Backend: Kiểm tra email đã tồn tại?
  - ✅ Có: Đăng nhập vào tài khoản cũ
  - ❌ Không: Tạo user mới
- Backend: Lưu session
- Backend: Trả về success + redirect URL

**Bước 5:** Chuyển hướng

- Frontend: Redirect đến trang chủ `/`

---

### 💻 Code Implementation

#### 1️⃣ **Frontend (login.js)**

```javascript
// Khởi tạo Google Identity Services
google.accounts.id.initialize({
  client_id: GOOGLE_CLIENT_ID, // Lấy từ Google Console
  callback: handleGoogleCallback, // Function xử lý response
});

// Render button Google (ẩn)
google.accounts.id.renderButton(
  hiddenBtn, // DOM element để render
  {
    theme: "filled_blue",
    size: "large",
    text: "signin_with",
    width: "280",
  }
);

// Custom button trigger real button
customBtn.onclick = function () {
  const realBtn = hiddenBtn.querySelector('[role="button"]');
  realBtn.click(); // Trigger OAuth flow
};
```

**Callback function:**

```javascript
async function handleGoogleCallback(response) {
  const idToken = response.credential; // JWT token từ Google

  // Gửi token đến backend
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
  });

  const data = await res.json();

  if (data.success) {
    window.location.href = data.redirectUrl; // Redirect
  }
}
```

---

#### 2️⃣ **Backend Route (routes/authRoutes.js)**

```javascript
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Google OAuth login endpoint
router.post("/auth/google", authController.googleLogin);

module.exports = router;
```

---

#### 3️⃣ **Controller (controllers/authController.js)**

```javascript
const authService = require("../services/authService");

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body; // JWT token từ frontend

    // Gọi service để verify và xử lý
    const result = await authService.loginWithGoogle(token);

    // Lưu session
    req.session.userId = result.user.user_id;

    // Trả về success
    res.json({
      success: true,
      message: "Đăng nhập Google thành công",
      redirectUrl: "/",
      user: {
        user_id: result.user.user_id,
        username: result.user.username,
        email: result.user.email,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
```

---

#### 4️⃣ **Service (services/authService.js)**

```javascript
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.loginWithGoogle = async (token) => {
  // 1. Verify token với Google
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const googleId = payload["sub"]; // Google User ID
  const email = payload["email"]; // Email
  const name = payload["name"]; // Full name
  const picture = payload["picture"]; // Avatar URL

  // 2. Kiểm tra user đã tồn tại trong DB chưa?
  const existingUser = await pool.query(
    "SELECT * FROM users WHERE email = $1 OR google_id = $2",
    [email, googleId]
  );

  if (existingUser.rows.length > 0) {
    // User đã tồn tại → Đăng nhập
    const user = existingUser.rows[0];

    // Cập nhật google_id nếu chưa có
    if (!user.google_id) {
      await pool.query(
        "UPDATE users SET google_id = $1, avatar_url = $2 WHERE user_id = $3",
        [googleId, picture, user.user_id]
      );
    }

    return { user, isNewUser: false };
  } else {
    // User chưa tồn tại → Tạo mới
    const username = email.split("@")[0]; // username = email prefix

    const newUser = await pool.query(
      `INSERT INTO users (username, email, full_name, google_id, avatar_url, email_verified)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING *`,
      [username, email, name, googleId, picture]
    );

    return { user: newUser.rows[0], isNewUser: true };
  }
};
```

---

### 🗄️ Database Schema

#### **Table: users**

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),           -- NULL cho Google login
    full_name VARCHAR(100),
    date_of_birth DATE,
    google_id VARCHAR(255) UNIQUE,        -- Google User ID (sub)
    avatar_url TEXT,                      -- Google profile picture
    email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index để tăng tốc query
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
```

**Giải thích các trường quan trọng:**

- `google_id`: Google User ID (từ `payload.sub`). Unique để tránh duplicate.
- `password_hash`: NULL cho user đăng nhập bằng Google (không cần password).
- `avatar_url`: Link ảnh đại diện từ Google.
- `email_verified`: Luôn `true` cho Google login (Google đã verify email).

---

### 🔑 Environment Variables (.env)

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=782580850896-scdrgpulhcsqseak9fmn1vfon3itj8ms.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxx

# Session Secret
SESSION_SECRET=your_random_secret_key_here_min_32_chars

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=schedule_management
DB_USER=postgres
DB_PASSWORD=yourpassword
```

---

### 🌐 Google Cloud Console Configuration

**1. Tạo OAuth 2.0 Client ID:**

- Vào [Google Cloud Console](https://console.cloud.google.com/)
- APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
- Application type: Web application
- Name: Schedule Management App

**2. Authorized JavaScript origins:**

```
http://localhost:8888
http://127.0.0.1:8888
https://yourdomain.com  (production)
```

**3. Authorized redirect URIs:**

```
KHÔNG CẦN điền gì!
Google Identity Services (GIS) không dùng redirect URIs.
```

**4. Lấy Client ID và Client Secret:**

- Copy Client ID → Paste vào `.env` → `GOOGLE_CLIENT_ID`
- Copy Client Secret → Paste vào `.env` → `GOOGLE_CLIENT_SECRET`

---

### ⚠️ Common Errors & Solutions

#### 1. **403 Error: "The given origin is not allowed"**

**Nguyên nhân:**

- Google Console chưa cập nhật `Authorized JavaScript origins`
- Settings chưa propagate (5-30 phút)

**Giải pháp:**

- Kiểm tra `http://localhost:8888` có trong Authorized JavaScript origins
- Đợi 30-60 phút để Google cập nhật
- Xóa cache trình duyệt và reload

---

#### 2. **FedCM Errors**

**Nguyên nhân:**

- Browser đang thử dùng Federated Credential Management (tính năng mới)
- Server chưa cấu hình FedCM

**Giải pháp:**

- Sử dụng `renderButton()` thay vì `prompt()` (popup flow)
- Disable FedCM trong browser settings (tạm thời)
- Trong tương lai, migrate sang FedCM

---

#### 3. **"Invalid token" error**

**Nguyên nhân:**

- Token hết hạn (Google tokens expire sau 1 giờ)
- Token bị modify trước khi gửi đến backend
- GOOGLE_CLIENT_ID không khớp

**Giải pháp:**

```javascript
// Backend verify token
const ticket = await client.verifyIdToken({
  idToken: token,
  audience: process.env.GOOGLE_CLIENT_ID, // Phải khớp với frontend
});
```

---

### 📦 NPM Packages cần thiết

```bash
npm install google-auth-library  # Verify Google tokens
npm install express-session      # Session management
npm install dotenv              # Environment variables
```

**package.json:**

```json
{
  "dependencies": {
    "google-auth-library": "^9.0.0",
    "express-session": "^1.18.0",
    "dotenv": "^16.0.0"
  }
}
```

---

### 🔒 Security Best Practices

1. **Verify token trên backend:**

   ```javascript
   // ✅ ĐÚNG: Verify với Google servers
   const ticket = await client.verifyIdToken({...});

   // ❌ SAI: Tin tưởng token từ frontend
   const payload = jwt.decode(token);  // KHÔNG AN TOÀN!
   ```

2. **Không lưu token vào database:**

   - Token hết hạn sau 1 giờ
   - Chỉ lưu `google_id`, không lưu `idToken`

3. **Validate email từ Google:**

   ```javascript
   if (!payload["email_verified"]) {
     throw new Error("Email chưa được Google verify");
   }
   ```

4. **Session security:**
   ```javascript
   app.use(
     session({
       secret: process.env.SESSION_SECRET,
       resave: false,
       saveUninitialized: false,
       cookie: {
         httpOnly: true, // Chống XSS
         secure: false, // true nếu dùng HTTPS
         maxAge: 24 * 60 * 60 * 1000, // 1 ngày
       },
     })
   );
   ```

---

### 📊 Flow Diagram (Chi tiết)

```
USER CLICKS BUTTON
       │
       ▼
┌─────────────────────────────────────────┐
│  Frontend: login.js                     │
│  customBtn.onclick() → realBtn.click()  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Google Identity Services (GIS)         │
│  - Mở popup chọn tài khoản Google       │
│  - User chọn tài khoản                  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Google OAuth 2.0 Servers               │
│  - Xác thực user                        │
│  - Tạo JWT ID Token                     │
│  - Token chứa: sub, email, name, etc.   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Callback: handleGoogleCallback()       │
│  - Nhận token từ response.credential    │
│  - POST token đến /api/auth/google      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Backend: authController.googleLogin()  │
│  - Nhận token từ req.body               │
│  - Gọi authService.loginWithGoogle()    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Service: authService.loginWithGoogle() │
│  - Verify token với Google              │
│  - Extract: googleId, email, name       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Database: PostgreSQL                   │
│  - Query: SELECT WHERE email/google_id  │
│  - Nếu tồn tại: UPDATE google_id        │
│  - Nếu không: INSERT user mới           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Session Management                     │
│  - req.session.userId = user.user_id    │
│  - Lưu session vào store                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Response to Frontend                   │
│  - { success: true, redirectUrl: '/' }  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Redirect                               │
│  - window.location.href = '/'           │
│  - User đã đăng nhập thành công         │
└─────────────────────────────────────────┘
```

---

### 🧪 Testing

**Test Case 1: User mới đăng nhập lần đầu**

```javascript
// Expected: Tạo user mới, lưu google_id, redirect
const token = "valid_google_token_here";
const response = await fetch("/api/auth/google", {
  method: "POST",
  body: JSON.stringify({ token }),
});
// Response: { success: true, user: {...}, isNewUser: true }
```

**Test Case 2: User cũ đăng nhập lại**

```javascript
// Expected: Đăng nhập vào tài khoản cũ, không tạo duplicate
// Response: { success: true, user: {...}, isNewUser: false }
```

**Test Case 3: Invalid token**

```javascript
const token = "invalid_token";
// Expected: Error 400, message: "Invalid token"
```

---

## 📧 XÁC THỰC OTP (One-Time Password)

### 📌 Tổng quan

OTP là mã xác thực 6 số được gửi qua email để xác minh danh tính người dùng. Mỗi mã chỉ dùng được **1 lần** và hết hạn sau **5 phút**.

---

### 🎯 Cách hoạt động

```
USER ĐĂNG KÝ
     │
     ▼
┌─────────────────────────────────────────┐
│  1. Frontend: register.js               │
│  POST /api/register/initiate            │
│  Body: { username, email, password }    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  2. Backend: authController             │
│  - Validate dữ liệu                     │
│  - Check username/email đã tồn tại?     │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  3. authService.generateOTP()           │
│  - Math.floor(100000 + Math.random()    │
│    * 900000)                            │
│  - Tạo số ngẫu nhiên: 100000-999999     │
│  - VD: "482736"                         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  4. Lưu OTP vào SESSION (KHÔNG DB!)     │
│  req.session.otpData = {                │
│    email: {                             │
│      code: "482736",                    │
│      expiresAt: NOW + 5 phút,           │
│      purpose: "registration"            │
│    }                                    │
│  }                                      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  5. emailService.sendOTPEmail()         │
│  - Gửi email đẹp với OTP code           │
│  - Subject: "Mã xác thực đăng ký"       │
│  - Template HTML responsive             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  6. User nhận email, nhập OTP           │
│  Frontend: verify-otp.ejs               │
│  POST /api/register/verify-otp          │
│  Body: { otpCode: "482736" }            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  7. Verify OTP từ SESSION               │
│  - Check code có khớp?                  │
│  - Check đã hết hạn chưa?               │
│  - Check purpose đúng không?            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  8. Tạo user trong database             │
│  INSERT INTO users (...)                │
│  Xóa OTP từ session                     │
│  Redirect đến trang chủ                 │
└─────────────────────────────────────────┘
```

---

### 💻 Code Implementation

#### 1️⃣ **Tạo mã OTP 6 số**

```javascript
// services/authService.js
generateOTP() {
    // Math.floor: Làm tròn xuống
    // 100000: Số nhỏ nhất có 6 chữ số
    // Math.random(): Số thập phân 0.0 - 1.0
    // * 900000: Khoảng từ 0 đến 899999
    // + 100000: Dịch lên thành 100000 - 999999

    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString(); // Convert number → string

    // Ví dụ:
    // Math.random() = 0.5432 → 0.5432 * 900000 = 488880
    // 100000 + 488880 = 588880 ✅
}
```

**Tại sao dùng cách này?**

- ✅ Nhanh: Không cần loop, chỉ 1 dòng
- ✅ Đảm bảo 6 chữ số: Luôn từ 100000-999999
- ✅ Ngẫu nhiên: Math.random() cryptographically secure (đủ cho OTP)

---

#### 2️⃣ **Lưu OTP vào SESSION (Recommended)**

```javascript
// services/authService.js
async saveOTPToSession(req, email, otpCode, purpose) {
    // Khởi tạo otpData nếu chưa có
    if (!req.session.otpData) {
        req.session.otpData = {};
    }

    // Lưu OTP theo email
    req.session.otpData[email] = {
        code: otpCode,              // "482736"
        purpose: purpose,           // "registration" hoặc "password_reset"
        expiresAt: Date.now() + 5 * 60 * 1000,  // Hết hạn sau 5 phút
        createdAt: Date.now()       // Timestamp tạo
    };

    // Express-session tự động lưu vào store
    // Không cần await, không cần query database
}
```

**Ưu điểm của Session:**

- ✅ **Nhanh hơn database 10-100 lần** (read from memory, not disk)
- ✅ **Tự động cleanup** khi session expire
- ✅ **Không tốn database space**
- ✅ **Không cần migration** (không thêm bảng otp_codes)
- ✅ **Đơn giản hơn** (không cần query, update, delete)

---

#### 3️⃣ **Verify OTP từ SESSION**

```javascript
// services/authService.js
async verifyOTPFromSession(req, email, otpCode, purpose) {
    // 1. Lấy OTP data từ session
    const otpData = req.session.otpData?.[email];

    if (!otpData) {
        return { valid: false, reason: 'OTP không tồn tại' };
    }

    // 2. Check expired (5 phút)
    if (Date.now() > otpData.expiresAt) {
        delete req.session.otpData[email]; // Cleanup
        return { valid: false, reason: 'OTP đã hết hạn' };
    }

    // 3. Check purpose (registration/password_reset)
    if (otpData.purpose !== purpose) {
        return { valid: false, reason: 'OTP không hợp lệ' };
    }

    // 4. Check code
    if (otpData.code !== otpCode) {
        return { valid: false, reason: 'Mã OTP không đúng' };
    }

    // 5. Valid! Xóa OTP (chỉ dùng 1 lần)
    delete req.session.otpData[email];

    return { valid: true };
}
```

**Security checks:**

- ✅ **One-time use**: Xóa sau khi verify
- ✅ **Time-based expiry**: Hết hạn sau 5 phút
- ✅ **Purpose validation**: Không thể dùng OTP registration cho password reset
- ✅ **Email binding**: OTP chỉ dùng cho email đã gửi

---

#### 4️⃣ **Gửi OTP qua Email**

```javascript
// services/emailService.js
async sendOTPEmail(email, otpCode, fullName) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '🔐 Mã xác thực đăng ký tài khoản',
        html: this.getOTPEmailTemplate(otpCode, fullName)
    };

    await this.transporter.sendMail(mailOptions);
}

getOTPEmailTemplate(otpCode, fullName) {
    return `
    <!DOCTYPE html>
    <html>
    <body>
        <div style="max-width:600px; margin:0 auto;">
            <h1>Xin chào ${fullName}</h1>
            <p>Mã OTP của bạn là:</p>
            <div style="font-size:36px; font-weight:bold;
                        letter-spacing:8px; color:#667eea;">
                ${otpCode}
            </div>
            <p>⏰ Mã này có hiệu lực trong 5 phút</p>
        </div>
    </body>
    </html>
    `;
}
```

---

### ⚖️ So sánh: SESSION vs DATABASE

| Tiêu chí            | SESSION (✅ Recommended) | DATABASE (❌ Không tối ưu) |
| ------------------- | ------------------------ | -------------------------- |
| **Tốc độ đọc**      | < 1ms (RAM)              | 10-100ms (Disk I/O)        |
| **Tốc độ ghi**      | < 1ms                    | 10-50ms                    |
| **Storage**         | RAM (temporary)          | Disk (persistent)          |
| **Cleanup**         | Tự động khi expire       | Cần cronjob/trigger        |
| **Code complexity** | Đơn giản                 | Phức tạp (CRUD)            |
| **Database load**   | 0 query                  | +2 queries mỗi OTP         |
| **Scalability**     | Tốt (memory cache)       | Kém (disk bottleneck)      |

**Kết luận:** SESSION thắng áp đảo! ✅

---

### 🔒 Security Best Practices

#### 1. **Rate Limiting** (Chống spam)

```javascript
// Giới hạn số lần gửi OTP
let otpAttempts = {};

function canSendOTP(email) {
  const now = Date.now();
  const attempts = otpAttempts[email] || [];

  // Xóa attempts cũ hơn 1 giờ
  otpAttempts[email] = attempts.filter((t) => now - t < 60 * 60 * 1000);

  // Giới hạn 5 lần/giờ
  if (otpAttempts[email].length >= 5) {
    return false;
  }

  otpAttempts[email].push(now);
  return true;
}
```

#### 2. **Brute Force Protection**

```javascript
// Giới hạn số lần verify sai
function trackFailedAttempts(email) {
  if (!req.session.otpFailures) {
    req.session.otpFailures = {};
  }

  req.session.otpFailures[email] = (req.session.otpFailures[email] || 0) + 1;

  // Block sau 3 lần sai
  if (req.session.otpFailures[email] >= 3) {
    delete req.session.otpData[email]; // Xóa OTP
    throw new Error("Quá nhiều lần nhập sai. Vui lòng gửi lại OTP.");
  }
}
```

#### 3. **Secure Random (Nâng cao)**

```javascript
const crypto = require("crypto");

function generateSecureOTP() {
  // Cryptographically secure random
  const buffer = crypto.randomBytes(3); // 3 bytes = 24 bits
  const number = buffer.readUIntBE(0, 3); // Read as unsigned int
  const otp = (number % 900000) + 100000; // 6 digits
  return otp.toString();
}
```

---

### 🧪 Testing

**Test Case 1: OTP hợp lệ**

```javascript
// 1. Tạo OTP
const otp = authService.generateOTP(); // "482736"

// 2. Lưu vào session
authService.saveOTPToSession(req, "user@gmail.com", otp, "registration");

// 3. Verify
const result = await authService.verifyOTPFromSession(
  req,
  "user@gmail.com",
  "482736",
  "registration"
);
// Expected: { valid: true }
```

**Test Case 2: OTP hết hạn**

```javascript
// 1. Tạo OTP với expiresAt trong quá khứ
req.session.otpData = {
  "user@gmail.com": {
    code: "123456",
    expiresAt: Date.now() - 1000, // 1 giây trước
    purpose: "registration",
  },
};

// 2. Verify
const result = await authService.verifyOTPFromSession(
  req,
  "user@gmail.com",
  "123456",
  "registration"
);
// Expected: { valid: false, reason: 'OTP đã hết hạn' }
```

**Test Case 3: OTP sai**

```javascript
// OTP đúng: "482736"
// User nhập: "482737"

const result = await authService.verifyOTPFromSession(
  req,
  "user@gmail.com",
  "482737",
  "registration"
);
// Expected: { valid: false, reason: 'Mã OTP không đúng' }
```

---

### 📊 Database Schema (Optional - Không khuyến khích)

Nếu bạn vẫn muốn dùng database (scale lớn, nhiều server):

```sql
CREATE TABLE otp_codes (
    otp_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'registration', 'password_reset'
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Index để tăng tốc query
    INDEX idx_email_otp (email, otp_code),
    INDEX idx_expires (expires_at)
);

-- Cleanup job (chạy mỗi giờ)
DELETE FROM otp_codes WHERE expires_at < NOW();
```

**Nhưng tốt hơn hết là dùng SESSION!** ✅

---

### 🔄 Migration từ DATABASE → SESSION

**Bước 1:** Thêm functions mới (đã có ở trên)

```javascript
saveOTPToSession();
verifyOTPFromSession();
```

**Bước 2:** Update controller

```javascript
// CŨ:
await authService.saveOTP(email, otpCode, "registration");

// MỚI:
await authService.saveOTPToSession(req, email, otpCode, "registration");
```

**Bước 3:** Test kỹ

**Bước 4:** Deploy

**Bước 5:** Drop table `otp_codes` (sau 1 tuần)

```sql
DROP TABLE otp_codes;
```

---

## 🔄 CẬP NHẬT SAU NÀY

_(Phần này sẽ được bổ sung thêm các tính năng khác)_

### 📝 Danh sách tính năng cần document:

- [ ] Email OTP verification
- [ ] Task management (CRUD)
- [ ] Calendar view
- [ ] Kanban board
- [ ] File upload/export
- [ ] Notifications system
- [ ] Groups/Collaboration

---

**📅 Lần cập nhật cuối:** November 28, 2025  
**👨‍💻 Tác giả:** DACS2 Project Team
