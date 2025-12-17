# DATABASE SCHEMA - Tài Liệu Tổng Hợp

## Tổng Quan
File này mô tả chi tiết cấu trúc database của hệ thống Quản Lý Lịch Trình.

## Cách Sử Dụng

### Tạo lại toàn bộ database:
```bash
node migration/run_full_schema.js
```

### Hoặc chạy trực tiếp SQL:
```bash
psql -U postgres -d quanlylichtrinh -f migration/full_schema.sql
```

---

## 📋 DANH SÁCH CÁC BẢNG

### 1. **users** - Người dùng
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | SERIAL PK | ID người dùng |
| username | VARCHAR(50) UNIQUE | Tên đăng nhập |
| password_hash | VARCHAR(255) | Mật khẩu đã hash |
| email | VARCHAR(100) UNIQUE | Email |
| full_name | VARCHAR(100) | Họ và tên |
| avatar_url | TEXT | URL ảnh đại diện |
| google_id | VARCHAR(255) UNIQUE | Google OAuth ID |
| login_provider | VARCHAR(20) | 'local' hoặc 'google' |
| is_2fa_enabled | BOOLEAN | Bật 2FA hay không |
| language | VARCHAR(10) | 'vi' hoặc 'en' |
| settings | JSONB | Cài đặt người dùng |
| gender | VARCHAR(20) | Giới tính |
| phone_number | VARCHAR(15) | Số điện thoại |
| role | VARCHAR(20) | 'admin' hoặc 'user' |
| is_active | BOOLEAN | Tài khoản có active không |
| last_login_at | TIMESTAMP | Lần đăng nhập cuối |
| is_banned | BOOLEAN | Có bị ban không |
| ban_reason | TEXT | Lý do ban |
| ban_date | TIMESTAMP | Thời điểm ban |
| created_at | TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | Ngày cập nhật |

---

### 2. **categories** - Danh mục
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| category_id | SERIAL PK | ID danh mục |
| user_id | INT FK → users | Chủ sở hữu |
| category_name | VARCHAR(100) | Tên danh mục |
| color_code | VARCHAR(7) | Mã màu (#RRGGBB) |
| created_at | TIMESTAMP | Ngày tạo |

---

### 3. **tasks** - Công việc
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| task_id | SERIAL PK | ID công việc |
| user_id | INT FK → users | Chủ sở hữu |
| category_id | INT FK → categories | Danh mục |
| title | VARCHAR(255) | Tiêu đề |
| description | TEXT | Mô tả |
| due_date | DATE | Hạn chót |
| priority | priority_enum | 'low', 'medium', 'high' |
| status | status_enum | 'todo', 'in_progress', 'done', 'overdue' |
| progress | INT | Tiến độ (0-100%) |
| reminder_time | TIMESTAMP | Thời gian nhắc nhở |
| repeat_type | repeat_type_enum | 'none', 'daily', 'weekly', 'monthly', 'yearly' |
| notes | TEXT | Ghi chú |
| calendar_type | VARCHAR(50) | 'Work', 'Personal', etc. |
| kanban_column | VARCHAR(50) | Cột kanban |
| sprint_id | INT FK → sprints | Sprint liên quan |
| is_overdue | BOOLEAN | Có quá hạn không |
| overdue_notified | BOOLEAN | Đã thông báo quá hạn chưa |
| created_at | TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | Ngày cập nhật |

---

### 4. **events** - Sự kiện
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| event_id | SERIAL PK | ID sự kiện |
| user_id | INT FK → users | Chủ sở hữu |
| category_id | INT FK → categories | Danh mục |
| event_name | VARCHAR(255) | Tên sự kiện |
| description | TEXT | Mô tả |
| start_time | TIMESTAMP | Thời gian bắt đầu |
| end_time | TIMESTAMP | Thời gian kết thúc |
| location | VARCHAR(255) | Địa điểm |
| is_all_day | BOOLEAN | Sự kiện cả ngày |
| priority | priority_enum | Mức độ ưu tiên |
| status | status_enum | Trạng thái |
| reminder_time | TIMESTAMP | Thời gian nhắc nhở |
| repeat_type | repeat_type_enum | Loại lặp lại |
| notes | TEXT | Ghi chú |
| calendar_type | VARCHAR(100) | Loại lịch |
| created_at | TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | Ngày cập nhật |

---

### 5. **shared_events** - Chia sẻ sự kiện
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| share_id | SERIAL PK | ID chia sẻ |
| event_id | INT FK → events | Sự kiện được chia sẻ |
| owner_id | INT FK → users | Người sở hữu |
| shared_with_user_id | INT FK → users | Người được chia sẻ |
| share_type | share_type_enum | 'shared' hoặc 'copied' |
| permission | permission_enum | 'view' hoặc 'edit' |
| created_at | TIMESTAMP | Ngày chia sẻ |

---

### 6. **messages** - Tin nhắn
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| message_id | SERIAL PK | ID tin nhắn |
| sender_id | INT FK → users | Người gửi |
| receiver_id | INT FK → users | Người nhận (1-1) |
| group_id | INT FK → chat_groups | Nhóm (group chat) |
| message_content | TEXT | Nội dung |
| message_type | message_type_enum | 'text', 'file', 'image', 'video' |
| file_url | TEXT | URL file đính kèm |
| is_read | BOOLEAN | Đã đọc chưa |
| sent_at | TIMESTAMP | Thời gian gửi |

**Ràng buộc:** Phải có receiver_id HOẶC group_id (không được cả hai)

---

### 7. **notifications** - Thông báo cá nhân
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| notification_id | SERIAL PK | ID thông báo |
| user_id | INT FK → users | Người nhận |
| title | VARCHAR(200) | Tiêu đề |
| message | TEXT | Nội dung |
| type | notification_type_enum | 'task', 'event', 'message', 'system', 'sprint' |
| is_read | BOOLEAN | Đã đọc chưa |
| created_at | TIMESTAMP | Thời gian tạo |
| redirect_url | TEXT | URL chuyển hướng |
| related_id | INT | ID liên quan (task_id, event_id, system_notification_id) |

**Lưu ý:** 
- Thông báo cá nhân của từng user
- Không có start_date/end_date (thông tin đó ở system_notifications)
- Query có JOIN với system_notifications để filter theo thời gian

---

### 8. **system_notifications** - Thông báo hệ thống (Admin)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| notification_id | SERIAL PK | ID thông báo hệ thống |
| created_by | INT FK → users | Admin tạo |
| title | VARCHAR(200) | Tiêu đề |
| content | TEXT | Nội dung |
| notification_type | VARCHAR(50) | 'info', 'warning', 'urgent', 'maintenance' |
| is_active | BOOLEAN | Còn active không |
| **start_date** | **TIMESTAMP** | **Thời gian bắt đầu hiển thị** |
| **end_date** | **TIMESTAMP** | **Thời gian kết thúc hiển thị (NULL = vĩnh viễn)** |
| target_users | TEXT | 'all' hoặc JSON array [1,2,3] |
| created_at | TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | Ngày cập nhật |

**Cách hoạt động:**
- Admin tạo thông báo → lưu vào bảng này
- Đồng thời tạo N records trong `notifications` (1 cho mỗi user)
- `notifications.related_id` = `system_notifications.notification_id`
- Query notifications sẽ JOIN với bảng này để filter theo `start_date` và `end_date`
- Chỉ hiển thị nếu: `start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW())`

---

### 9. **sprints** - Sprint (Agile)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| sprint_id | SERIAL PK | ID sprint |
| user_id | INT FK → users | Chủ sở hữu |
| title | VARCHAR(255) | Tiêu đề sprint |
| start_date | DATE | Ngày bắt đầu |
| end_date | DATE | Ngày kết thúc |
| created_at | TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | Ngày cập nhật |

---

### 10. **conversations** - Cuộc trò chuyện
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| conversation_id | SERIAL PK | ID cuộc trò chuyện |
| user1_id | INT FK → users | User 1 (smaller ID) |
| user2_id | INT FK → users | User 2 (larger ID) |
| last_message_id | INT | ID tin nhắn cuối |
| unread_count | INT | Số tin chưa đọc |
| created_at | TIMESTAMP | Ngày tạo |
| updated_at | TIMESTAMP | Ngày cập nhật |

**Ràng buộc:** user1_id < user2_id (để tránh duplicate)

---

### 11. **admin_logs** - Nhật ký Admin
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| log_id | SERIAL PK | ID log |
| admin_id | INT FK → users | Admin thực hiện |
| action_type | VARCHAR(50) | Loại hành động |
| target_user_id | INT FK → users | User bị tác động |
| description | TEXT | Mô tả |
| metadata | JSONB | Dữ liệu chi tiết |
| ip_address | VARCHAR(45) | IP thực hiện |
| created_at | TIMESTAMP | Thời gian |

---

### 12. **user_activity_stats** - Thống kê hoạt động
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | INT PK FK → users | ID người dùng |
| total_tasks | INT | Tổng số tasks |
| total_events | INT | Tổng số events |
| total_messages_sent | INT | Tổng số tin nhắn gửi |
| last_active_at | TIMESTAMP | Hoạt động cuối |
| account_created_at | TIMESTAMP | Ngày tạo tài khoản |

---

## 🔧 CUSTOM TYPES (ENUMS)

1. **repeat_type_enum**: 'none', 'daily', 'weekly', 'monthly', 'yearly'
2. **priority_enum**: 'low', 'medium', 'high'
3. **status_enum**: 'todo', 'in_progress', 'done', 'overdue'
4. **share_type_enum**: 'shared', 'copied'
5. **permission_enum**: 'view', 'edit'
6. **notification_type_enum**: 'task', 'event', 'message', 'system', 'sprint'
7. **message_type_enum**: 'text', 'file', 'image', 'video'

---

## 🔍 INDEXES

- **users**: email, username, role, is_banned
- **tasks**: user_id, due_date, status, sprint_id
- **events**: user_id, start_time/end_time
- **messages**: sender_id, receiver_id, group_id, sent_at
- **notifications**: user_id + is_read
- **conversations**: user1_id + user2_id, updated_at
- **system_notifications**: is_active + start_date, notification_type
- **user_sessions**: expire

---

## ⚡ TRIGGERS

1. **update_updated_at**: Tự động cập nhật cột `updated_at` cho users, tasks, events, sprints
2. **update_conversation_on_message**: Tự động cập nhật bảng conversations khi có tin nhắn mới
3. **update_user_activity_stats**: Tự động cập nhật thống kê khi tạo task/event/message

---

## 📊 VIEWS

**admin_dashboard_overview**: Tổng quan thống kê cho admin
- total_users
- banned_users
- new_users_last_30_days
- total_tasks
- total_events
- total_messages
- active_notifications

---

## 🔄 QUAN HỆ GIỮA CÁC BẢNG

```
users (1) ─────< (N) tasks
users (1) ─────< (N) events
users (1) ─────< (N) categories
users (1) ─────< (N) notifications
users (1) ─────< (N) messages (sender)
users (1) ─────< (N) messages (receiver)
users (1) ─────< (N) admin_logs (admin)
users (1) ─────< (N) system_notifications (created_by)

tasks (N) ─────> (1) sprints
events (1) ─────< (N) shared_events
messages (N) ─────> (1) conversations (tự động trigger)

system_notifications (1) ─────< (N) notifications (via related_id)
```

---

## 📝 GHI CHÚ QUAN TRỌNG

### Về Thông Báo Hệ Thống:
1. Admin tạo thông báo → insert vào `system_notifications`
2. Đồng thời tạo N records trong `notifications` (1 cho mỗi user)
3. `notifications.related_id` trỏ về `system_notifications.notification_id`
4. Query sẽ JOIN 2 bảng để filter theo `start_date`
5. **Không tự động xóa** khi "hết hạn" - ghi thời gian hết hạn vào content
6. Scheduler chạy mỗi phút để emit socket cho users online khi đến giờ

### Về Tin Nhắn:
- Tin nhắn 1-1: có `receiver_id`, không có `group_id`
- Tin nhắn nhóm: có `group_id`, không có `receiver_id`
- Bảng `conversations` tự động cập nhật khi có tin nhắn mới (trigger)

---

## 🚀 VÍ DỤ SỬ DỤNG

### Tạo user mới:
```sql
INSERT INTO users (username, email, password_hash, full_name)
VALUES ('john_doe', 'john@example.com', '$2b$10$...', 'John Doe');
```

### Query notifications của user (có filter theo thời gian):
```sql
SELECT n.* 
FROM notifications n
LEFT JOIN system_notifications sn ON n.related_id = sn.notification_id
WHERE n.user_id = 1
  AND (
    n.related_id IS NULL  -- Notification thường
    OR (
      sn.start_date <= NOW()  -- Đã đến giờ hiển thị
      AND sn.is_active = true
    )
  )
ORDER BY n.created_at DESC;
```

---

Được tạo ngày: 2025-12-16
Phiên bản: 1.0
