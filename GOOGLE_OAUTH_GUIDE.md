# 🔐 HƯỚNG DẪN CHI TIẾT CẤU HÌNH GOOGLE OAUTH

## 📋 MỤC LỤC

1. [Google OAuth là gì?](#google-oauth-là-gì)
2. [Tại sao cần Google OAuth?](#tại-sao-cần-google-oauth)
3. [Chuẩn bị trước khi bắt đầu](#chuẩn-bị-trước-khi-bắt-đầu)
4. [Bước 1: Tạo Google Cloud Project](#bước-1-tạo-google-cloud-project)
5. [Bước 2: Enable Google+ API](#bước-2-enable-google-api)
6. [Bước 3: Tạo OAuth 2.0 Credentials](#bước-3-tạo-oauth-20-credentials)
7. [Bước 4: Cấu hình trong dự án](#bước-4-cấu-hình-trong-dự-án)
8. [Bước 5: Test Google OAuth](#bước-5-test-google-oauth)
9. [Troubleshooting](#troubleshooting)

---

## 🤔 GOOGLE OAUTH LÀ GÌ?

**Google OAuth** là hệ thống cho phép người dùng đăng nhập vào website/app của bạn bằng tài khoản Google mà **KHÔNG cần tạo tài khoản mới**.

**Ví dụ đơn giản:**

- Thay vì phải nhớ username/password của từng website
- Người dùng chỉ cần click "Đăng nhập bằng Google"
- Google xác thực danh tính → Trả thông tin về cho website của bạn
- Website tự động tạo tài khoản hoặc đăng nhập

**Lợi ích:**

- ✅ Người dùng không phải nhớ password
- ✅ Bảo mật cao (do Google quản lý)
- ✅ Tăng conversion rate (dễ đăng ký hơn)
- ✅ Lấy được thông tin: email, tên, avatar

---

## 🎯 TẠI SAO CẦN GOOGLE OAUTH?

**Trong dự án của bạn:**

```
TÀI KHOẢN THÔNG THƯỜNG:
1. Người dùng điền form: username, password, email, họ tên...
2. Nhập mã OTP từ email
3. Mới tạo được tài khoản
→ Mất 5-10 phút, nhiều bước

GOOGLE OAUTH:
1. Click "Đăng nhập với Google"
2. Chọn tài khoản Google
3. Xong!
→ Chỉ 10 giây, 2 clicks
```

**Khi nào người dùng thích dùng Google OAuth?**

- Khi họ vội, muốn dùng nhanh
- Khi không muốn nhớ thêm password
- Khi tin tưởng Google hơn website lạ
- Khi muốn sync dữ liệu với Google (calendar, email...)

---

## 📝 CHUẨN BỊ TRƯỚC KHI BẮT ĐẦU

**Bạn cần có:**

1. ✅ Tài khoản Google (Gmail)
2. ✅ Dự án đã chạy được trên localhost (http://localhost:8888)
3. ✅ Internet connection

**Thời gian cần thiết:** 10-15 phút

**Chi phí:** MIỄN PHÍ (Google Cloud cung cấp free tier)

---

## 🚀 BƯỚC 1: TẠO GOOGLE CLOUD PROJECT

### 1.1. Truy cập Google Cloud Console

Mở trình duyệt và vào:

```
https://console.cloud.google.com/
```

**Đăng nhập** bằng tài khoản Google của bạn.

### 1.2. Tạo Project mới

**Bước 1:** Click vào dropdown "Select a project" ở góc trên bên trái.

```
┌─────────────────────────────────────┐
│  Google Cloud Platform       [▼]    │  ← Click vào đây
└─────────────────────────────────────┘
```

**Bước 2:** Click nút **"NEW PROJECT"** (góc phải trên của popup).

**Bước 3:** Điền thông tin project:

```
Project name: QuanLyLichTrinh
             (hoặc tên bạn thích)

Organization: No organization
             (để mặc định)
```

**Bước 4:** Click **"CREATE"**

**Chờ 10-30 giây** để Google tạo project.

### 1.3. Chọn Project vừa tạo

Sau khi tạo xong, click vào dropdown "Select a project" lại và chọn **"QuanLyLichTrinh"** (project bạn vừa tạo).

✅ **Kiểm tra:** Góc trên bên trái phải hiển thị tên project của bạn.

---

## 🔌 BƯỚC 2: ENABLE GOOGLE+ API

### 2.1. Tại sao cần enable API?

Google có hàng trăm API khác nhau (Maps, Drive, Calendar, YouTube...).
Bạn cần **bật Google+ API** để lấy được thông tin profile người dùng (tên, email, avatar).

### 2.2. Enable API

**Bước 1:** Vào menu bên trái → Click **"APIs & Services"** → **"Library"**

```
Navigation Menu (☰)
├── APIs & Services
│   ├── Dashboard
│   ├── Library          ← Click vào đây
│   ├── Credentials
│   └── ...
```

**Bước 2:** Tìm kiếm **"Google+ API"** hoặc **"People API"**

```
┌─────────────────────────────────┐
│  🔍 Search for APIs & Services  │
│  Google+ API                    │  ← Gõ vào đây
└─────────────────────────────────┘
```

**Bước 3:** Click vào **"Google+ API"** trong kết quả tìm kiếm.

**Bước 4:** Click nút **"ENABLE"** (màu xanh).

**Chờ 5-10 giây** để API được kích hoạt.

✅ **Kiểm tra:** Bạn sẽ thấy badge "API Enabled" màu xanh.

---

## 🔑 BƯỚC 3: TẠO OAUTH 2.0 CREDENTIALS

### 3.1. Credentials là gì?

**Credentials** = Chìa khóa để app của bạn giao tiếp với Google.

Gồm 2 phần:

- **Client ID**: ID công khai (giống username)
- **Client Secret**: Mật khẩu bí mật (KHÔNG được public lên Github!)

### 3.2. Tạo OAuth Consent Screen (Màn hình đồng ý)

**Trước khi tạo credentials, phải tạo OAuth Consent Screen trước!**

**Bước 1:** Vào **"APIs & Services"** → **"OAuth consent screen"**

**Bước 2:** Chọn **"External"** (cho phép bất kỳ ai đăng nhập)

```
User Type:
○ Internal    (chỉ cho Google Workspace)
● External    ← Chọn cái này
```

Click **"CREATE"**

**Bước 3:** Điền thông tin app:

```
App name: QuanLyLichTrinh
         (tên hiển thị khi user đăng nhập Google)

User support email: your-email@gmail.com
                   (email của bạn)

App logo: (tùy chọn, có thể để trống)

Application home page: http://localhost:8888
                      (URL của app)

Authorized domains:
    localhost
    (để trống nếu chỉ test local)

Developer contact: your-email@gmail.com
                  (email của bạn)
```

**Bước 4:** Click **"SAVE AND CONTINUE"**

**Bước 5:** Ở màn hình "Scopes", click **"ADD OR REMOVE SCOPES"**

Tìm và chọn các scopes sau:

```
✓ .../auth/userinfo.email
✓ .../auth/userinfo.profile
✓ openid
```

Click **"UPDATE"** → **"SAVE AND CONTINUE"**

**Bước 6:** Ở màn hình "Test users":

- Click **"ADD USERS"**
- Thêm email của bạn (để test)
- Click **"ADD"** → **"SAVE AND CONTINUE"**

**Bước 7:** Review và click **"BACK TO DASHBOARD"**

✅ **Hoàn tất OAuth Consent Screen!**

### 3.3. Tạo OAuth Client ID

**Bước 1:** Vào **"APIs & Services"** → **"Credentials"**

**Bước 2:** Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

**Bước 3:** Chọn loại application:

```
Application type: Web application  ← Chọn cái này
```

**Bước 4:** Điền thông tin:

```
Name: QuanLyLichTrinh Web Client
     (tên để bạn nhận diện, không quan trọng)

Authorized JavaScript origins:
    http://localhost:8888
    (URL frontend của bạn)

Authorized redirect URIs:
    http://localhost:8888/auth/google/callback
    http://localhost:8888/login
    (URL callback sau khi đăng nhập Google thành công)
```

**CHÚ Ý QUAN TRỌNG:**

- Phải có `http://` hoặc `https://`
- **KHÔNG có dấu `/` cuối cùng**
- Port phải đúng (8888)
- Nếu deploy lên server, thêm domain thật vào (ví dụ: `https://yourdomain.com`)

**Bước 5:** Click **"CREATE"**

### 3.4. Lưu Client ID và Client Secret

Sau khi tạo xong, một popup hiện ra với 2 thông tin quan trọng:

```
┌─────────────────────────────────────────────┐
│  OAuth client created                       │
├─────────────────────────────────────────────┤
│                                             │
│  Your Client ID:                            │
│  123456789012-abcdefghijklmnop.apps.        │
│  googleusercontent.com                      │
│                                             │
│  Your Client Secret:                        │
│  GOCSPX-abcdefghijklmnopqrstuvwx            │
│                                             │
│  [Download JSON]  [OK]                      │
└─────────────────────────────────────────────┘
```

**QUAN TRỌNG:**

1. **Copy Client ID** và lưu lại
2. **Copy Client Secret** và lưu lại
3. Hoặc click **"Download JSON"** để tải file chứa thông tin

⚠️ **CHÚ Ý:** Client Secret giống như password, **KHÔNG được chia sẻ** hoặc push lên Github!

✅ **Hoàn tất tạo credentials!**

---

## ⚙️ BƯỚC 4: CẤU HÌNH TRONG DỰ ÁN

### 4.1. Cập nhật file `.env`

Mở file `.env` trong dự án của bạn:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwx
```

**Thay thế:**

- `123456789012-abcdefghijklmnop.apps.googleusercontent.com` → Client ID bạn vừa copy
- `GOCSPX-abcdefghijklmnopqrstuvwx` → Client Secret bạn vừa copy

**Ví dụ thực tế:**

```env
# TRƯỚC (mặc định)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# SAU (đã cấu hình)
GOOGLE_CLIENT_ID=123456789012-abc123xyz456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-thisIsMyRealSecret123
```

### 4.2. Cập nhật Client ID trong frontend

Mở file `assets/js/login.js`, tìm dòng:

```javascript
const GOOGLE_CLIENT_ID = "<%= process.env.GOOGLE_CLIENT_ID %>";
```

Có 2 cách:

**CÁCH 1: Render từ EJS (khuyên dùng)**

Đổi `login.html` thành `login.ejs` và thêm:

```ejs
<script>
  const GOOGLE_CLIENT_ID = '<%= process.env.GOOGLE_CLIENT_ID %>';
</script>
<script src="/js/login.js"></script>
```

**CÁCH 2: Hardcode trực tiếp (nhanh hơn cho test)**

Trong `login.js`, đổi thành:

```javascript
const GOOGLE_CLIENT_ID = "123456789012-abc123xyz456.apps.googleusercontent.com";
```

⚠️ **Lưu ý:** Cách 2 sẽ public Client ID ra ngoài, nhưng không sao vì Client ID **KHÔNG phải** secret.

### 4.3. Khởi động lại server

```bash
# Stop server nếu đang chạy (Ctrl+C)

# Khởi động lại
npm run dev
```

✅ **Cấu hình hoàn tất!**

---

## 🧪 BƯỚC 5: TEST GOOGLE OAUTH

### 5.1. Test flow đăng nhập

**Bước 1:** Mở trình duyệt, vào `http://localhost:8888/login`

**Bước 2:** Nhìn thấy nút **"Đăng nhập với Google"** với logo Google màu sắc

**Bước 3:** Click vào nút đó

**Bước 4:** Popup Google Sign-In hiện ra, chọn tài khoản Google

```
┌─────────────────────────────────┐
│  Choose an account              │
├─────────────────────────────────┤
│  👤 yourname@gmail.com          │  ← Click vào đây
│  👤 another@gmail.com           │
│  ➕ Use another account         │
└─────────────────────────────────┘
```

**Bước 5:** Google hỏi quyền truy cập:

```
QuanLyLichTrinh wants to access your Google Account
This will allow QuanLyLichTrinh to:
✓ View your email address
✓ View your basic profile info

[Cancel]  [Allow]  ← Click Allow
```

**Bước 6:** Sau khi Allow, bạn sẽ được redirect về trang chủ (`/`) và đăng nhập thành công!

✅ **Kiểm tra:** Header phải hiển thị tên và avatar của bạn từ Google.

### 5.2. Kiểm tra database

Vào database, kiểm tra bảng `users`:

```sql
SELECT * FROM users WHERE google_id IS NOT NULL;
```

Bạn sẽ thấy:

```
user_id | username           | email              | google_id      | avatar_url
--------|--------------------|--------------------|----------------|------------------
5       | yourname_google    | yourname@gmail.com | 123456789...   | https://lh3...
```

- `google_id`: ID duy nhất từ Google (để link tài khoản)
- `avatar_url`: Link ảnh đại diện từ Google

✅ **Test thành công!**

---

## 🐛 TROUBLESHOOTING

### Lỗi 1: "400: redirect_uri_mismatch"

**Nguyên nhân:**
URL trong code không khớp với URL đã đăng ký trong Google Console.

**Cách fix:**

1. Vào Google Console → Credentials
2. Click vào OAuth Client ID bạn đã tạo
3. Kiểm tra "Authorized redirect URIs"
4. Đảm bảo có: `http://localhost:8888/login` (hoặc URL bạn đang dùng)
5. Lưu lại và thử lại

### Lỗi 2: "Access blocked: This app's request is invalid"

**Nguyên nhân:**
Chưa cấu hình OAuth Consent Screen đúng.

**Cách fix:**

1. Vào Google Console → OAuth consent screen
2. Đảm bảo status là "Testing" hoặc "Published"
3. Thêm email của bạn vào "Test users"
4. Thử lại

### Lỗi 3: "idpiframe_initialization_failed"

**Nguyên nhân:**
Cookies bị block hoặc trình duyệt block third-party cookies.

**Cách fix:**

1. Mở Settings của Chrome/Edge
2. Tìm "Cookies"
3. Đảm bảo "Allow all cookies" (hoặc thêm exception cho `accounts.google.com`)
4. Reload trang

### Lỗi 4: "GOOGLE_CLIENT_ID is undefined"

**Nguyên nhân:**
File `.env` chưa load hoặc biến chưa được truyền vào frontend.

**Cách fix:**

1. Kiểm tra file `.env` có tồn tại không
2. Restart server: `npm run dev`
3. Hoặc hardcode trực tiếp trong `login.js` (xem Bước 4.2 - Cách 2)

### Lỗi 5: Đăng nhập thành công nhưng không redirect

**Nguyên nhân:**
Backend không trả về `redirectUrl` hoặc frontend không xử lý đúng.

**Cách fix:**

1. Kiểm tra response từ `/api/auth/google`:

```javascript
console.log("Response:", data);
```

2. Đảm bảo backend trả về:

```json
{
  "success": true,
  "redirectUrl": "/"
}
```

3. Kiểm tra code trong `login.js`:

```javascript
if (data.success) {
  window.location.href = data.redirectUrl || "/";
}
```

### Lỗi 6: "Client ID not found"

**Nguyên nhân:**
Sao chép Client ID sai hoặc thiếu ký tự.

**Cách fix:**

1. Vào Google Console → Credentials
2. Click vào OAuth Client ID
3. Copy lại Client ID (nút copy bên phải)
4. Paste vào `.env`
5. Đảm bảo **KHÔNG có khoảng trắng** ở đầu/cuối

---

## 📚 TÀI LIỆU THAM KHẢO

**Official Documentation:**

- Google Identity Services: https://developers.google.com/identity/gsi/web
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Google Cloud Console: https://console.cloud.google.com/

**Video Tutorials (tiếng Việt):**

- Tìm trên YouTube: "Google OAuth tutorial Vietnamese"
- Hoặc: "Đăng nhập Google trong Node.js"

**Hỏi đáp:**

- Stack Overflow: https://stackoverflow.com/questions/tagged/google-oauth
- Reddit: r/webdev, r/node

---

## ✅ CHECKLIST HOÀN TẤT

Sau khi làm xong, kiểm tra lại:

- [ ] Đã tạo Google Cloud Project
- [ ] Đã enable Google+ API
- [ ] Đã tạo OAuth Consent Screen
- [ ] Đã tạo OAuth Client ID
- [ ] Đã copy Client ID và Client Secret vào `.env`
- [ ] Đã cập nhật `login.js` với Client ID
- [ ] Đã restart server
- [ ] Click "Đăng nhập với Google" → Thành công
- [ ] Kiểm tra database có user mới với `google_id`
- [ ] Avatar từ Google hiển thị đúng

---

## 🎉 HOÀN TẤT!

Giờ bạn đã có hệ thống đăng nhập Google OAuth hoàn chỉnh!

**Bước tiếp theo:**

- Deploy lên server thật (Heroku, Vercel, Railway...)
- Thêm domain thật vào Authorized Origins
- Đổi OAuth Consent Screen từ "Testing" sang "Published" (nếu muốn công khai)

**Nếu còn vấn đề gì, hãy:**

1. Đọc lại phần Troubleshooting
2. Kiểm tra Console Log trong DevTools (F12)
3. Hỏi trên Stack Overflow với tag `google-oauth` và `nodejs`

Chúc bạn thành công! 🚀
