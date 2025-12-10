# 🌍 Demo Chức Năng Đa Ngôn Ngữ (i18n)

## 📍 Các Chỗ Thay Đổi Ngôn Ngữ

### 1. **Header / Navigation** 🧭

Khi đổi sang English, các menu sẽ đổi:

- **Home** → Home (giữ nguyên)
- **Tasks** → Tasks (giữ nguyên)
- **Calendar** → Calendar (giữ nguyên)
- **Kanban** → Kanban (giữ nguyên)
- **Reports** → Reports (giữ nguyên)
- **Groups** → Groups (giữ nguyên)
- **Export / Import** → Export / Import (giữ nguyên)
- **Account** → Account (giữ nguyên)
  - **Profile** → Profile (giữ nguyên)
  - **Setting** → Setting (giữ nguyên)
  - **Logout** → Logout (giữ nguyên)

### 2. **Dashboard Page** 🏠

**Tiếng Việt:**

- Dashboard
- Tổng quan công việc & lịch trình hôm nay
- Thêm nhanh
- HOÀN THÀNH: 0
- ĐANG LÀM: 0
- QUÁ HẠN: 0
- TỔNG NHIỆM VỤ: 2
- Chào buổi chiều
- Công việc hôm nay
- Không có công việc nào hôm nay - hãy tạo một nhiệm vụ mới!
- Sự kiện sắp tới
- Không có sự kiện sắp tới

**English:**

- Dashboard
- Overview of today's tasks & schedule
- Quick Add
- COMPLETED: 0
- IN PROGRESS: 0
- OVERDUE: 0
- TOTAL TASKS: 2
- Good afternoon
- Today's Tasks
- No tasks for today - create a new one!
- Upcoming Events
- No upcoming events

### 3. **Tasks Page** ✅

**Tiếng Việt:**

- Tasks
- Quản lý công việc của bạn
- New Task
- Tìm kiếm...
- Tất cả trạng thái
- Tất cả độ ưu tiên
- Không có nhiệm vụ nào
- Tạo nhiệm vụ đầu tiên của bạn!

**English:**

- Tasks
- Manage your tasks
- New Task
- Search...
- All Status
- All Priority
- No tasks found
- Create your first task!

### 4. **Calendar Page** 📅

**Tiếng Việt:**

- Lịch
- Today (giữ nguyên)
- Tháng / Tuần / Ngày
- Danh sách

**English:**

- Calendar
- Today
- Month / Week / Day
- List

### 5. **Profile Page** 👤

**Tiếng Việt:**

- Hồ sơ cá nhân
- Quản lý thông tin tài khoản của bạn
- Lưu thay đổi
- Thông tin cá nhân
- Họ và tên
- Ngày sinh
- Giới tính
- Số điện thoại
- Email
- Đổi mật khẩu
- Mật khẩu cũ
- Mật khẩu mới
- Xác nhận mật khẩu

**English:**

- Profile
- Manage your account information
- Save Changes
- Personal Information
- Full Name
- Date of Birth
- Gender
- Phone Number
- Email
- Change Password
- Old Password
- New Password
- Confirm Password

### 6. **Settings Popup** ⚙️

**Tiếng Việt:**

- Cài đặt
- Giao diện
  - Hệ thống
  - Sáng
  - Tối
- Ngôn ngữ
  - Tiếng Việt
  - English
- Thông báo
  - Bật / Tắt
- Xác thực 2 bước (2FA)
  - Bật / Tắt
- Đóng
- Lưu thay đổi

**English:**

- Settings
- Theme
  - System
  - Light
  - Dark
- Language
  - Tiếng Việt
  - English
- Notifications
  - On / Off
- Two-Factor Authentication (2FA)
  - On / Off
- Close
- Save Changes

### 7. **Buttons & Actions** 🔘

**Tiếng Việt:**

- Thêm
- Sửa
- Xóa
- Lưu
- Hủy
- Tìm kiếm
- Lọc
- Sắp xếp

**English:**

- Add
- Edit
- Delete
- Save
- Cancel
- Search
- Filter
- Sort

---

## 🎯 Cách Demo Chức Năng i18n

### Bước 1: Thêm data-i18n vào HTML

**Ví dụ trong `index.ejs`:**

```html
<!-- Trước -->
<h1>Dashboard</h1>
<p>Tổng quan công việc & lịch trình hôm nay</p>
<button>Thêm nhanh</button>

<!-- Sau -->
<h1 data-i18n="nav.dashboard">Dashboard</h1>
<p data-i18n="common.dashboardSubtitle">
  Tổng quan công việc & lịch trình hôm nay
</p>
<button data-i18n="common.quickAdd">Thêm nhanh</button>
```

### Bước 2: Update JSON files

**`vi.json`:**

```json
{
  "nav": {
    "dashboard": "Dashboard"
  },
  "common": {
    "dashboardSubtitle": "Tổng quan công việc & lịch trình hôm nay",
    "quickAdd": "Thêm nhanh"
  }
}
```

**`en.json`:**

```json
{
  "nav": {
    "dashboard": "Dashboard"
  },
  "common": {
    "dashboardSubtitle": "Overview of today's tasks & schedule",
    "quickAdd": "Quick Add"
  }
}
```

### Bước 3: JavaScript tự động apply

Khi user đổi language trong Settings:

1. Click "English"
2. Click "Lưu thay đổi"
3. Trang reload
4. `i18n.js` load `en.json`
5. Tất cả elements với `data-i18n` tự động đổi sang English

---

## 📊 Trang Nào Hỗ Trợ i18n?

### ✅ Đã Có i18n Support

(Chỉ cần thêm `data-i18n` attributes)

1. **Dashboard (index.ejs)** ✅
2. **Tasks** ✅
3. **Calendar** ✅
4. **Kanban** ✅
5. **Timeline** ✅
6. **Reports** ✅
7. **Groups** ✅
8. **Notifications** ✅
9. **Profile** ✅
10. **Export/Import** ✅
11. **Settings Popup** ✅
12. **Header** ✅

### ❌ Chưa Thêm i18n

(Trang auth không cần theme/i18n)

- Login
- Register
- Forgot Password
- Verify OTP
- Logout

---

## 🔄 Flow Hoạt Động i18n

```
1. User vào Settings
   ↓
2. Click dropdown "Ngôn ngữ"
   ↓
3. Chọn "English"
   ↓
4. Click "Lưu thay đổi"
   ↓
5. API lưu language = 'en' vào database
   ↓
6. Trang reload
   ↓
7. i18n.js đọc language từ server
   ↓
8. Load file /locales/en.json
   ↓
9. Tìm tất cả elements có data-i18n
   ↓
10. Đổi textContent theo key trong en.json
    ↓
11. Xong! Trang đã sang English
```

---

## 💡 Ví Dụ Thực Tế

### Trước (Tiếng Việt):

```
Dashboard
Tổng quan công việc & lịch trình hôm nay
[Thêm nhanh]

HOÀN THÀNH    ĐANG LÀM    QUÁ HẠN    TỔNG NHIỆM VỤ
     0             0          0            2
```

### Sau (English):

```
Dashboard
Overview of today's tasks & schedule
[Quick Add]

COMPLETED    IN PROGRESS    OVERDUE    TOTAL TASKS
    0             0            0            2
```

---

## 🎨 Test i18n

1. **Mở Settings**
2. **Chọn "English"**
3. **Click "Lưu thay đổi"**
4. **Xem các text đã đổi chưa**
5. **F12 Console** → Xem logs:
   ```
   🌍 Language changed to: en
   📥 Loading translation file: /locales/en.json
   ✅ Translations loaded: {...}
   🔄 Updating page translations...
   ```

---

## 📝 Lưu Ý

### Hiện Tại:

- ✅ Infrastructure đã sẵn sàng (i18n.js)
- ✅ JSON files đã có (vi.json, en.json)
- ✅ API lưu/load language từ database
- ❌ **Chưa thêm `data-i18n` vào HTML elements**

### Để Hoàn Thiện:

1. Thêm `data-i18n` attribute vào các elements cần dịch
2. Update `vi.json` và `en.json` với tất cả text
3. Test từng trang để đảm bảo translations đúng

### Trang Nào Đổi Được Ngay?

**KHÔNG CÓ TRANG NÀO** - vì chưa thêm `data-i18n` attributes vào HTML!

Hiện tại chỉ có **infrastructure** sẵn sàng, nhưng chưa implement vào từng trang.

---

## 🚀 Next Steps

Nếu muốn implement đầy đủ:

1. Mở từng file `.ejs`
2. Thêm `data-i18n="key.path"` vào elements
3. Update `vi.json` và `en.json`
4. Test reload trang

**Ước tính:** 2-3 giờ để implement đầy đủ cho tất cả trang.
