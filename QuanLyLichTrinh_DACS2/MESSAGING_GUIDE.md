# 💬 Hệ Thống Messaging - Hướng Dẫn Sử Dụng

## 🎯 Chức Năng Đã Hoàn Thành

### ✅ 1. Tìm Kiếm Người Dùng

- **Tìm theo tên**: Nhập tên người dùng vào ô tìm kiếm
- **Tìm theo email**: Nhập email (chính xác nhất vì email là duy nhất)
- Kết quả hiển thị real-time khi bạn gõ
- Click vào người dùng để bắt đầu chat

### ✅ 2. Gửi Tin Nhắn

- **Text**: Gõ tin nhắn và Enter hoặc click nút gửi
- **Hình ảnh**: Click icon 📎 → Chọn ảnh (.jpg, .png, .gif)
- **Video**: Click icon 📎 → Chọn video (.mp4, .mov, .avi)
- **File**: Click icon 📎 → Chọn file (.pdf, .doc, .docx, .zip, .rar)

### ✅ 3. Nhận Tin Nhắn

- Tin nhắn tự động cập nhật mỗi 3 giây
- Tin nhắn của bạn: Hiển thị bên phải (màu xanh gradient)
- Tin nhắn người khác: Hiển thị bên trái (màu trắng)
- Tự động đánh dấu đã đọc khi mở chat

### ✅ 4. Danh Sách Cuộc Trò Chuyện

- Hiển thị tất cả người đã nhắn tin
- Sắp xếp theo tin nhắn mới nhất
- Hiển thị số tin nhắn chưa đọc
- Click vào để tiếp tục chat

---

## 📁 Cấu Trúc Code

### Backend

```
controllers/messageController.js  - API endpoints
services/messageService.js         - Business logic
routes/messageRoutes.js            - Routes định nghĩa
migration/update_messages_table.sql - Database schema
```

### Frontend

```
views/messages.ejs                 - HTML template
assets/css/messages.css            - Styles
assets/js/messages.js              - JavaScript logic
```

### Database

```sql
-- Bảng chính
messages (
  message_id,
  sender_id,
  receiver_id,
  message_content,
  message_type ENUM('text', 'image', 'file', 'video'),
  attachment_url,
  file_name,
  file_size,
  is_read,
  sent_at
)

-- Bảng tối ưu hiệu suất
conversations (
  conversation_id,
  user1_id,
  user2_id,
  last_message_id,
  last_message_at,
  unread_count_user1,
  unread_count_user2
)
```

---

## 🔌 API Endpoints

### 1. Tìm Kiếm Người Dùng

```
GET /api/messages/search?q=query
Response: { success: true, users: [...] }
```

### 2. Lấy Danh Sách Conversations

```
GET /api/messages/conversations
Response: { success: true, conversations: [...] }
```

### 3. Lấy Tin Nhắn

```
GET /api/messages/:otherUserId
Response: { success: true, messages: [...] }
```

### 4. Gửi Tin Nhắn Text

```
POST /api/messages/:receiverId
Body: { content: "Hello!" }
Response: { success: true, message: {...} }
```

### 5. Upload File/Ảnh/Video

```
POST /api/messages/upload/:receiverId
Body: FormData { file: File, caption: "Optional" }
Response: { success: true, message: {...} }
```

### 6. Đánh Dấu Đã Đọc

```
PUT /api/messages/read/:otherUserId
Response: { success: true }
```

### 7. Lấy Số Tin Nhắn Chưa Đọc

```
GET /api/messages/unread/count
Response: { success: true, count: 5 }
```

### 8. Xóa Tin Nhắn (chỉ người gửi)

```
DELETE /api/messages/:messageId
Response: { success: true }
```

---

## 🎨 Giao Diện

### Layout

- **Sidebar (trái)**:

  - Ô tìm kiếm người dùng
  - Danh sách conversations
  - Badge số tin nhắn chưa đọc

- **Chat Area (phải)**:
  - Header: Avatar + tên người chat
  - Messages: Hiển thị tin nhắn
  - Input: Gõ tin nhắn + attach files

### Colors

- **Primary**: #6366f1 (Indigo)
- **Secondary**: #8b5cf6 (Purple)
- **Success**: #10b981 (Green)
- **Danger**: #ef4444 (Red)
- **Background**: Gradient (Purple to Indigo)

### Responsive

- Desktop: 2 cột (Sidebar + Chat)
- Tablet: 2 cột thu nhỏ
- Mobile: 1 cột (toggle sidebar)

---

## 🚀 Cách Test

### 1. Đăng Nhập

```
Vào http://localhost:8888/login
Đăng nhập với 2 tài khoản khác nhau (dùng 2 browser)
```

### 2. Tìm Người Dùng

```
User A: Vào /messages → Tìm kiếm User B
Click vào User B để mở chat
```

### 3. Gửi Tin Nhắn

```
User A: Gõ "Hello!" → Enter
User B: Refresh → Thấy tin nhắn mới
```

### 4. Upload File

```
User A: Click icon 📎 → Chọn ảnh → Gửi
User B: Thấy ảnh trong chat
```

### 5. Kiểm Tra Conversations

```
User B: Vào /messages → Thấy User A trong danh sách
Click vào User A → Tiếp tục chat
```

---

## ⚡ Tối Ưu Hiệu Suất

### 1. Database Indexes

- `idx_messages_conversation`: Tìm tin nhắn giữa 2 users
- `idx_messages_unread`: Đếm tin nhắn chưa đọc
- `idx_conversations_user1/user2`: Tìm conversations

### 2. Caching

- Conversations được cache trong bảng riêng
- Không cần JOIN phức tạp mỗi lần load

### 3. Polling

- Auto-refresh mỗi 3 giây (có thể chuyển sang WebSocket)
- Chỉ load tin nhắn của chat đang mở

### 4. File Upload

- Giới hạn 50MB
- Lưu file vào `/uploads/messages/`
- Auto-detect loại file (image/video/file)

---

## 🐛 Troubleshooting

### Không Thấy Tin Nhắn Mới?

- Check console log: Có lỗi API không?
- Check database: Tin nhắn đã được lưu chưa?
- Check polling: Có đang chạy không? (mỗi 3s)

### Upload File Thất Bại?

- Check file size: > 50MB?
- Check file type: Có trong whitelist không?
- Check folder permission: `/uploads/messages/` writable?

### Search Không Hoạt Động?

- Check query length: >= 1 ký tự
- Check database: Users có tồn tại không?
- Check API: `/api/messages/search` có response không?

---

## 📝 TODO (Nếu Muốn Nâng Cấp)

### 1. Real-time với Socket.IO

```javascript
// Thay vì polling, dùng WebSocket
socket.on("new_message", (message) => {
  renderNewMessage(message);
});
```

### 2. Typing Indicator

```javascript
// Hiển thị "Đang nhập..."
socket.emit("typing_start", { userId, receiverId });
```

### 3. Read Receipts

```javascript
// Hiển thị "✓✓" khi đã đọc
message.is_read === true ? "✓✓" : "✓";
```

### 4. Emoji Picker

```javascript
// Thêm emoji picker library
npm install emoji-picker-element
```

### 5. Voice Messages

```javascript
// Ghi âm và gửi
navigator.mediaDevices.getUserMedia({ audio: true });
```

### 6. Group Chat

```sql
-- Mở rộng để hỗ trợ nhóm chat
ALTER TABLE messages ADD COLUMN group_id INT;
```

---

## ✅ Kết Luận

### Đã Hoàn Thành

✅ Tìm kiếm người dùng (theo tên và email)  
✅ Gửi tin nhắn text  
✅ Gửi ảnh, video, file  
✅ Nhận tin nhắn real-time (polling)  
✅ Danh sách conversations  
✅ Đánh dấu đã đọc  
✅ Số tin nhắn chưa đọc  
✅ UI đẹp và responsive  
✅ Database tối ưu (indexes, triggers)

### Sẵn Sàng Sử Dụng

Hệ thống messaging đã hoàn chỉnh và sẵn sàng cho production!

Truy cập: **http://localhost:8888/messages**

---

## 📞 Support

Nếu gặp vấn đề, check:

1. Console log (F12)
2. Network tab (API responses)
3. Database (pgAdmin / psql)
4. Server log (terminal chạy node server.js)
