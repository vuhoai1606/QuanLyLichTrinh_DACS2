# Real-time Messaging với Socket.IO

## Tổng quan

Đã implement hệ thống nhắn tin real-time sử dụng Socket.IO thay vì polling. Tin nhắn giờ sẽ hiển thị ngay lập tức khi có người gửi mà không cần reload hoặc nhắn lại vào cuộc trò chuyện.

## Các thay đổi

### 1. Server Setup (server.js)

✅ **Đã thêm:**

- Map để track users online: `onlineUsers` (userId -> socketId)
- Event handler `user:join` để user tham gia room riêng của mình
- Event handler `disconnect` để remove user khỏi danh sách online
- Emit events `user:online` và `user:offline` cho tất cả clients

```javascript
// User join room riêng khi kết nối
socket.on("user:join", (userId) => {
  onlineUsers.set(userId, socket.id);
  socket.userId = userId;
  socket.join(`user:${userId}`);
});
```

### 2. Message Controller (messageController.js)

✅ **Đã thêm vào 2 functions:**

#### sendMessage():

```javascript
// Emit real-time message đến người nhận
if (global.io) {
  const io = global.io;
  io.to(`user:${receiverId}`).emit("message:new", {
    message,
    senderId,
    receiverId,
  });
}
```

#### uploadFile():

```javascript
// Emit real-time message cho file/image uploads
if (global.io) {
  const io = global.io;
  io.to(`user:${receiverId}`).emit("message:new", {
    message,
    senderId,
    receiverId,
  });
}
```

### 3. Frontend (assets/js/messages.js)

✅ **Đã thêm:**

#### Socket.IO initialization:

```javascript
function initSocket() {
  socket = io({
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  // Join user's personal room
  socket.on("connect", () => {
    if (window.currentUserId) {
      socket.emit("user:join", window.currentUserId);
    }
  });

  // Listen for new messages
  socket.on("message:new", (data) => {
    handleNewMessage(data);
  });
}
```

#### Handle incoming messages:

```javascript
function handleNewMessage(data) {
  const { message, senderId } = data;

  // Nếu đang chat với người gửi, hiển thị tin nhắn ngay
  if (currentChatUser && senderId === currentChatUser.other_user_id) {
    appendMessage(message);
    // Mark as read
    fetch(`/api/messages/read/${senderId}`, { method: "PUT" });
  }

  // Reload conversations để cập nhật preview và unread count
  loadConversations();
}
```

✅ **Đã xóa:**

- Biến `messagePolling` và toàn bộ logic polling
- Không còn cần gọi API định kỳ để check tin nhắn mới

### 4. Views (view/messages.ejs và views/messages.ejs)

✅ **Đã thêm:**

```html
<!-- Socket.IO Client Library -->
<script src="/socket.io/socket.io.js"></script>
```

## Cách hoạt động

1. **User mở trang Messages:**

   - Socket.IO connect tự động
   - Emit `user:join` với userId
   - Server lưu user vào room `user:{userId}`

2. **User A gửi tin nhắn cho User B:**

   - Frontend gửi POST request đến `/api/messages/:receiverId`
   - Server lưu tin nhắn vào database
   - Server emit event `message:new` đến room `user:{receiverId}`
   - Frontend của User B nhận event và hiển thị tin nhắn ngay lập tức

3. **Real-time updates:**
   - Tin nhắn text: hiện ngay
   - File/Image uploads: hiện ngay
   - Conversation list: cập nhật preview và unread count
   - Không cần polling, không cần reload

## Lợi ích

✅ **Hiệu suất cao hơn:**

- Không còn polling liên tục mỗi 3-5 giây
- Giảm tải cho server và database
- Giảm bandwidth sử dụng

✅ **Trải nghiệm tốt hơn:**

- Tin nhắn hiện ngay lập tức
- Real-time như Facebook Messenger, WhatsApp Web
- Không delay, không miss messages

✅ **Scalable:**

- Socket.IO hỗ trợ clustering và Redis adapter
- Có thể scale horizontal dễ dàng

## Testing

Để test tính năng này:

1. Mở 2 trình duyệt/tab khác nhau
2. Đăng nhập 2 tài khoản khác nhau
3. Mở trang Messages ở cả 2
4. Gửi tin nhắn từ User A → User B
5. Kiểm tra tin nhắn hiện ngay ở User B mà không cần reload

## Lưu ý kỹ thuật

- Socket.IO tự động serve client library tại `/socket.io/socket.io.js`
- Mỗi user có room riêng: `user:{userId}`
- Event `message:new` chỉ gửi đến người nhận, không broadcast
- Hỗ trợ reconnection tự động khi mất kết nối
- Fallback từ WebSocket sang polling nếu cần

## Các tính năng có thể mở rộng

🔮 **Trong tương lai có thể thêm:**

- Typing indicators (đang nhập...)
- Online/offline status indicators
- Read receipts (đã xem)
- Message reactions (emoji reactions)
- Voice/Video calls
- Group chats với Socket.IO rooms
