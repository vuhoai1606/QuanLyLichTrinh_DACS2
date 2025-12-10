# 🧪 Hướng Dẫn Test Chức Năng Theme và Language

## 📋 Checklist Test

### 1. Test Theme (Chế độ Sáng/Tối)

#### ✅ Bước 1: Mở trang web

```
http://localhost:8888
```

#### ✅ Bước 2: Login vào hệ thống

- Đăng nhập với tài khoản của bạn

#### ✅ Bước 3: Mở Settings

- Click vào **Account** (góc phải header)
- Click **Setting**

#### ✅ Bước 4: Test chuyển đổi theme

1. **Chọn "Tối" (Dark)**

   - Nhấn vào radio button "Tối"
   - ✅ **Kiểm tra:** Giao diện phải đổi sang màu tối NGAY LẬP TỨC
   - Background: đen/xám đậm
   - Text: trắng/xám nhạt
   - Cards: màu xám đậm

2. **Chọn "Sáng" (Light)**

   - Nhấn vào radio button "Sáng"
   - ✅ **Kiểm tra:** Giao diện phải đổi sang màu sáng NGAY LẬP TỨC
   - Background: gradient tím/xanh
   - Text: đen
   - Cards: trắng/xám nhạt

3. **Chọn "Hệ thống" (System)**
   - Nhấn vào radio button "Hệ thống"
   - ✅ **Kiểm tra:** Giao diện theo setting của hệ điều hành

#### ✅ Bước 5: Lưu settings

- Click nút **"Lưu thay đổi"**
- ✅ **Kiểm tra:** Hiện thông báo "Đã lưu cài đặt thành công!"
- Popup tự động đóng sau 1.5 giây

#### ✅ Bước 6: Kiểm tra persistence

1. **F5 (Reload trang)**

   - ✅ Theme vẫn giữ nguyên sau khi reload

2. **Mở tab mới**

   - Mở `http://localhost:8888` ở tab khác
   - ✅ Theme phải giống với tab đầu tiên

3. **Kiểm tra database**
   ```sql
   SELECT user_id, username, settings FROM users WHERE user_id = 1;
   ```
   - ✅ Cột `settings` phải có: `{"theme": "dark", "notifications": true}`

---

### 2. Test Language (Đa Ngôn Ngữ)

#### ✅ Bước 1: Mở Settings

- Click Account → Setting

#### ✅ Bước 2: Đổi ngôn ngữ

1. **Chọn "English"**

   - Trong dropdown "Ngôn ngữ", chọn "English"
   - Click "Lưu thay đổi"
   - ✅ Kiểm tra: Trang tự động reload
   - ✅ Kiểm tra: Text đổi sang English (nếu đã implement translation)

2. **Chọn "Tiếng Việt"**
   - Chọn "Tiếng Việt"
   - Click "Save Changes"
   - ✅ Trang reload về Tiếng Việt

#### ✅ Bước 3: Kiểm tra database

```sql
SELECT user_id, username, language FROM users WHERE user_id = 1;
```

- ✅ Cột `language` phải có giá trị: `vi` hoặc `en`

---

### 3. Test Console Logs (Quan trọng!)

#### Mở Developer Console (F12)

**Khi load trang, bạn sẽ thấy:**

```
🎨 Applying initial theme: light
✅ Light mode applied on load
```

**Khi click radio button theme:**

```
Applying theme: dark
✅ Dark mode activated
💾 Theme saved to localStorage
```

**Khi click "Lưu thay đổi":**

```
💾 Saving settings to database...
Settings to save: {theme: "dark", language: "vi", notifications: true, is2FAEnabled: false}
API Response status: 200
API Response data: {success: true, message: "...", settings: {...}}
✅ Settings saved successfully!
```

---

### 4. Test API Endpoints

#### Test GET Settings

```bash
# Trong Browser Console (khi đã login):
fetch('/api/profile/settings', {credentials: 'same-origin'})
  .then(r => r.json())
  .then(console.log)
```

**Expected Response:**

```json
{
  "success": true,
  "settings": {
    "language": "vi",
    "is2FAEnabled": false,
    "theme": "dark",
    "notifications": true
  }
}
```

#### Test PUT Settings

```bash
# Trong Browser Console:
fetch('/api/profile/settings', {
  method: 'PUT',
  credentials: 'same-origin',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    theme: 'dark',
    language: 'vi',
    notifications: true,
    is2FAEnabled: false
  })
}).then(r => r.json()).then(console.log)
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Cập nhật cài đặt thành công",
  "settings": {...}
}
```

---

### 5. Test Database Storage

#### Kiểm tra trong PostgreSQL:

```sql
-- Xem settings của tất cả users
SELECT
  user_id,
  username,
  language,
  is_2fa_enabled,
  settings,
  updated_at
FROM users;
```

**Expected Output:**

```
user_id | username | language | is_2fa_enabled | settings                                    | updated_at
--------|----------|----------|----------------|---------------------------------------------|--------------------
1       | admin    | vi       | f              | {"theme": "dark", "notifications": true}    | 2025-12-08 10:30:00
```

#### Kiểm tra settings được lưu đúng format:

```sql
-- Lấy theme từ JSONB
SELECT
  username,
  settings->>'theme' as theme,
  settings->>'notifications' as notifications
FROM users
WHERE user_id = 1;
```

---

### 6. Test Visual Changes (Kiểm tra Giao Diện)

#### Light Mode ☀️

- ✅ Background: Gradient tím/xanh sáng
- ✅ Cards: Trắng/sáng
- ✅ Text: Đen
- ✅ Header: Trong suốt/sáng
- ✅ Buttons: Màu tươi sáng

#### Dark Mode 🌙

- ✅ Background: Gradient đen/xanh đậm
- ✅ Cards: Xám đậm (rgba(45, 45, 45, 0.95))
- ✅ Text: Trắng/xám nhạt
- ✅ Header: Xám đậm
- ✅ Buttons: Màu trung tính

#### Transition (Chuyển đổi)

- ✅ Smooth transition 0.3s
- ✅ Không nhấp nháy
- ✅ Tất cả elements đổi màu cùng lúc

---

### 7. Test Cross-Device Sync

1. **Máy tính 1:**

   - Đăng nhập vào account
   - Chọn Dark mode
   - Lưu settings

2. **Máy tính 2 (hoặc browser khác):**
   - Đăng nhập cùng account
   - F5 reload trang
   - ✅ Theme phải là Dark mode (vì đã lưu vào database)

---

## 🐛 Troubleshooting

### Lỗi 1: Theme không đổi khi click

**Nguyên nhân:** CSS chưa load hoặc JavaScript lỗi

**Giải pháp:**

1. F12 → Console → Xem có lỗi không
2. Kiểm tra file `dark-mode.css` đã load chưa: Network tab
3. Kiểm tra `settings-popup.js` đã load chưa

### Lỗi 2: Settings không lưu vào database

**Nguyên nhân:** API lỗi hoặc chưa login

**Giải pháp:**

1. Kiểm tra console: Có log "💾 Saving settings to database..." không?
2. Kiểm tra API response: Status 200?
3. Kiểm tra session: `req.session.userId` có giá trị không?
4. Xem server logs: Có log "📥 Update Settings Request" không?

### Lỗi 3: Theme mất khi reload

**Nguyên nhân:** localStorage bị xóa hoặc không load

**Giải pháp:**

1. F12 → Application → Local Storage → Kiểm tra key `theme`
2. Kiểm tra `theme-support.ejs` đã được include chưa
3. Xóa cache browser: Ctrl+Shift+Delete

### Lỗi 4: Dark mode không tối hoàn toàn

**Nguyên nhân:** CSS specificity thấp hơn

**Giải pháp:**

1. Thêm `!important` vào CSS
2. Kiểm tra thứ tự load CSS (dark-mode.css phải load sau)
3. Inspect element → Xem CSS nào đang apply

---

## ✅ Test Checklist Summary

- [ ] Theme đổi ngay khi click radio button
- [ ] Dark mode: Background đen, text trắng
- [ ] Light mode: Background sáng, text đen
- [ ] Lưu settings thành công (có thông báo)
- [ ] Settings lưu vào database (kiểm tra SQL)
- [ ] Theme giữ nguyên sau F5
- [ ] Theme sync giữa các tabs
- [ ] Console logs hiện đúng
- [ ] API GET /api/profile/settings hoạt động
- [ ] API PUT /api/profile/settings hoạt động
- [ ] Language lưu vào database
- [ ] Không có lỗi trong Console
- [ ] Smooth transition (không giật lag)

---

## 📊 Expected Server Logs

Khi test, bạn sẽ thấy trong terminal:

```
📥 Get Settings Request for userId: 1
✅ Settings retrieved from DB: { language: 'vi', is2FAEnabled: false, theme: 'dark', notifications: true }

📥 Update Settings Request: { userId: 1, language: 'vi', is2FAEnabled: false, theme: 'dark', notifications: true }
📋 Current settings from DB: { theme: 'light', notifications: true }
📝 New settings to save: { theme: 'dark', notifications: true }
🔄 Executing query: UPDATE users SET language = $1, settings = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING language, is_2fa_enabled, settings
📦 With params: [ 'vi', '{"theme":"dark","notifications":true}', 1 ]
✅ Settings updated successfully: { language: 'vi', is2FAEnabled: false, theme: 'dark', notifications: true }
```

---

**Chúc bạn test thành công! 🎉**
