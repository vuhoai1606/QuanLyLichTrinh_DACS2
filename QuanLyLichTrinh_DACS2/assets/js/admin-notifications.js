// ===================================
// ADMIN NOTIFICATIONS JAVASCRIPT
// ===================================

console.log('📢 Admin notifications loaded!');

let currentPage = 1;

// ===================================
// HELPER FUNCTIONS (Được lặp lại trong mỗi file)
// ===================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 20px;
    max-width: 320px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    animation: slideInRight 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showActionModal(title, message, onConfirm, requireReason = false) {
  document.getElementById('action-modal-title').textContent = title;
  document.getElementById('action-modal-message').innerHTML = message;
  
  const reasonInput = document.getElementById('action-reason');
  if (requireReason) {
    reasonInput.style.display = 'block';
    reasonInput.value = '';
  } else {
    reasonInput.style.display = 'none';
  }
  
  const confirmBtn = document.getElementById('action-confirm-btn');
  confirmBtn.onclick = onConfirm;
  
  document.getElementById('action-modal').classList.add('active');
}

function closeActionModal() {
  document.getElementById('action-modal').classList.remove('active');
}

function renderPagination(pagination, loadFunction) {
  const container = document.getElementById('pagination');
  if (!container) return;
  
  const { page, totalPages } = pagination;
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Previous button
  html += `<button ${page === 1 ? 'disabled' : ''} onclick="${loadFunction.name}(${page - 1})">
    <i class="fas fa-chevron-left"></i>
  </button>`;
  
  // Page numbers
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    html += `<button class="${i === page ? 'active' : ''}" onclick="${loadFunction.name}(${i})">${i}</button>`;
  }
  
  if (totalPages > 5) {
    html += '<button disabled>...</button>';
    html += `<button onclick="${loadFunction.name}(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  html += `<button ${page === totalPages ? 'disabled' : ''} onclick="${loadFunction.name}(${page + 1})">
    <i class="fas fa-chevron-right"></i>
  </button>`;
  
  container.innerHTML = html;
}

// Close modals on outside click (cần thiết cho trang này)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// ===================================
// NOTIFICATIONS MANAGEMENT FUNCTIONS
// ===================================

function initNotificationsPage() {
  console.log('📢 Initializing notifications page...');
  loadNotifications();
  
  const form = document.getElementById('notification-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await createNotification();
    });
  }
}

async function loadNotifications(page = 1) {
  try {
    const params = new URLSearchParams({ page, limit: 20 });
    const res = await fetch(`/admin/api/notifications?${params}`);
    const data = await res.json();
    
    if (data.success) {
      renderNotifications(data.notifications);
      renderPagination(data.pagination, loadNotifications);
    }
  } catch (error) {
    console.error('❌ Error loading notifications:', error);
    showToast('Lỗi tải danh sách thông báo', 'error');
  }
}

function renderNotifications(notifications) {
  const container = document.getElementById('notifications-list');
  if (!container) return;
  
  if (notifications.length === 0) {
    container.innerHTML = '<div class="loading">Chưa có thông báo nào</div>';
    return;
  }
  
  container.innerHTML = notifications.map(notif => `
    <div class="notification-item">
      <div class="notification-header">
        <div>
          <h3 class="notification-title">${escapeHtml(notif.title)}</h3>
          <p class="notification-meta">
            <span class="badge ${notif.notification_type}">${notif.notification_type}</span>
            Tạo bởi: <strong>${escapeHtml(notif.creator_username)}</strong> • 
            ${formatDate(notif.created_at)}
          </p>
        </div>
        <div>
          <span class="badge ${notif.is_active ? 'active' : 'banned'}">${notif.is_active ? 'Đang hiển thị' : 'Đã ẩn'}</span>
        </div>
      </div>
      <div class="notification-content">${escapeHtml(notif.content)}</div>
      <div class="notification-actions">
        ${notif.is_active ? `
          <button class="action-btn" onclick="confirmDeleteNotification(${notif.notification_id})">
            <i class="fas fa-trash"></i> Xóa
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function showCreateNotificationModal() {
  document.getElementById('notification-modal').classList.add('active');
}

function closeNotificationModal() {
  document.getElementById('notification-modal').classList.remove('active');
  document.getElementById('notification-form').reset();
}

async function createNotification() {
  const title = document.getElementById('notif-title').value.trim();
  const content = document.getElementById('notif-content').value.trim();
  const type = document.getElementById('notif-type').value;
  const target = document.getElementById('notif-target').value;
  const startDate = document.getElementById('notif-start').value;
  const endDate = document.getElementById('notif-end').value;
  
  if (!title || !content) {
    showToast('Vui lòng điền đầy đủ thông tin', 'error');
    return;
  }
  
  try {
    const res = await fetch('/admin/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        type,
        targetUsers: target,
        startDate: startDate || null,
        endDate: endDate || null
      })
    });
    const data = await res.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      closeNotificationModal();
      loadNotifications();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    showToast('Lỗi tạo thông báo', 'error');
  }
}

function confirmDeleteNotification(notificationId) {
  showActionModal(
    'Xóa thông báo',
    'Bạn có chắc muốn xóa thông báo này?',
    async () => {
      try {
        const res = await fetch(`/admin/api/notifications/${notificationId}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
          showToast(data.message, 'success');
          loadNotifications();
          closeActionModal();
        } else {
          showToast(data.message, 'error');
        }
      } catch (error) {
        console.error('❌ Error deleting notification:', error);
        showToast('Lỗi xóa thông báo', 'error');
      }
    }
  );
}

// Khai báo toàn cục cho các hàm cần gọi từ HTML (on... events)
window.initNotificationsPage = initNotificationsPage;
window.loadNotifications = loadNotifications;
window.showCreateNotificationModal = showCreateNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.confirmDeleteNotification = confirmDeleteNotification;
window.closeActionModal = closeActionModal; // Cần thiết cho modal hành động