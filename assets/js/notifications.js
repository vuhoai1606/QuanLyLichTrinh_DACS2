// assets/js/notifications.js
// ===================================================================
// notifications.js - FRONTEND (CHỈ XỬ LÝ UI & GỌI API)
// Backend xử lý toàn bộ logic notifications
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const notiList = document.getElementById('noti-list');
    const markAllBtn = document.getElementById('mark-read');

    let notifications = [];           // Dữ liệu từ API
    let currentFilter = 'all';        // all | task | event | message | system

    // ===================================================================
    // 1. Load notifications + badge khi vào trang
    // ===================================================================
    loadNotifications();

    // ===================================================================
    // 2. Event Listeners
    // ===================================================================
    if (markAllBtn) {
        markAllBtn.addEventListener('click', markAllAsRead);
    }

    // Click đánh dấu đã đọc từng cái
    notiList?.addEventListener('click', e => {
        const btn = e.target.closest('.btn-mark');
        if (!btn) return;

        const notifId = btn.dataset.id;
        markAsRead(notifId);
    });

    // Filter buttons (nếu có)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type || 'all';
            render();
        });
    });

    // ===================================================================
    // 3. API CALLS
    // ===================================================================

    /** Lấy danh sách thông báo */
    async function loadNotifications() {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();

            if (data.success) {
                notifications = data.notifications || [];
                render();
                updateGlobalBadge();
            } else {
                console.warn('Load notifications failed:', data.message);
            }
        } catch (err) {
            console.error('Lỗi load notifications:', err);
        }
    }

    /** Đánh dấu tất cả đã đọc */
    async function markAllAsRead() {
        try {
            const res = await fetch('/api/notifications/mark-all', { method: 'PATCH' });
            const data = await res.json();

            if (data.success) {
                loadNotifications(); // reload để đồng bộ
            }
        } catch (err) {
            console.error('Lỗi mark all read:', err);
        }
    }

    /** Đánh dấu một thông báo đã đọc */
    async function markAsRead(notifId) {
        try {
            const res = await fetch(`/api/notifications/${notifId}/mark`, { method: 'PATCH' });
            const data = await res.json();

            if (data.success) {
                loadNotifications();
            }
        } catch (err) {
            console.error('Lỗi mark single read:', err);
        }
    }

    // ===================================================================
    // 4. RENDER UI
    // ===================================================================

    function render() {
        if (!notiList) return;

        const filtered = currentFilter === 'all'
            ? notifications
            : notifications.filter(n => n.type === currentFilter);

        if (filtered.length === 0) {
            notiList.innerHTML = '<li class="noti-empty"><i class="fas fa-bell-slash"></i> Không có thông báo nào</li>';
            return;
        }

        notiList.innerHTML = '';

        filtered.forEach((notif, idx) => {
            const li = document.createElement('li');
            li.className = `noti-item ${notif.is_read ? '' : 'unread'}`;
            li.style.animationDelay = `${idx * 0.05}s`;

            li.innerHTML = `
                <div class="noti-content">
                    <div class="noti-icon">
                        ${getIconByType(notif.type)}
                    </div>
                    <div class="noti-text">
                        <strong>${escapeHtml(notif.title)}</strong>
                        <div class="noti-message">${escapeHtml(notif.message || '')}</div>
                        <div class="noti-time">${formatTime(notif.created_at)}</div>
                    </div>
                </div>
                <div class="noti-actions">
                    ${notif.is_read
                        ? '<span class="read-label"><i class="fas fa-check-circle"></i> Đã đọc</span>'
                        : `<button class="btn btn-mark" data-id="${notif.notification_id}">
                                <i class="fas fa-check"></i>
                           </button>`
                    }
                </div>
            `;

            // Animation khi đánh dấu đã đọc
            if (!notif.is_read) {
                li.querySelector('.btn-mark')?.addEventListener('click', () => {
                    li.style.transition = 'all 0.35s ease';
                    li.style.opacity = '0.6';
                    li.style.transform = 'translateX(-12px)';
                });
            }

            notiList.appendChild(li);
        });
    }

    // ===================================================================
    // 5. Helper functions
    // ===================================================================

    function getIconByType(type) {
        const icons = {
            task: '<i class="fas fa-tasks"></i>',
            event: '<i class="fas fa-calendar-alt"></i>',
            message: '<i class="fas fa-envelope"></i>',
            system: '<i class="fas fa-cog"></i>'
        };
        return icons[type] || '<i class="fas fa-bell"></i>';
    }

    function formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cập nhật badge ở header (nếu tồn tại)
    function updateGlobalBadge() {
        const unreadCount = notifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('notif-badge') || document.querySelector('.notif-badge');

        if (badge) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    // ===================================================================
    // 6. Real-time (tùy chọn - nếu dùng WebSocket)
    // ===================================================================
    // Nếu bạn dùng Socket.io sau này, chỉ cần:
    // socket.on('new-notification', () => loadNotifications());

    // ===================================================================
    // 7. Push Notification (Service Worker - nếu cần)
    // ===================================================================
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
            // Có thể subscribe push ở đây nếu muốn
        });
    }
});

// ===================================================================
// NOTES CHO DEVELOPER & BACKEND TEAM
// ===================================================================
/*
  1. API ENDPOINTS BẮT BUỘC PHẢI CÓ (ở backend):
     • GET    /api/notifications           → { success: true, notifications: [...] }
     • PATCH  /api/notifications/mark-all  → { success: true }
     • PATCH  /api/notifications/:id/mark  → { success: true }

     Khuyến khích thêm:
     • GET    /api/notifications/unread-count → { success: true, count: 12 }
     • GET    /api/notifications?page=1&limit=20&type=task  (phân trang + filter)

  2. CẤU TRÚC RESPONSE MONG ĐỢI (notifications array):
     {
       notification_id: 123,
       title: "Deadline sắp tới",
       message: "Công việc 'Thiết kế UI' còn 2 giờ nữa hết hạn",
       type: "task" | "event" | "message" | "system",
       is_read: false,
       created_at: "2025-11-23T10:30:00.000Z",
       // Tùy chọn:
       related_id: 456,        // task_id / event_id / message_id
       related_type: "task"    // để click vào thì nhảy đúng trang
     }

  3. REAL-TIME (nếu dùng Socket.io):
     - Server emit: 'new-notification' → { notification: { ... } }
     - Server emit: 'notification-read' → { notification_id: 123 }
     → Frontend chỉ cần:
       socket.on('new-notification', (data) => {
         notifications.unshift(data.notification);
         render();
         updateGlobalBadge();
       });

  4. CLICK VÀO THÔNG BÁO → NHẢY ĐÚNG TRANG:
     - Thêm onclick vào .noti-content:
       li.querySelector('.noti-content').addEventListener('click', () => {
         navigateToRelated(notif);
       });

     function navigateToRelated(notif) {
       if (notif.related_type === 'task') {
         window.location.href = `/tasks#task-${notif.related_id}`;
       } else if (notif.related_type === 'event') {
         window.location.href = `/calendar?date=${notif.extra?.date}`;
       }
       // ... các case khác
       // Sau khi nhảy thì tự động mark as read (nếu chưa đọc)
       if (!notif.is_read) markAsRead(notif.notification_id);
     }

  5. PUSH NOTIFICATION (Web Push):
     - Đã có sẵn đoạn kiểm tra serviceWorker
     - Khi cần bật: gọi registerPushSubscription() trong file riêng
     - Backend lưu subscription vào bảng push_subscriptions

  6. CẢI THIỆN UX NHỎ (tùy chọn):
     - Thêm loading skeleton khi đang fetch
     - Infinite scroll / pagination
     - Delete notification (nếu muốn)
     - Sound khi có thông báo mới (nếu user bật)

  7. SECURITY:
     - Luôn escape HTML (đã làm tốt rồi)
     - Backend phải validate user_id == req.user.id trước khi trả notifications
*/