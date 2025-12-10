# Hướng Dẫn Sử Dụng Chức Năng Theme và Multi-Language

## 📋 Tổng Quan

Website hiện đã được tích hợp đầy đủ 2 chức năng:

1. **Theme (Giao diện Sáng/Tối)** - Tự động lưu vào database
2. **Multi-Language (Đa ngôn ngữ)** - Hỗ trợ Tiếng Việt và English

---

## 🎨 Chức Năng Theme (Dark/Light Mode)

### Cách Sử Dụng

1. **Mở Settings**: Click vào Account → Settings (hoặc nút Setting trong menu)
2. **Chọn Theme**:
   - **Hệ thống** - Tự động theo thiết lập hệ điều hành
   - **Sáng** - Giao diện sáng (Light Mode)
   - **Tối** - Giao diện tối (Dark Mode)
3. **Lưu Thay Đổi**: Click "Lưu thay đổi"

### Cách Hoạt Động

- **Database Storage**: Settings được lưu vào bảng `users`, cột `settings` (JSONB)
- **Instant Apply**: Theme được áp dụng ngay lập tức không cần reload
- **LocalStorage Cache**: Theme được cache để load nhanh khi mở trang
- **Sync Across Devices**: Đăng nhập từ thiết bị khác sẽ tự động đồng bộ theme

### Kỹ Thuật Implementation

**CSS Variables** (`dark-mode.css`):

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #212529;
}

body.dark-mode {
  --bg-primary: #1a1a1a;
  --text-primary: #e5e5e5;
}
```

**JavaScript** (`settings-popup.js`):

- `applyTheme(theme)` - Áp dụng theme
- `saveSettings()` - Lưu vào database qua API
- `loadSettings()` - Load từ database

**API Endpoints**:

- `GET /api/profile/settings` - Lấy settings
- `PUT /api/profile/settings` - Cập nhật settings

---

## 🌍 Chức Năng Multi-Language

### Cách Sử Dụng

1. **Mở Settings**: Click Account → Settings
2. **Chọn Ngôn Ngữ**:
   - **Tiếng Việt** (vi)
   - **English** (en)
3. **Lưu**: Click "Lưu thay đổi" → Trang sẽ tự động reload

### Cách Hoạt Động

- **JSON-Based**: Mỗi ngôn ngữ có 1 file JSON (`vi.json`, `en.json`)
- **Dynamic Loading**: Load file JSON qua API khi cần
- **Attribute-Based**: Sử dụng `data-i18n` attribute để dịch
- **Database Storage**: Language được lưu vào bảng `users`, cột `language`

### Cách Thêm Dịch Cho Trang Mới

**1. Thêm vào file JSON** (`assets/locales/vi.json` và `en.json`):

```json
{
  "myPage": {
    "title": "Tiêu đề trang",
    "description": "Mô tả"
  }
}
```

**2. Thêm attribute vào HTML**:

```html
<h1 data-i18n="myPage.title">Tiêu đề trang</h1>
<p data-i18n="myPage.description">Mô tả</p>

<!-- Cho placeholder -->
<input data-i18n="common.search" data-i18n-placeholder placeholder="Tìm kiếm" />

<!-- Cho title attribute -->
<button data-i18n="common.save" data-i18n-title title="Lưu"></button>
```

**3. Hoặc dùng JavaScript**:

```javascript
const text = window.i18n.t("myPage.title");
document.getElementById("myElement").textContent = text;
```

### File Structure

```
assets/
├── locales/
│   ├── vi.json     # Tiếng Việt
│   └── en.json     # English
└── js/
    └── i18n.js     # i18n engine
```

---

## 🗄️ Database Schema

### Bảng `users` - Cột Settings

```sql
settings JSONB DEFAULT '{"theme": "system", "notifications": true}'
language VARCHAR(5) DEFAULT 'vi'
```

### Ví Dụ Data

```json
{
  "theme": "dark",
  "notifications": true
}
```

---

## 🚀 Migration

### Đã Chạy Migration Tự Động

Migration `add_missing_features.sql` đã thêm:

- ✅ Bảng `sprints` (cho Agile management)
- ✅ Cột `calendar_type` trong `tasks`
- ✅ Cột `role` trong `users` (admin/user)

### Chạy Lại Migration (Nếu Cần)

```bash
npm run update
```

Hoặc chạy trực tiếp:

```bash
node migration/run_add_missing_features.js
```

---

## 📁 Files Đã Tạo/Cập Nhật

### Files Mới

1. `assets/css/dark-mode.css` - CSS cho dark mode
2. `assets/js/i18n.js` - i18n engine
3. `assets/locales/vi.json` - Tiếng Việt translations
4. `assets/locales/en.json` - English translations
5. `views/theme-support.ejs` - Include file cho theme/i18n
6. `migration/add_missing_features.sql` - Migration SQL
7. `migration/run_add_missing_features.js` - Migration runner

### Files Cập Nhật

1. `assets/js/settings-popup.js` - Đồng bộ với database
2. `server.js` - Thêm route `/locales`
3. `package.json` - Cập nhật script `migrate` và `update`
4. `views/index.ejs` - Include `theme-support.ejs`

---

## 🔧 Cách Thêm Theme Vào Trang Khác

### Thêm vào `<head>`:

```html
<%- include('theme-support') %>
```

Hoặc manual:

```html
<link rel="stylesheet" href="/css/dark-mode.css" />
<script src="/js/i18n.js"></script>
```

---

## 🎯 Tối Ưu Hóa

### Performance

- ✅ **CSS Variables**: Chỉ cần đổi 1 attribute, toàn bộ trang tự động update
- ✅ **LocalStorage Cache**: Theme load instant, không đợi API
- ✅ **Lazy Loading**: Chỉ load translation file khi cần
- ✅ **Smooth Transitions**: 0.2s transition cho mượt mà

### User Experience

- ✅ **No Flash**: Theme được áp dụng ngay khi load page
- ✅ **System Preference**: Tự động detect dark mode của OS
- ✅ **Cross-Device Sync**: Settings đồng bộ qua database
- ✅ **Fallback**: Vẫn hoạt động nếu API fail (dùng localStorage)

---

## 🐛 Troubleshooting

### Theme không áp dụng?

1. Xóa localStorage: `localStorage.clear()`
2. Kiểm tra console có lỗi không
3. Kiểm tra database có cột `settings` không

### Language không đổi?

1. Kiểm tra file JSON có tồn tại: `/locales/vi.json`, `/locales/en.json`
2. Kiểm tra server.js có route `/locales` không
3. F5 lại trang sau khi đổi ngôn ngữ

### API không hoạt động?

1. Kiểm tra đã login chưa
2. Kiểm tra route `/api/profile/settings` trong `profileRoutes.js`
3. Kiểm tra database connection

---

## 📞 Support

Nếu có vấn đề, kiểm tra:

1. Console Browser (F12)
2. Server logs
3. Database có dữ liệu chưa

---

## ✨ Tính Năng Nổi Bật

✅ **Dark Mode** đầy đủ với CSS Variables  
✅ **Multi-Language** với i18n system  
✅ **Database Sync** - Lưu settings vào PostgreSQL  
✅ **Instant Apply** - Không cần reload (trừ language)  
✅ **Responsive** - Hoạt động trên mọi thiết bị  
✅ **Fallback** - Graceful degradation nếu API fail

---

**Tác giả**: GitHub Copilot  
**Ngày tạo**: 08/12/2025  
**Version**: 1.0
