// assets/js/header.js
// ===================================================================
// header.js - FRONTEND (CHỈ XỬ LÝ UI HEADER VÀ GỌI API CHO SYNC/EXPORT/LOGOUT)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    const menuToggle = document.getElementById('menu-toggle');

    // === LẤY TRẠNG THÁI TỪ localStorage ===
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        header.classList.add('collapsed');
    }

    // === CẬP NHẬT LẠI ICON MŨI TÊN ===
    if (menuToggle) {
        menuToggle.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    setupHeaderListeners();
    loadNotificationsCount();   // Lần đầu load ngay khi trang mở
    checkAuthStatus();

    // TỰ ĐỘNG CẬP NHẬT BADGE MỖI 30 GIÂY (hoạt động trên mọi trang)
    setInterval(loadNotificationsCount, 30000); // 30.000ms = 30 giây
});

function setupHeaderListeners() {
    const menuToggle = document.getElementById('menu-toggle');
    const header = document.querySelector('header');

    if (menuToggle && header) {
        menuToggle.addEventListener('click', () => {
            const willCollapse = !header.classList.contains('collapsed');
            header.classList.toggle('collapsed');

            // === LƯU TRẠNG THÁI VÀO localStorage ===
            localStorage.setItem('sidebarCollapsed', willCollapse);

            // Xoay icon
            menuToggle.style.transform = willCollapse ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    // Các listener khác giữ nguyên
    const googleSyncBtn = document.getElementById('googleSyncBtn');
    if (googleSyncBtn) googleSyncBtn.addEventListener('click', syncGoogleCalendar);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Nếu bạn có global search
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.addEventListener('input', handleGlobalSearch);
}
// ===================================================================
// CÁC HÀM GỌI API
// ===================================================================

/**
 * Sync with Google Calendar
 */
async function syncGoogleCalendar() {
    try {
        const response = await fetch('/api/sync/google');
        const data = await response.json();
        
        if (data.success) {
            alert('Sync thành công!');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

/**
 * Quick export
 */
async function quickExport() {
    try {
        const response = await fetch('/api/export/quick');
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'quick_export.csv';
            a.click();
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

/**
 * Load số lượng notifications chưa đọc cho badge
 */
async function loadNotificationsCount() {
    try {
        const response = await fetch('/api/notifications/count');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('notif-badge').textContent = data.count;
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

/**
 * Kiểm tra trạng thái auth
 */
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();

        const label = document.getElementById('account-label');
        const dropdownContainer = document.getElementById('account-dropdown-container');

        if (data.isAuthenticated && data.user && data.user.fullName) {
            // HIỆN TÊN ĐẸP
            if (label) label.textContent = data.user.fullName;

            // Hiện dropdown tài khoản (nếu đang bị ẩn)
            if (dropdownContainer) {
                dropdownContainer.style.display = 'block';
            }
        } else {
            // Chưa đăng nhập
            if (label) label.textContent = 'Tài khoản';
            if (dropdownContainer) {
                dropdownContainer.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Lỗi check auth:', err);
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

/**
 * Global search
 */
async function handleGlobalSearch(e) {
    const query = e.target.value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.results);
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

// ===================================================================
// CÁC HÀM UI
// ===================================================================

function displaySearchResults(results) {
    // TODO: Hiển thị kết quả search (modal hoặc dropdown)
    console.log(results);
}

// ===================================================================
// CÁC HÀM UI
// ===================================================================

function displaySearchResults(results) {
    // TODO: Hiển thị kết quả search (modal hoặc dropdown)
    console.log(results);
}

// ===================================================================
// DROPDOWN CLICK TOGGLE - Nhấn mở, nhấn lại đóng
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    const accountTrigger = document.getElementById('account-trigger');
    const accountDropdown = document.getElementById('account-dropdown-container');
    
    if (accountTrigger && accountDropdown) {
        // Toggle dropdown khi click vào tài khoản
        accountTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            accountDropdown.classList.toggle('active');
        });
        
        // Đóng dropdown khi click bên ngoài
        document.addEventListener('click', (e) => {
            if (!accountDropdown.contains(e.target)) {
                accountDropdown.classList.remove('active');
            }
        });
    }
});

// ===================================================================
// NOTES - CẬP NHẬT CHÍNH XÁC THEO BACKEND HIỆN TẠI CỦA BẠN
// ===================================================================
// ✅ ĐÃ CÓ SẴN trong backend (bạn KHÔNG cần tạo thêm):
//    - /api/logout (POST)           → authController.logout
//    - /api/check-auth (GET)        → authController.checkAuth
//    - /api/notifications/count     → bạn cần thêm 1 route nhỏ (rất dễ)
// 
// ❌ CHƯA CÓ trong backend (bạn cần tạo thêm để header hoạt động đầy đủ):
//    - /api/sync/google             → Sync Google Calendar
//    - /api/export/quick            → Quick export CSV
//    - /api/search                  → Global search (tasks + events)
//    - /api/notifications/count     → Đếm thông báo chưa đọc
//
// Gợi ý nhanh để thêm /api/notifications/count (nếu bạn muốn hoàn thiện ngay):
// Trong routes/notificationRoutes.js (hoặc thêm vào authRoutes.js)
// 
// router.get('/api/notifications/count', requireAuth, async (req, res) => {
//   const count = await Notification.countUnread(req.session.userId);
//   res.json({ success: true, count });
// });
//
// Nếu chưa muốn làm real-time badge → cứ để 0 cũng được, không lỗi
// ===================================================================



// ===================================================================
// NOTES - CẬP NHẬT CHÍNH XÁC THEO BACKEND HIỆN TẠI CỦA BẠN
// ===================================================================
// ✅ ĐÃ CÓ SẴN trong backend (bạn KHÔNG cần tạo thêm):
//    - /api/logout (POST)           → authController.logout
//    - /api/check-auth (GET)        → authController.checkAuth
//    - /api/notifications/count     → bạn cần thêm 1 route nhỏ (rất dễ)
// 
// ❌ CHƯA CÓ trong backend (bạn cần tạo thêm để header hoạt động đầy đủ):
//    - /api/sync/google             → Sync Google Calendar
//    - /api/export/quick            → Quick export CSV
//    - /api/search                  → Global search (tasks + events)
//    - /api/notifications/count     → Đếm thông báo chưa đọc
//
// Gợi ý nhanh để thêm /api/notifications/count (nếu bạn muốn hoàn thiện ngay):
// Trong routes/notificationRoutes.js (hoặc thêm vào authRoutes.js)
// 
// router.get('/api/notifications/count', requireAuth, async (req, res) => {
//   const count = await Notification.countUnread(req.session.userId);
//   res.json({ success: true, count });
// });
//
// Nếu chưa muốn làm real-time badge → cứ để 0 cũng được, không lỗi
// ===================================================================