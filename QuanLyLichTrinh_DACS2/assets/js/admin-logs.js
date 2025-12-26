// ===================================
// ADMIN LOGS JAVASCRIPT
// ===================================

console.log('📜 Admin logs loaded!');

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

// ===================================
// AUDIT LOGS FUNCTIONS
// ===================================

function initLogsPage() {
  console.log('📜 Initializing logs page...');
  loadLogs();

  // Tự động tải lại khi chọn action type
  const actionFilter = document.getElementById('action-filter');
  if (actionFilter) {
    actionFilter.addEventListener('change', () => {
      loadLogs();
    });
  }
}

async function loadLogs(page = 1) {
  try {
    // Lấy giá trị trực tiếp từ DOM
    const actionType = document.getElementById('action-filter')?.value || '';
    const params = new URLSearchParams({ page, limit: 50, actionType });
    
    const res = await fetch(`/admin/api/logs?${params}`);
    const data = await res.json();
    
    if (data.success) {
      renderLogs(data.logs);
      renderPagination(data.pagination, loadLogs);
    }
  } catch (error) {
    console.error('❌ Error loading logs:', error);
    showToast('Lỗi tải audit logs', 'error');
  }
}

function renderLogs(logs) {
  const container = document.getElementById('logs-timeline');
  if (!container) return;
  
  if (logs.length === 0) {
    container.innerHTML = '<div class="loading">Chưa có log nào</div>';
    return;
  }
  
  container.innerHTML = logs.map(log => `
    <div class="log-item">
      <div class="log-header">
        <span class="log-action"><i class="fas fa-shield-alt"></i> ${getActionLabel(log.action_type)}</span>
        <span class="log-time">${formatDate(log.created_at)}</span>
      </div>
      <div class="log-description">${escapeHtml(log.description)}</div>
      <div class="log-meta">
        <span><i class="fas fa-user"></i> Admin: <strong>${escapeHtml(log.admin_username)}</strong></span>
        ${log.target_username ? `<span><i class="fas fa-bullseye"></i> Target: <strong>${escapeHtml(log.target_username)}</strong></span>` : ''}
        ${log.ip_address ? `<span><i class="fas fa-network-wired"></i> IP: ${log.ip_address}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function getActionLabel(actionType) {
  const labels = {
    'grant_admin': 'Cấp quyền Admin',
    'revoke_admin': 'Thu hồi Admin',
    'ban_user': 'Khóa tài khoản',
    'unban_user': 'Mở khóa tài khoản',
    'delete_user': 'Xóa người dùng',
    'create_notification': 'Tạo thông báo',
    'delete_notification': 'Xóa thông báo'
  };
  return labels[actionType] || actionType;
}

// Khai báo toàn cục cho các hàm cần gọi từ HTML (on... events)
window.initLogsPage = initLogsPage;
window.loadLogs = loadLogs;