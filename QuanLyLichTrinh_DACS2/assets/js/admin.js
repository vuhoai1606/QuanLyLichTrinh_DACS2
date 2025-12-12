// ===================================
// ADMIN PANEL JAVASCRIPT
// ===================================

console.log('👑 Admin panel loaded!');

// Global state
let currentPage = 1;
let currentFilters = {};
let userActivityChart = null;
let userStatusChart = null;

// ===================================
// DASHBOARD FUNCTIONS
// ===================================

function initDashboard(activityData, overviewData) {
  console.log('📊 Initializing dashboard...');
  console.log('Activity data:', activityData);
  console.log('Overview data:', overviewData);
  
  // Init Activity Chart (Line Chart)
  const activityCtx = document.getElementById('userActivityChart');
  if (activityCtx && activityData && activityData.length > 0) {
    const labels = activityData.map(d => new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
    const data = activityData.map(d => parseInt(d.new_users));
    
    userActivityChart = new Chart(activityCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Người dùng mới',
          data: data,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
  
  // Init Status Chart (Doughnut Chart)
  const statusCtx = document.getElementById('userStatusChart');
  if (statusCtx && overviewData) {
    userStatusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Hoạt động', 'Đã khóa'],
        datasets: [{
          data: [overviewData.active_users || 0, overviewData.banned_users || 0],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

async function refreshDashboard() {
  console.log('🔄 Refreshing dashboard...');
  try {
    const res = await fetch('/admin/api/dashboard');
    const data = await res.json();
    
    if (data.success) {
      // Update stats
      document.getElementById('total-users').textContent = data.data.overview.total_users || 0;
      document.getElementById('active-users').textContent = data.data.overview.active_users || 0;
      document.getElementById('new-users').textContent = data.data.overview.new_users_last_7_days || 0;
      document.getElementById('total-admins').textContent = data.data.overview.total_admins || 0;
      document.getElementById('banned-users').textContent = data.data.overview.banned_users || 0;
      document.getElementById('total-tasks').textContent = data.data.overview.total_tasks || 0;
      document.getElementById('total-events').textContent = data.data.overview.total_events || 0;
      document.getElementById('total-messages').textContent = data.data.overview.total_messages || 0;
      
      // Update charts
      if (userActivityChart) {
        const labels = data.data.activityStats.map(d => new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
        const chartData = data.data.activityStats.map(d => parseInt(d.new_users));
        userActivityChart.data.labels = labels;
        userActivityChart.data.datasets[0].data = chartData;
        userActivityChart.update();
      }
      
      if (userStatusChart) {
        userStatusChart.data.datasets[0].data = [data.data.overview.active_users, data.data.overview.banned_users];
        userStatusChart.update();
      }
    }
  } catch (error) {
    console.error('❌ Error refreshing dashboard:', error);
    showToast('Lỗi tải dữ liệu', 'error');
  }
}

async function updateChart(days) {
  try {
    const res = await fetch(`/admin/api/stats/activity?days=${days}`);
    const data = await res.json();
    
    if (data.success && userActivityChart) {
      const labels = data.stats.map(d => new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
      const chartData = data.stats.map(d => parseInt(d.new_users));
      userActivityChart.data.labels = labels;
      userActivityChart.data.datasets[0].data = chartData;
      userActivityChart.update();
    }
  } catch (error) {
    console.error('❌ Error updating chart:', error);
  }
}

// ===================================
// USERS MANAGEMENT
// ===================================

function initUsersPage() {
  console.log('👥 Initializing users page...');
  loadUsers();
  
  // ✅ SOCKET.IO - Realtime updates
  initSocketIO();
  
  // Search with debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = e.target.value;
        currentPage = 1;
        loadUsers();
      }, 500);
    });
  }
  
  // Tự động tải lại khi chọn role
  const roleFilter = document.getElementById('role-filter');
  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      currentPage = 1;
      loadUsers();
    });
  }

  // Tự động tải lại khi chọn status
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentPage = 1;
      loadUsers();
    });
  }
}

// ✅ SOCKET.IO - Initialize realtime connection
function initSocketIO() {
  const socket = io();
  
  socket.on('connect', () => {
    console.log('🔌 Socket.IO connected:', socket.id);
  });
  
  // Event: User mới đăng ký
  socket.on('new-user-registered', (data) => {
    console.log('📢 New user registered:', data);
    showToast(`✨ User mới: ${data.username} (${data.email})`, 'info');
    
    // Reload users list
    loadUsers(currentPage);
  });
  
  // Event: User được cấp quyền admin (legacy)
  socket.on('user-promoted', (data) => {
    console.log('📢 User promoted:', data);
    showToast(`🔑 ${data.username} đã được cấp quyền admin`, 'success');
    
    // Reload page để apply quyền mới
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });
  
  // ✅ NEW EVENTS - Auto reload user list
  socket.on('role-changed', (data) => {
    console.log('📢 Role changed:', data);
    showToast(`🔄 ${data.username} đã được thay đổi quyền thành ${data.newRole}`, 'info');
    loadUsers(currentPage); // Auto reload table
  });
  
  socket.on('user-banned', (data) => {
    console.log('📢 User banned:', data);
    showToast(`🚫 ${data.username} đã bị khóa tài khoản`, 'warning');
    loadUsers(currentPage); // Auto reload table
  });
  
  socket.on('account-deleted', (data) => {
    console.log('📢 Account deleted:', data);
    showToast(`🗑️ ${data.username} đã bị xóa tài khoản`, 'error');
    loadUsers(currentPage); // Auto reload table
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Socket.IO disconnected');
  });
}

async function loadUsers(page = 1) {
  try {
    // Lấy giá trị trực tiếp từ DOM thay vì currentFilters (đã cập nhật khi load)
    const search = document.getElementById('search-input')?.value || ''; 
    const role = document.getElementById('role-filter')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    
    // Cập nhật currentFilters cho mục đích hiển thị (nếu cần) và cho loadUsers.
    currentFilters.search = search;
    currentFilters.role = role;
    currentFilters.status = status;

    const params = new URLSearchParams({
      page,
      limit: 20,
      search,
      role,
      status
    });
    
    const res = await fetch(`/admin/api/users?${params}`);
    const data = await res.json();
    
    if (data.success) {
      renderUsersTable(data.users);
      renderPagination(data.pagination, loadUsers);
      currentPage = page;
    }
  } catch (error) {
    console.error('❌ Error loading users:', error);
    showToast('Lỗi tải danh sách người dùng', 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">Không tìm thấy người dùng nào</td></tr>';
    return;
  }
  
  // Lấy currentUserId từ window (sẽ set từ EJS)
  const currentUserId = window.currentUserId;
  
  tbody.innerHTML = users.map(user => {
    // Check nếu là root admin (email vuth.24it@vku.udn.vn)
    const isRootAdmin = user.email === 'vuth.24it@vku.udn.vn';
    const isCurrentUser = user.user_id === currentUserId;
    
    return `
    <tr>
      <td>${user.user_id}</td>
      <td><strong>${escapeHtml(user.username)}</strong></td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.full_name || '-')}</td>
      <td><span class="badge ${user.role}">${user.role}${isRootAdmin ? ' <i class="fas fa-shield-alt" title="Root Admin"></i>' : ''}</span></td>
      <td><span class="badge ${!user.is_banned ? 'active' : 'banned'}">${!user.is_banned ? 'Hoạt động' : 'Đã khóa'}</span></td>
      <td>${formatDate(user.created_at)}</td>
      <td>${user.last_login_at ? formatDate(user.last_login_at) : 'Chưa đăng nhập'}</td>
      <td>
        <div class="action-btn-group">
          <button class="action-btn" onclick="viewUserDetail(${user.user_id})" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          ${!isRootAdmin && user.role === 'user' ? `
            <button class="action-btn" onclick="confirmGrantAdmin(${user.user_id}, '${escapeHtml(user.username)}')" title="Cấp quyền admin">
              <i class="fas fa-crown"></i>
            </button>
          ` : !isRootAdmin && user.role === 'admin' ? `
            <button class="action-btn" onclick="confirmRevokeAdmin(${user.user_id}, '${escapeHtml(user.username)}')" title="Thu hồi admin">
              <i class="fas fa-user-minus"></i>
            </button>
          ` : ''}
          ${!isRootAdmin && !user.is_banned ? `
            <button class="action-btn" onclick="confirmBanUser(${user.user_id}, '${escapeHtml(user.username)}')" title="Khóa tài khoản">
              <i class="fas fa-ban"></i>
            </button>
          ` : !isRootAdmin && user.is_banned ? `
            <button class="action-btn" onclick="confirmUnbanUser(${user.user_id}, '${escapeHtml(user.username)}')" title="Mở khóa">
              <i class="fas fa-unlock"></i>
            </button>
          ` : ''}
          ${!isRootAdmin ? `
            <button class="action-btn" onclick="confirmDeleteUser(${user.user_id}, '${escapeHtml(user.username)}')" title="Xóa người dùng">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

async function viewUserDetail(userId) {
  try {
    const res = await fetch(`/admin/api/users/${userId}`);
    const data = await res.json();
    
    if (data.success) {
      const user = data.user;
      const content = `
        <div class="user-detail-grid">
          <div class="detail-section">
            <h3>Thông tin cơ bản</h3>
            <p><strong>ID:</strong> ${user.user_id}</p>
            <p><strong>Username:</strong> ${escapeHtml(user.username)}</p>
            <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
            <p><strong>Họ tên:</strong> ${escapeHtml(user.full_name || '-')}</p>
            <p><strong>Role:</strong> <span class="badge ${user.role}">${user.role}</span></p>
            <p><strong>Trạng thái:</strong> <span class="badge ${!user.is_banned ? 'active' : 'banned'}">${!user.is_banned ? 'Hoạt động' : 'Đã khóa'}</span></p>
            ${user.ban_reason ? `<p><strong>Lý do khóa:</strong> ${escapeHtml(user.ban_reason)}</p>` : ''}
          </div>
          
          <div class="detail-section">
            <h3>Thống kê hoạt động</h3>
            <p><strong>Tổng Tasks:</strong> ${user.total_tasks || 0}</p>
            <p><strong>Tổng Events:</strong> ${user.total_events || 0}</p>
            <p><strong>Tổng Messages:</strong> ${user.total_messages_sent || 0}</p>
            <p><strong>Lần đăng nhập cuối:</strong> ${user.last_login_at ? formatDate(user.last_login_at) : 'Chưa đăng nhập'}</p>
          </div>
          
          <div class="detail-section">
            <h3>Thông tin khác</h3>
            <p><strong>Ngày tạo:</strong> ${formatDate(user.created_at)}</p>
            <p><strong>Đăng nhập qua:</strong> ${user.login_provider || 'local'}</p>
            ${user.google_id ? `<p><strong>Google ID:</strong> ${user.google_id}</p>` : ''}
          </div>
        </div>
      `;
      
      document.getElementById('user-detail-content').innerHTML = content;
      document.getElementById('user-modal').classList.add('active');
    }
  } catch (error) {
    console.error('❌ Error loading user detail:', error);
    showToast('Lỗi tải thông tin người dùng', 'error');
  }
}

function closeUserModal() {
  document.getElementById('user-modal').classList.remove('active');
}

// function applyFilters() { // Hàm này không còn cần thiết
//   currentPage = 1;
//   loadUsers();
// }

// ===================================
// USER ACTIONS (Grant/Revoke/Ban/Delete)
// ===================================

function confirmGrantAdmin(userId, username) {
  showActionModal(
    'Cấp quyền Admin',
    `Bạn có chắc muốn cấp quyền admin cho <strong>${username}</strong>?<br><small style="color: #dc2626;">⚠️ Sau khi cấp quyền, trang sẽ tự động reload.</small>`,
    async () => {
      try {
        const res = await fetch(`/admin/api/users/${userId}/promote`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (data.success) {
          showToast(data.message, 'success');
          
          // ✅ Reload page sau 1.5s để apply quyền mới
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showToast(data.message, 'error');
        }
      } catch (error) {
        console.error('❌ Error granting admin:', error);
        showToast('Lỗi cấp quyền admin', 'error');
      }
    }
  );
}

function confirmRevokeAdmin(userId, username) {
  showActionModal(
    'Thu hồi quyền Admin',
    `Bạn có chắc muốn thu hồi quyền admin từ <strong>${username}</strong>?`,
    async () => {
      try {
        const res = await fetch(`/admin/api/users/${userId}/revoke-admin`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          showToast(data.message, 'success');
          loadUsers(currentPage);
        } else {
          showToast(data.message, 'error');
        }
      } catch (error) {
        console.error('❌ Error revoking admin:', error);
        showToast('Lỗi thu hồi quyền admin', 'error');
      }
    }
  );
}

function confirmBanUser(userId, username) {
  showActionModal(
    'Khóa tài khoản',
    `Bạn có chắc muốn khóa tài khoản <strong>${username}</strong>?`,
    async () => {
      const reason = document.getElementById('action-reason').value.trim();
      if (!reason) {
        showToast('Vui lòng nhập lý do khóa', 'error');
        return;
      }
      
      try {
        const res = await fetch(`/admin/api/users/${userId}/ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        });
        const data = await res.json();
        
        if (data.success) {
          showToast(data.message, 'success');
          closeActionModal();
          loadUsers(currentPage);
        } else {
          showToast(data.message, 'error');
        }
      } catch (error) {
        console.error('❌ Error banning user:', error);
        showToast('Lỗi khóa tài khoản', 'error');
      }
    },
    true // requireReason
  );
}

function confirmUnbanUser(userId, username) {
  showActionModal(
    'Mở khóa tài khoản',
    `Bạn có chắc muốn mở khóa tài khoản <strong>${username}</strong>?`,
    async () => {
      try {
        const res = await fetch(`/admin/api/users/${userId}/unban`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          showToast(data.message, 'success');
          loadUsers(currentPage);
        } else {
          showToast(data.message, 'error');
        }
      } catch (error) {
        console.error('❌ Error unbanning user:', error);
        showToast('Lỗi mở khóa tài khoản', 'error');
      }
    }
  );
}

function confirmDeleteUser(userId, username) {
  showActionModal(
    'Xóa người dùng',
    `<strong style="color: #ef4444;">CẢNH BÁO:</strong> Bạn có chắc muốn xóa vĩnh viễn tài khoản <strong>${username}</strong>?<br>Hành động này không thể hoàn tác!`,
    async () => {
      const reason = document.getElementById('action-reason').value.trim();
      if (!reason) {
        showToast('Vui lòng nhập lý do xóa', 'error');
        return;
      }
      
      try {
        const res = await fetch(`/admin/api/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        });
        const data = await res.json();
        
        if (data.success) {
          showToast(data.message, 'success');
          closeActionModal();
          loadUsers(currentPage);
        } else {
          showToast(data.message, 'error');
        }
      } catch (error) {
        console.error('❌ Error deleting user:', error);
        showToast('Lỗi xóa người dùng', 'error');
      }
    },
    true // requireReason
  );
}

// ===================================
// NOTIFICATIONS MANAGEMENT
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
        const res = await fetch(`/admin/api/notifications/${notificationId}`, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (data.success) {
          showToast('Đã xóa thông báo thành công', 'success');
          loadNotifications();
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

// ===================================
// AUDIT LOGS
// ===================================

let selectedLogIds = new Set();

function initLogsPage() {
  console.log('📜 Initializing logs page...');
  loadLogs();

  // Tự động tải lại khi chọn action type
  const actionFilter = document.getElementById('action-filter');
  if (actionFilter) {
    actionFilter.addEventListener('change', () => {
      selectedLogIds.clear();
      updateSelectedCount();
      loadLogs();
    });
  }

  // Select All checkbox
  const selectAllCheckbox = document.getElementById('select-all-logs');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.log-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        const logId = parseInt(cb.dataset.logId);
        if (e.target.checked) {
          selectedLogIds.add(logId);
        } else {
          selectedLogIds.delete(logId);
        }
      });
      updateSelectedCount();
    });
  }

  // Delete selected button
  const deleteBtn = document.getElementById('delete-selected-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', confirmDeleteSelectedLogs);
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
      <div class="log-checkbox-container">
        <input type="checkbox" class="log-checkbox" data-log-id="${log.log_id}" ${selectedLogIds.has(log.log_id) ? 'checked' : ''}>
      </div>
      <div class="log-content">
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
    </div>
  `).join('');

  // Add event listeners to checkboxes
  document.querySelectorAll('.log-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const logId = parseInt(e.target.dataset.logId);
      if (e.target.checked) {
        selectedLogIds.add(logId);
      } else {
        selectedLogIds.delete(logId);
      }
      updateSelectedCount();
    });
  });
}

function updateSelectedCount() {
  const count = selectedLogIds.size;
  const deleteBtn = document.getElementById('delete-selected-btn');
  const countSpan = document.getElementById('selected-count');
  
  if (countSpan) countSpan.textContent = count;
  if (deleteBtn) deleteBtn.style.display = count > 0 ? 'block' : 'none';
  
  // Update select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-logs');
  const allCheckboxes = document.querySelectorAll('.log-checkbox');
  if (selectAllCheckbox && allCheckboxes.length > 0) {
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    selectAllCheckbox.checked = allChecked;
  }
}

function confirmDeleteSelectedLogs() {
  if (selectedLogIds.size === 0) {
    showToast('Vui lòng chọn ít nhất 1 log để xóa', 'warning');
    return;
  }

  showActionModal(
    'Xóa logs đã chọn',
    `Bạn có chắc muốn xóa <strong>${selectedLogIds.size}</strong> log(s) đã chọn?<br>
    <span style="color: #ef4444;">Hành động này không thể hoàn tác!</span>`,
    deleteSelectedLogs
  );
}

async function deleteSelectedLogs() {
  try {
    const logIds = Array.from(selectedLogIds);
    const res = await fetch('/admin/api/logs/delete-multiple', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logIds })
    });

    const data = await res.json();

    if (data.success) {
      showToast(`Đã xóa ${data.deletedCount} log(s) thành công`, 'success');
      selectedLogIds.clear();
      updateSelectedCount();
      closeActionModal();
      loadLogs();
    } else {
      showToast(data.message || 'Lỗi xóa logs', 'error');
    }
  } catch (error) {
    console.error('❌ Error deleting logs:', error);
    showToast('Lỗi xóa logs', 'error');
  }
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

// ===================================
// HELPER FUNCTIONS
// ===================================

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
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close modals on outside click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});