# 🔍 GOOGLE OAUTH - HƯỚNG DẪN & TROUBLESHOOTING

## 🎉 TÍNH NĂNG MỚI

**✅ Đã cập nhật:**

- **Google One Tap** tự động hiện khi vào trang login
- Button Google được render với UI chuẩn của Google
- Password field có `autocomplete="current-password"`
- Callback handling được cải thiện

---

## 🚀 CÁCH HOẠT ĐỘNG

### Khi bạn vào trang login:

1. **Tự động hiện One Tap popup** (góc trên bên phải)

   - Hiển thị tài khoản Google đã đăng nhập
   - Click để đăng nhập nhanh (1 click)

2. **Hoặc click nút "Đăng nhập với Google"**
   - Nếu dismiss One Tap hoặc chưa đăng nhập Google
   - Mở popup chọn account

---

## 📋 CÁCH TEST

### Bước 1: Mở trang login

```
http://localhost:8888/login
```

### Bước 2: Mở Console (F12)

- Nhấn **F12** → Tab **Console**
- Để xem log debug

### Bước 3: Quan sát

**✅ Nếu thành công, bạn sẽ thấy:**

```
🔍 ===== INITIALIZING GOOGLE OAUTH =====
1. CLIENT_ID: 782580850896-scdrgpulhcsqseak9fmn1vfon3itj8ms...
2. google object: object
✅ Khởi tạo Google One Tap...
✅ Hiển thị One Tap prompt...
📋 One Tap moment: display
✅ One Tap hiển thị thành công!
✅ Rendering Google button...
```

**Và thấy popup One Tap ở góc trên bên phải:**

```
┌────────────────────────────────┐
│  Đăng nhập bằng Google         │
├────────────────────────────────┤
│  📧 your-email@gmail.com       │
│  👤 Your Name                   │
│                                │
│  [Tiếp tục với tài khoản này] │
└────────────────────────────────┘
```

### Bước 4: Chọn tài khoản

Click vào popup One Tap hoặc nút Google.

**✅ Sau khi chọn account, sẽ thấy:**

```
🎉 ===== GOOGLE CALLBACK TRIGGERED =====
Response object: {credential: "eyJhbGci...", ...}
Has credential: true
✅ Token received. Length: 1023
Token preview: eyJhbGciOiJSUzI1NiIsImtpZCI6IjdlMDNk...
📤 Sending to backend: /api/auth/google

📥 Backend response status: 200
📥 Response OK: true
📥 Backend data: {
  "success": true,
  "message": "Đăng nhập thành công!",
  "redirectUrl": "/"
}
✅ Login successful! Redirecting...
```

→ **Redirect về trang chủ (Dashboard)**

---

## ❌ TROUBLESHOOTING

### Vấn đề 1: One Tap không hiện

**Log:**

```
⚠️ One Tap không hiển thị. Reason: opt_out
💡 User có thể click vào nút Google để đăng nhập
```

**Nguyên nhân:**

- Bạn đã từng click **"X"** (dismiss) One Tap
- Browser đã lưu opt-out preference
- Cookies bị block

**Giải pháp:**

1. **Click nút "Đăng nhập với Google"** (fallback)
2. Clear cookies:
   ```
   F12 → Application tab → Cookies → localhost:8888 → Delete all
   ```
3. Hoặc thử **Incognito mode** (Ctrl+Shift+N)

---

### Vấn đề 2: SDK chưa load

**Log:**

```
⚠️ Google SDK chưa sẵn sàng, thử lại sau 500ms...
⚠️ Google SDK chưa sẵn sàng, thử lại sau 500ms...
```

**Nguyên nhân:**

- Mạng chậm
- Script `https://accounts.google.com/gsi/client` bị block
- Extension (AdBlock) đang block

**Giải pháp:**

1. Đợi 2-3 giây, script đang loading
2. Hard reload: **Ctrl+F5**
3. Kiểm tra internet connection
4. Tắt AdBlock/extensions
5. Check browser console có error không

---

### Vấn đề 3: Callback không được gọi

**Triệu chứng:**

- Chọn account Google
- Popup đóng
- **KHÔNG** thấy log `🎉 ===== GOOGLE CALLBACK TRIGGERED =====`
- Không redirect

**Debug:**

1. **Check browser console** (F12 → Console tab)

   - Tìm error màu đỏ
   - Copy error message

2. **Check Network tab** (F12 → Network tab)
   - Filter: `gsi`
   - Xem có request nào failed (màu đỏ)
   - Click vào request → Response tab → Xem error

**Lỗi thường gặp:**

#### a) `origin_mismatch`

```
Error: origin_mismatch
redirect_uri: http://localhost:8888/callback
```

**Nguyên nhân:** JavaScript origin không match với Google Console

**Giải pháp:**

1. Vào Google Console: https://console.cloud.google.com/apis/credentials
2. Click vào OAuth Client ID
3. **Authorized JavaScript origins:**
   - ✅ Phải có: `http://localhost:8888`
   - ❌ KHÔNG có port khác (8080, 3000...)
4. **Authorized redirect URIs:**
   - ❌ **Xóa hết** (One Tap không cần redirect URI)
5. Click **Save**
6. Đợi 5-10 phút để Google update
7. Test lại

#### b) `popup_closed_by_user`

**Nguyên nhân:** Bạn đóng popup trước khi chọn account

**Giải pháp:** Test lại, nhớ chọn account

#### c) `access_denied`

**Nguyên nhân:** Bạn click "Cancel" trong popup

**Giải pháp:** Test lại, click "Continue"

---

### Vấn đề 4: Backend error

**Log:**

```
📥 Backend response status: 400
📥 Response OK: false
📥 Backend data: {
  "success": false,
  "message": "Lỗi đăng nhập Google: Invalid token"
}
```

**Check terminal (backend logs):**

```
🔍 ===== BACKEND: Google Login Request =====
Request body: { token: 'eyJhbGc...' }
Has token: true
✅ Token received. Length: 1023
📞 Calling authService.loginWithGoogle()...
❌ ===== Google Login Error =====
Error name: Error
Error message: Invalid token
Stack: Error: Invalid token
    at OAuth2Client.verifyIdToken (...)
```

**Nguyên nhân:**

- `GOOGLE_CLIENT_ID` trong `.env` KHÔNG MATCH với Client ID dùng ở frontend
- `GOOGLE_CLIENT_SECRET` sai
- Token expired (>1 giờ)

**Giải pháp:**

1. **Check `.env` file:**

   ```env
   GOOGLE_CLIENT_ID=782580850896-scdrgpulhcsqseak9fmn1vfon3itj8ms.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=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
   ```

2. **Verify Client ID match:**

   - Frontend (login.ejs): `<%= process.env.GOOGLE_CLIENT_ID %>`
   - Backend (authService.js): `new OAuth2Client(process.env.GOOGLE_CLIENT_ID)`
   - Google Console: Same Client ID

3. **Restart server:**

   ```bash
   Ctrl+C
   npm run dev
   ```

4. **Test lại**

---

### Vấn đề 5: FedCM Warning

**Log:**

```
[GSI_LOGGER]: Your client application uses one of the Google One Tap prompt UI
status methods that may stop functioning when FedCM becomes mandatory...
```

**Đây KHÔNG phải lỗi!** Chỉ là warning về tương lai.

Google đang migrate sang FedCM (Federated Credential Management). Code hiện tại vẫn hoạt động bình thường.

**Bỏ qua warning này.**

---

## 🎯 CHECKLIST ĐẦY ĐỦ

Nếu Google OAuth không hoạt động, check từng bước:

- [ ] **Server đang chạy:** `npm run dev`
- [ ] **`.env` có config đầy đủ:**
  ```env
  GOOGLE_CLIENT_ID=...apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-...
  ```
- [ ] **Restart server sau khi sửa `.env`**
- [ ] **Google Console settings đúng:**
  - ✅ JavaScript origins: `http://localhost:8888`
  - ❌ Redirect URIs: (để trống)
- [ ] **Browser không block popup/cookies**
- [ ] **Internet connection OK**
- [ ] **Không dùng AdBlock/extensions block Google**
- [ ] **Console không có error màu đỏ**

---

## 📸 NẾU VẪN KHÔNG ĐƯỢC

Gửi cho tôi 3 thứ này:

### 1. Browser Console (F12 → Console tab)

Screenshot toàn bộ log từ khi load trang đến khi lỗi.

### 2. Backend Terminal

Copy toàn bộ log từ terminal (từ khi click Google login)

### 3. Google Console Settings

Screenshot trang **OAuth 2.0 Client ID** settings:

- Authorized JavaScript origins
- Authorized redirect URIs (phải trống!)

---

## 💡 TIPS

### Tip 1: Test nhanh với Incognito

```
Ctrl+Shift+N → http://localhost:8888/login
```

Không bị ảnh hưởng cookies/cache cũ.

### Tip 2: Clear Google account cache

```
Chrome → Settings → Privacy → Clear browsing data
→ Chọn "Cookies and site data"
→ Time range: "All time"
→ Clear data
```

### Tip 3: Check Google Console quota

```
Google Console → Dashboard → Quotas
Queries per day: <10,000 / 10,000
```

Nếu hết quota → Đợi ngày mai.

---

**Chúc bạn thành công! 🚀**

_Cập nhật: 2025-11-26_
