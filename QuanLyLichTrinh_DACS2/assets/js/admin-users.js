// ===================================
// ADMIN USERS JAVASCRIPT
// ===================================

console.log('👥 Admin users loaded!');

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
// USERS MANAGEMENT FUNCTIONS
// ===================================

function initUsersPage() {
  console.log('👥 Initializing users page...');
  loadUsers();
  
  // Search with debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
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

async function loadUsers(page = 1) {
  try {
    const search = document.getElementById('search-input')?.value || ''; 
    const role = document.getElementById('role-filter')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    
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
  
  const currentUserId = window.currentUserId;
  
  tbody.innerHTML = users.map(user => {
    const isRootAdmin = user.email === 'vuth.24it@vku.udn.vn';
    
    return `
    <tr>
      <td>${user.user_id}</td>
      <td><strong>${escapeHtml(user.username)}</strong></td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.full_name || '-')}</td>
      <td><span class="badge ${user.role}">${user.role}${isRootAdmin ? ' <i class="fas fa-shield-alt" title="Root Admin"></i>' : ''}</span></td>
      <td><span class="badge ${user.is_active ? 'active' : 'banned'}">${user.is_active ? 'Hoạt động' : 'Đã khóa'}</span></td>
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
          ${!isRootAdmin && user.is_active ? `
            <button class="action-btn" onclick="confirmBanUser(${user.user_id}, '${escapeHtml(user.username)}')" title="Khóa tài khoản">
              <i class="fas fa-ban"></i>
            </button>
          ` : !isRootAdmin && !user.is_active ? `
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
            <p><strong>Trạng thái:</strong> <span class="badge ${user.is_active ? 'active' : 'banned'}">${user.is_active ? 'Hoạt động' : 'Đã khóa'}</span></p>
            ${user.banned_reason ? `<p><strong>Lý do khóa:</strong> ${escapeHtml(user.banned_reason)}</p>` : ''}
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

// ===================================
// USER ACTIONS (Grant/Revoke/Ban/Delete)
// ===================================

function confirmGrantAdmin(userId, username) {
  showActionModal(
    'Cấp quyền Admin',
    `Bạn có chắc muốn cấp quyền admin cho <strong>${username}</strong>?`,
    async () => {
      try {
        const res = await fetch(`/admin/api/users/${userId}/grant-admin`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          showToast(data.message, 'success');
          loadUsers(currentPage);
          closeActionModal();
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
          closeActionModal();
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
          closeActionModal();
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

// Khai báo toàn cục cho các hàm cần gọi từ HTML (on... events)
window.initUsersPage = initUsersPage;
window.loadUsers = loadUsers;
window.viewUserDetail = viewUserDetail;
window.closeUserModal = closeUserModal; 
window.confirmGrantAdmin = confirmGrantAdmin;
window.confirmRevokeAdmin = confirmRevokeAdmin;
window.confirmBanUser = confirmBanUser;
window.confirmUnbanUser = confirmUnbanUser;
window.confirmDeleteUser = confirmDeleteUser;