// assets/js/header.js
// ===================================================================
// header.js - FRONTEND (CHỈ XỬ LÝ UI HEADER VÀ GỌI API CHO SYNC/EXPORT/LOGOUT)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupHeaderListeners();
    loadNotificationsCount(); // Load badge notif
    checkAuthStatus(); // Kiểm tra đăng nhập
});

// Setup listeners cho header
function setupHeaderListeners() {
    const menuToggle = document.getElementById('menu-toggle');
    const header = document.querySelector('header');
    if (menuToggle && header) {
        menuToggle.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            menuToggle.style.transform = header.classList.contains('collapsed') ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }
    
    document.getElementById('googleSyncBtn').addEventListener('click', syncGoogleCalendar);
    document.getElementById('quickExportBtn').addEventListener('click', quickExport);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('globalSearchInput').addEventListener('input', handleGlobalSearch);
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