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
    setupDropdowns(); // Setup dropdowns (Account + Admin Panel)
    loadNotificationsCount();   // Lần đầu load ngay khi trang mở
    loadUnreadMessagesCount();  // Thêm: Load unread messages count
    checkAuthStatus();

    // TỰ ĐỘNG CẬP NHẬT BADGE MỔI 30 GIÂY (hoạt động trên mọi trang)
    setInterval(loadNotificationsCount, 30000); // 30.000ms = 30 giây
    setInterval(loadUnreadMessagesCount, 30000); // Thêm: Update messages badge mỗi 30 giây
    
    // Socket.IO for real-time updates (if available)
    if (typeof io !== 'undefined' && !window.headerSocket) {
        initHeaderSocket();
    }
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
/**
 * Sync with Google Calendar (Bắt đầu luồng OAuth hoặc kích hoạt Sync)
 */
async function syncGoogleCalendar() {
    const googleSyncBtn = document.getElementById('googleSyncBtn');
    
    // Lưu lại trạng thái gốc của nút
    const originalText = googleSyncBtn.querySelector('.btn-text') ? googleSyncBtn.querySelector('.btn-text').textContent : 'Sync with Google';
    const isCollapsed = googleSyncBtn.closest('header').classList.contains('collapsed');

    // Bắt đầu trạng thái loading
    if (googleSyncBtn) {
        googleSyncBtn.disabled = true;
        const icon = googleSyncBtn.querySelector('i');
        const text = googleSyncBtn.querySelector('.btn-text');
        
        // Thay đổi UI thành loading
        if (icon) icon.className = 'fas fa-spinner fa-spin'; 
        if (text) text.textContent = 'Processing...';
        if (isCollapsed && text) text.textContent = ''; // Ẩn text khi collapsed
    }

    try {
        // Gọi API để kiểm tra trạng thái và nhận URL OAuth nếu cần
        const response = await fetch('/api/google/sync');
        const data = await response.json();

        if (response.ok && data.success) {
            
            if (data.action === 'redirect' && data.url) {
                // Hành động 1: Chuyển hướng đến Google để xác thực (Lần đầu Sync)
                alert('Bạn sẽ được chuyển đến trang xác thực Google.');
                window.location.href = data.url; 

            } else {
                // Hành động 2: Đồng bộ/Thiết lập Webhook thành công (Đã có token)
                alert('Sync/Thiết lập thành công: ' + data.message);
            }

        } else {
            // Xử lý lỗi từ server
            alert(`Lỗi: ${data.message || 'Lỗi không xác định từ server.'}`);
        }
    } catch (error) {
        console.error('Lỗi mạng hoặc server:', error);
        alert('Không thể kết nối đến server. Vui lòng kiểm tra server đang chạy.');
    } finally {
        // Kết thúc trạng thái loading
        if (googleSyncBtn) {
            googleSyncBtn.disabled = false;
            
            const icon = googleSyncBtn.querySelector('i');
            const text = googleSyncBtn.querySelector('.btn-text');

            if (icon) icon.className = 'fas fa-sync'; // Icon gốc
            if (text) text.textContent = originalText; // Text gốc
            
            // Đảm bảo ẩn text nếu vẫn đang collapsed
            if (isCollapsed && text) text.textContent = '';
        }
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
 * Load số lượng messages chưa đọc cho badge
 */
async function loadUnreadMessagesCount() {
    try {
        const response = await fetch('/api/messages/unread/count');
        const data = await response.json();
        
        if (data.success) {
            const badge = document.getElementById('messages-badge');
            if (badge) {
                if (data.count > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.error('Lỗi load unread messages:', error);
    }
}

/**
 * Initialize Socket.IO for real-time updates
 */
function initHeaderSocket() {
    window.headerSocket = io({
        transports: ['websocket', 'polling']
    });
    
    const socket = window.headerSocket;
    
    socket.on('connect', () => {
        console.log('📡 Header socket connected');
        if (window.currentUserId) {
            socket.emit('user:join', window.currentUserId);
        }
    });
    
    // Listen for new messages
    socket.on('message:new', (data) => {
        console.log('🔔 New message received in header');
        loadUnreadMessagesCount(); // Update badge immediately
    });
    
    // Listen for message marked as read
    socket.on('messages:read', (data) => {
        console.log('✅ Messages marked as read');
        loadUnreadMessagesCount(); // Update badge immediately
    });
    
    // Listen for new notifications (từ admin)
    socket.on('notification:new', (data) => {
        console.log('🔔 New notification received:', data);
        loadNotificationsCount(); // Update badge immediately
        // Không show toast - notification sẽ hiển trong danh sách notifications
    });
    
    socket.on('disconnect', () => {
        console.log('📡 Header socket disconnected');
    });
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
// DROPDOWN SETUP - Gộp vào 1 function để gọi từ DOMContentLoaded chính
// ===================================================================
function setupDropdowns() {
    // Account Dropdown
    const accountTrigger = document.getElementById('account-trigger');
    const accountDropdown = document.getElementById('account-dropdown-container');
    
    // Admin Dropdown
    const adminTrigger = document.getElementById('admin-trigger');
    const adminDropdown = document.getElementById('admin-dropdown-container');
    
    if (accountTrigger && accountDropdown) {
        // Toggle dropdown khi click vào tài khoản
        accountTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            accountDropdown.classList.toggle('active');
            
            // Đóng admin dropdown nếu đang mở
            if (adminDropdown) {
                adminDropdown.classList.remove('active');
            }
        });
    }
    
    if (adminTrigger && adminDropdown) {
        // Toggle dropdown khi click vào admin panel
        adminTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            adminDropdown.classList.toggle('active');
            
            // Đóng account dropdown nếu đang mở
            if (accountDropdown) {
                accountDropdown.classList.remove('active');
            }
        });
    }
    
    // Đóng dropdown khi click bên ngoài
    document.addEventListener('click', (e) => {
        if (accountDropdown && !accountDropdown.contains(e.target)) {
            accountDropdown.classList.remove('active');
        }
        if (adminDropdown && !adminDropdown.contains(e.target)) {
            adminDropdown.classList.remove('active');
        }
    });
}
