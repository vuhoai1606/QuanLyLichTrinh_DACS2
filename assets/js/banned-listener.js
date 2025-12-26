// ✅ ACCOUNT STATUS LISTENER - Auto logout/reload khi admin thay đổi quyền
(function() {
  'use strict';

  // Chỉ chạy khi user đã đăng nhập VÀ KHÔNG PHẢI trang login/register
  const isLoginPage = window.location.pathname.includes('/login');
  const isRegisterPage = window.location.pathname.includes('/register');
  
  if (isLoginPage || isRegisterPage) {
    return; // Skip on login/register pages
  }

  console.log('🔌 [ACCOUNT-LISTENER] Initializing Socket.IO connection...');

  // Connect to Socket.IO
  const socket = io();

  socket.on('connect', () => {
    console.log('✅ [ACCOUNT-LISTENER] Socket.IO connected:', socket.id);
  });

  // ✅ EVENT: User bị ban → Logout NGAY LẬP TỨC (Cả admin và user routes)
  socket.on('user-banned', async (data) => {
    console.log('🔴 [ACCOUNT-LISTENER] Received user-banned event:', data);

    // Kiểm tra có phải user hiện tại không
    const currentUserId = window.currentUserId || sessionStorage.getItem('userId');
    
    if (!currentUserId || parseInt(currentUserId) !== parseInt(data.userId)) {
      console.log('⚠️ [ACCOUNT-LISTENER] Not current user, ignoring');
      return;
    }

    console.log('🔴 [ACCOUNT-LISTENER] Current user banned! Auto-logout...');

    // Hiển thị toast
    if (typeof showToast === 'function') {
      showToast(`🔴 Tài khoản đã bị khóa. Lý do: ${data.banReason}`, 'error', 3000);
    }

    // Đợi 1s rồi logout
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Gọi API logout
      console.log('🔴 [ACCOUNT-LISTENER] Calling /api/auth/logout...');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      // Redirect về login với query params
      window.location.href = `/login?banned=true&reason=${encodeURIComponent(data.banReason)}&username=${encodeURIComponent(data.username)}`;
    } catch (error) {
      console.error('🔴 [ACCOUNT-LISTENER] Logout error:', error);
      // Force redirect anyway
      window.location.href = `/login?banned=true&reason=${encodeURIComponent(data.banReason)}&username=${encodeURIComponent(data.username)}`;
    }
  });

  // ✅ EVENT: User bị xóa tài khoản → Logout NGAY LẬP TỨC
  socket.on('account-deleted', async (data) => {
    console.log('🗑️ [ACCOUNT-LISTENER] Received account-deleted event:', data);

    // Kiểm tra có phải user hiện tại không
    const currentUserId = window.currentUserId || sessionStorage.getItem('userId');
    
    if (!currentUserId || parseInt(currentUserId) !== parseInt(data.userId)) {
      console.log('⚠️ [ACCOUNT-LISTENER] Not current user, ignoring');
      return;
    }

    console.log('🗑️ [ACCOUNT-LISTENER] Current account deleted! Auto-logout...');

    // Hiển thị toast
    if (typeof showToast === 'function') {
      showToast(`🗑️ Tài khoản đã bị xóa. Lý do: ${data.reason}`, 'error', 3000);
    }

    // Đợi 1s rồi logout
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Gọi API logout
      console.log('🗑️ [ACCOUNT-LISTENER] Calling /api/auth/logout...');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      // Redirect về login
      window.location.href = `/login?deleted=true&reason=${encodeURIComponent(data.reason)}&username=${encodeURIComponent(data.username)}`;
    } catch (error) {
      console.error('🗑️ [ACCOUNT-LISTENER] Logout error:', error);
      // Force redirect anyway
      window.location.href = `/login?deleted=true&reason=${encodeURIComponent(data.reason)}&username=${encodeURIComponent(data.username)}`;
    }
  });

  // ✅ EVENT: User được đổi role (cấp/thu hồi admin) → Auto RELOAD trang
  socket.on('role-changed', async (data) => {
    console.log('🔑 [ACCOUNT-LISTENER] Received role-changed event:', data);

    // Kiểm tra có phải user hiện tại không
    const currentUserId = window.currentUserId || sessionStorage.getItem('userId');
    
    if (!currentUserId || parseInt(currentUserId) !== parseInt(data.userId)) {
      console.log('⚠️ [ACCOUNT-LISTENER] Not current user, ignoring');
      return;
    }

    console.log(`🔑 [ACCOUNT-LISTENER] Current user role changed: ${data.oldRole} → ${data.newRole}`);

    // Hiển thị thông báo
    const message = data.newRole === 'admin' 
      ? '🎉 Bạn đã được cấp quyền Admin! Trang sẽ tự động reload...'
      : '⚠️ Quyền admin của bạn đã bị thu hồi. Trang sẽ tự động reload...';
    
    if (typeof showToast === 'function') {
      showToast(message, data.newRole === 'admin' ? 'success' : 'warning', 2000);
    } else {
      alert(message);
    }

    // Đợi 1.5s rồi reload trang
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('🔄 [ACCOUNT-LISTENER] Reloading page...');
    window.location.reload(true); // Force reload từ server, không dùng cache
  });

  socket.on('disconnect', () => {
    console.log('⚠️ [ACCOUNT-LISTENER] Socket.IO disconnected');
  });

  socket.on('error', (error) => {
    console.error('❌ [ACCOUNT-LISTENER] Socket.IO error:', error);
  });

})();
