// assets/js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
    const notiList = document.getElementById('noti-list');
    const markAllBtn = document.getElementById('mark-read');
    const badge = document.getElementById('notif-badge') || document.querySelector('.notif-badge');

    let notifications = [];           // dữ liệu từ API
    let currentFilter = 'all';        // all | task | event | message | system
    let refreshInterval;

    // ===================================================================
    // 1. Load notifications + badge khi vào trang
    // ===================================================================
    loadNotifications();

    // ===================================================================
    // 2. Thiết lập auto-refresh thông minh
    // ===================================================================
    refreshInterval = setInterval(() => {
        // Chỉ load khi tab đang hiển thị
        if (!document.hidden) loadNotifications(true);
    }, 20000); // refresh mỗi 20 giây

    // ===================================================================
    // 3. Event Listeners
    // ===================================================================

    // Mark all as read
    markAllBtn?.addEventListener('click', markAllAsRead);

    // Event delegation: đánh dấu từng thông báo đã đọc
    notiList?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-mark');
        if (!btn) return;

        const notifId = btn.dataset.id;
        await markAsRead(notifId);
    });

    // CLICK VÀO NỘI DUNG THÔNG BÁO → NHẢY ĐÚNG TRANG
    notiList?.addEventListener('click', async e => {
        const item = e.target.closest('.noti-item');
        if (!item) return;

        const notifId = item.dataset.id;
        const notif = notifications.find(n => n.notification_id == notifId);
        if (!notif) return;

        if (!notif.is_read) {
            await markAsRead(notifId);
        }

        if (notif.redirect_url) {
            window.location.href = notif.redirect_url;
        } else if (notif.related_id) {
            if (notif.type === 'task' || notif.type === 'sprint') {
                window.location.href = `/tasks#task-${notif.related_id}`;
            } else if (notif.type === 'event') {
                window.location.href = `/calendar?highlight=${notif.related_id}`;
            } else if (notif.type === 'kanban') {
                window.location.href = `/kanban`;
            } else {
                window.location.href = `/timeline`;
            }
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type || 'all';
            render();
        });
    });

    // ===================================================================
    // 4. API CALLS
    // ===================================================================

    /** Lấy danh sách thông báo */
    async function loadNotifications(isRefresh = false) {
        try {
            const res = await fetch('/api/notifications', { method: 'GET' });
            const data = await res.json();

            if (data.success) {
                // Nếu là refresh, chỉ cập nhật các thay đổi
                if (isRefresh) {
                    const oldIds = new Set(notifications.map(n => n.notification_id));
                    notifications = data.notifications;
                    const hasNew = notifications.some(n => !oldIds.has(n.notification_id));
                    if (hasNew) render();
                } else {
                    notifications = data.notifications || [];
                    render();
                }
                updateGlobalBadge(data.unreadCount || 0);
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
            const res = await fetch('/api/notifications/read-all', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                notifications.forEach(n => n.is_read = true);
                render();
                updateGlobalBadge(0);
            }
        } catch (err) {
            console.error('Lỗi mark all read:', err);
        }
    }

    /** Đánh dấu một thông báo đã đọc */
    async function markAsRead(notifId) {
        try {
            const res = await fetch(`/api/notifications/${notifId}/read`, { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                const notif = notifications.find(n => n.notification_id == notifId);
                if (notif) notif.is_read = true;
                render();
                updateGlobalBadge();
            }
        } catch (err) {
            console.error('Lỗi mark single read:', err);
        }
    }

    // ===================================================================
    // 5. RENDER UI
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

        // Tối ưu: render innerHTML 1 lần, animation delay vẫn giữ
        notiList.innerHTML = filtered.map((notif, idx) => `
            <li class="noti-item ${notif.is_read ? '' : 'unread'}" style="animation-delay: ${idx*0.05}s">
                <div class="noti-content">
                    <div class="noti-icon">${getIconByType(notif.type)}</div>
                    <div class="noti-text">
                        <strong>${escapeHtml(notif.title)}</strong>
                        <div class="noti-message">${escapeHtml(notif.message || '')}</div>
                        <div class="noti-time">${formatTime(notif.created_at)}</div>
                    </div>
                </div>
                <div class="noti-actions">
                    ${notif.is_read ? 
                        '<span class="read-label"><i class="fas fa-check-circle"></i> Đã đọc</span>' :
                        `<button class="btn btn-mark" data-id="${notif.notification_id}"><i class="fas fa-check"></i></button>`
                    }
                </div>
            </li>
        `).join('');
    }

    // ===================================================================
    // 6. Helper functions
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

    function updateGlobalBadge(unreadCount) {
        if (badge) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    // ===================================================================
    // 7. Real-time / Push notification placeholders
    // ===================================================================
    // Nếu dùng Socket.io: socket.on('new-notification', () => loadNotifications());
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
            // Có thể subscribe push ở đây
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