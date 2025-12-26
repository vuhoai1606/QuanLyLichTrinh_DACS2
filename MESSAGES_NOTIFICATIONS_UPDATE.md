# Cập nhật Messages & Notifications - Socket.IO Real-time

## 📋 Tổng quan các thay đổi

### 1. Avatar mặc định ✅

#### Vấn đề:

- User không có avatar hiển thị initials (UN) thay vì avatar mặc định
- Avatar từ Google được lưu vào DB

#### Giải pháp:

- **Migration**: Set avatar mặc định `/img/default-avatar.png` cho tất cả users chưa có avatar
- **User.create()**: Tự động set avatar mặc định khi tạo tài khoản local
- **Google OAuth**: Sử dụng avatar mặc định thay vì avatar từ Google

#### Files đã thay đổi:

- `migration/set_default_avatar.sql` - SQL migration
- `migration/run_set_default_avatar.js` - Script chạy migration
- `models/User.js` - Thêm defaultAvatar khi create user
- `services/authService.js` - Google login dùng avatar mặc định

---

### 2. Fix avatar hiển thị trong Messages ✅

#### Vấn đề:

- Khi vừa gửi tin nhắn, avatar hiển thị "UN" (initials)
- Phải reload mới hiển thị đúng avatar

#### Nguyên nhân:

- `messageService.sendMessage()` chỉ return raw message từ DB
- Không join với bảng users để lấy sender info

#### Giải pháp:

- Query thêm thông tin sender (full_name, avatar_url) sau khi insert message
- Return message object đầy đủ bao gồm `sender_name` và `sender_avatar`

#### Files đã thay đổi:

- `services/messageService.js` - Thêm query để lấy sender info

---

### 3. Badge unread messages trong Header ✅

#### Vấn đề:

- Không có chấm đỏ báo tin nhắn chưa đọc trong header

#### Giải pháp:

- **HTML**: Thêm `<span id="messages-badge">` trong nav menu
- **CSS**: Style badge giống notif-badge (chấm đỏ với animation pulse)
- **JavaScript**:
  - `loadUnreadMessagesCount()` - Load unread count từ API
  - Socket.IO listener cho events: `message:new`, `messages:read`
  - Auto update badge real-time khi có tin nhắn mới/đã đọc

#### Files đã thay đổi:

- `views/header.ejs` - Thêm badge HTML
- `assets/css/header.css` - Style cho `.nav-badge`
- `assets/js/header.js` - Load unread count + Socket listeners
- `controllers/messageController.js` - Emit socket event khi mark as read

---

### 4. Socket.IO cho Notifications ✅

#### Vấn đề:

- Admin tạo notification nhưng user phải reload mới thấy
- Không có real-time push notification

#### Giải pháp:

**Backend:**

- `adminService.createSystemNotification()`:
  - Sau khi create notification trong DB
  - Lấy danh sách user IDs dựa vào `targetUsers` (all/specific)
  - Emit socket event `notification:new` đến từng user

**Frontend:**

- `header.js` - Socket listener:
  - Listen event `notification:new`
  - Gọi `loadNotificationsCount()` để update badge
  - Show toast notification popup

**Toast Notification:**

- Hiển thị popup góc phải màn hình
- Gradient background đẹp mắt
- Animation slide in/out
- Auto dismiss sau 5 giây
- Click để đóng

#### Files đã thay đổi:

- `services/adminService.js` - Emit socket khi tạo notification
- `assets/js/header.js` - Listen socket + show toast
- `assets/css/header.css` - Animation cho toast

---

## 🔧 Cách hoạt động

### Messages Real-time Flow:

```
User A gửi tin nhắn → messageController.sendMessage()
                    ↓
              messageService.sendMessage() (return đầy đủ sender info)
                    ↓
              Socket emit "message:new" → user:${receiverId}
                    ↓
              User B's browser nhận event
                    ↓
              appendMessage() - Hiển thị tin nhắn ngay lập tức
              loadUnreadMessagesCount() - Update badge header
```

### Notifications Real-time Flow:

```
Admin tạo notification → adminService.createSystemNotification()
                       ↓
                 Insert vào DB
                       ↓
                 Lấy danh sách user IDs (based on targetUsers)
                       ↓
                 Emit "notification:new" đến từng user
                       ↓
                 User's browser nhận event
                       ↓
                 loadNotificationsCount() - Update badge
                 showNotificationToast() - Hiển thị popup
```

---

## 🎨 UI/UX Improvements

### Messages Badge:

- **Chấm đỏ** (không có số) khi có unread messages
- Animation pulse liên tục
- Hidden khi không có unread
- Update real-time qua Socket.IO

### Notifications Badge:

- **Hiển thị số** unread notifications
- Animation pulse giống messages
- Update real-time khi admin gửi notification

### Toast Notification:

- Gradient background (purple theme)
- Smooth slide animation
- Auto dismiss sau 5s
- Hover effect (slight translate)
- Click anywhere để dismiss

---

## 📝 API Endpoints mới

### Messages:

- `GET /api/messages/unread/count` - Lấy số tin nhắn chưa đọc
- `PUT /api/messages/read/:otherUserId` - Mark messages as read (emit socket event)

### Notifications:

- `GET /api/notifications/count` - Lấy số notifications chưa đọc (đã có sẵn)

---

## 🚀 Socket.IO Events

### Messages:

- **Emit**: `message:new` - Khi có tin nhắn mới
- **Emit**: `messages:read` - Khi user đọc tin nhắn
- **Listen**: `message:new` - Update UI real-time
- **Listen**: `messages:read` - Update badge

### Notifications:

- **Emit**: `notification:new` - Khi admin tạo notification
- **Listen**: `notification:new` - Show toast + update badge

---

## ✅ Testing Checklist

### Avatar mặc định:

- [ ] Chạy migration: `node migration/run_set_default_avatar.js`
- [ ] Đăng ký tài khoản mới (local) → Kiểm tra có avatar mặc định
- [ ] Đăng nhập Google → Kiểm tra có avatar mặc định
- [ ] Gửi tin nhắn → Avatar hiển thị đúng ngay lập tức

### Messages Badge:

- [ ] Có tin nhắn chưa đọc → Hiện chấm đỏ
- [ ] Đọc hết tin nhắn → Chấm đỏ mất
- [ ] Nhận tin nhắn mới → Chấm đỏ hiện ngay (không cần reload)

### Notifications Real-time:

- [ ] Admin tạo notification
- [ ] User nhận được notification ngay lập tức
- [ ] Toast popup hiển thị đẹp
- [ ] Badge notification update số lượng chính xác
- [ ] Click toast → Dismiss

---

## 🐛 Troubleshooting

### Avatar không hiển thị:

1. Kiểm tra file `/img/default-avatar.png` có tồn tại không
2. Chạy migration: `node migration/run_set_default_avatar.js`
3. Clear browser cache

### Socket không connect:

1. Kiểm tra server có chạy không
2. Check console log: "Socket connected"
3. Kiểm tra firewall/proxy

### Badge không update:

1. F12 → Console → Kiểm tra socket events
2. Verify API `/api/messages/unread/count` hoạt động
3. Check Socket.IO connection status

---

## 📦 Dependencies

Không cần cài thêm package mới, đã sử dụng:

- `socket.io` (đã có)
- `pg` (đã có)

---

## 🎯 Kết luận

Tất cả các yêu cầu đã được implement:

✅ Avatar mặc định cho tất cả users
✅ Fix avatar hiển thị sai trong messages
✅ Badge unread messages trong header (chấm đỏ)
✅ Real-time notifications với Socket.IO
✅ Badge notifications với số lượng
✅ Toast notification popup đẹp mắt

Hệ thống giờ đây hoàn toàn real-time, không cần polling, mang lại trải nghiệm tốt hơn cho người dùng!
