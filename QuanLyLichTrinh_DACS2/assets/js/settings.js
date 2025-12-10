// assets/js/settings.js
// ===================================================================
// settings.js - FRONTEND (CHỈ XỬ LÝ UI VÀ GỌI API)
// Backend xử lý update account, 2FA, devices, password, reminder prefs,...
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadDevices();              // Load danh sách thiết bị đang đăng nhập
    loadReminderPreferences();  // Load cài đặt nhắc nhở (nếu backend hỗ trợ)
    setupSettingsListeners();   // Gắn tất cả event
    addActivity("Trang cài đặt đã được mở"); // Ghi log hoạt động (gửi về backend hoặc chỉ UI)
});

/* ============================================================== */
/* ====================== GỌI API ================================ */
/* ============================================================== */

/** Load danh sách thiết bị đã đăng nhập */
async function loadDevices() {
    try {
        const res = await fetch('/api/devices');
        const data = await res.json();
        if (data.success) displayDevices(data.devices || []);
    } catch (err) { console.error('Lỗi load devices:', err); }
}

/** Đăng xuất thiết bị khác */
async function logoutDevice(deviceId) {
    try {
        const res = await fetch(`/api/devices/${deviceId}/logout`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert('Đăng xuất thiết bị thành công!');
            loadDevices();
            addActivity(`Đã đăng xuất thiết bị ID ${deviceId}`);
        }
    } catch (err) { console.error('Lỗi logout device:', err); }
}

/** Bật 2FA */
async function enable2FA() {
    try {
        const res = await fetch('/api/2fa/enable', { method: 'POST' });
        const data = await res.json();
        if (data.success) alert('2FA đã được bật thành công!');
        else alert(data.message || 'Lỗi bật 2FA');
    } catch (err) { console.error('Lỗi enable 2FA:', err); }
}

/** Tắt 2FA */
async function disable2FA() {
    try {
        const res = await fetch('/api/2fa/disable', { method: 'POST' });
        const data = await res.json();
        if (data.success) alert('2FA đã bị tắt!');
        else alert(data.message || 'Lỗi tắt 2FA');
    } catch (err) { console.error('Lỗi disable 2FA:', err); }
}

/** Đổi mật khẩu */
async function changePassword(newPassword) {
    try {
        const res = await fetch('/api/password/change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword })
        });
        const data = await res.json();
        if (data.success) {
            alert('Đổi mật khẩu thành công!');
            document.getElementById('new-password').value = '';
        } else alert(data.message || 'Lỗi đổi mật khẩu');
    } catch (err) { console.error('Lỗi change password:', err); }
}

/** Xóa tài khoản */
async function deleteAccount() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ tài khoản? Hành động này không thể hoàn tác!')) return;
    try {
        const res = await fetch('/api/account/delete', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert('Tài khoản đã bị xóa.');
            window.location.href = '/login';
        } else alert(data.message || 'Lỗi xóa tài khoản');
    } catch (err) { console.error('Lỗi delete account:', err); }
}

/** Cập nhật thông tin cá nhân + avatar */
async function updateAccount(formData) {
    try {
        const res = await fetch('/api/account/update', {
            method: 'PUT',
            body: formData               // FormData chứa text + file avatar
        });
        const data = await res.json();
        if (data.success) {
            alert('Cập nhật thông tin thành công!');
            // Nếu backend trả về avatar mới → cập nhật ảnh đại diện ở header
            if (data.avatarUrl) {
                const avatarImg = document.querySelector('#account-icon');
                if (avatarImg) avatarImg.src = data.avatarUrl + '?' + Date.now();
            }
        } else alert(data.message || 'Lỗi cập nhật thông tin');
    } catch (err) { console.error('Lỗi update account:', err); }
}

/** Lưu cài đặt nhắc nhở (reminder preferences) */
async function saveReminderPreferences(prefs) {
    try {
        const res = await fetch('/api/reminder-prefs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prefs)
        });
        const data = await res.json();
        if (data.success) console.log('Reminder preferences saved');
    } catch (err) { console.error('Lỗi lưu reminder prefs:', err); }
}

/** Load cài đặt nhắc nhở từ backend */
async function loadReminderPreferences() {
    try {
        const res = await fetch('/api/reminder-prefs');
        const data = await res.json();
        if (data.success && data.prefs) applyReminderPrefs(data.prefs);
    } catch (err) { console.error('Lỗi load reminder prefs:', err); }
}

/** Lưu tất cả thay đổi (batch) – nếu backend hỗ trợ */
async function saveAllChanges() {
    alert('Tất cả thay đổi đã được lưu!');
    // Nếu có endpoint batch thì gọi ở đây
}

/* ============================================================== */
/* ====================== UI & HELPER =========================== */
/* ============================================================== */

function setupSettingsListeners() {
    // Form thông tin cá nhân
    document.getElementById('account-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        updateAccount(formData);
    });

    // 2FA buttons
    document.getElementById('enable-2fa')?.addEventListener('click', enable2FA);
    document.getElementById('disable-2fa')?.addEventListener('click', disable2FA);

    // Đổi mật khẩu
    document.getElementById('change-password')?.addEventListener('click', () => {
        const pwd = document.getElementById('new-password')?.value.trim();
        if (!pwd) return alert('Vui lòng nhập mật khẩu mới!');
        changePassword(pwd);
    });

    // Xóa tài khoản
    document.getElementById('delete-account')?.addEventListener('click', deleteAccount);

    // Lưu tất cả
    document.getElementById('save-all')?.addEventListener('click', saveAllChanges);

    // Đăng xuất thiết bị
    document.getElementById('devices-list')?.addEventListener('click', e => {
        if (e.target.classList.contains('btn-logout')) {
            const deviceId = e.target.dataset.id;
            if (deviceId) logoutDevice(deviceId);
        }
    });

    // Reminder preferences (email, sms, push, frequency)
    const elems = [
        document.getElementById('reminder-email'),
        document.getElementById('reminder-sms'),
        document.getElementById('reminder-push'),
        document.getElementById('reminder-frequency')
    ];

    elems.forEach(el => {
        if (el) el.addEventListener('change', () => {
            const prefs = {
                email: document.getElementById('reminder-email')?.checked ?? false,
                sms:   document.getElementById('reminder-sms')?.checked ?? false,
                push:  document.getElementById('reminder-push')?.checked ?? false,
                frequency: document.getElementById('reminder-frequency')?.value ?? 'daily'
            };
            saveReminderPreferences(prefs);
        });
    });
}

function displayDevices(devices) {
    const list = document.getElementById('devices-list');
    if (!list) return;
    list.innerHTML = devices.map(d => `
        <li class="device-item">
            ${d.name || d.browser + ' - ' + d.os}
            <button class="btn-logout" data-id="${d.id}">Đăng xuất</button>
        </li>
    `).join('');
}

function applyReminderPrefs(prefs) {
    if (document.getElementById('reminder-email'))   document.getElementById('reminder-email').checked   = prefs.email;
    if (document.getElementById('reminder-sms'))     document.getElementById('reminder-sms').checked     = prefs.sms;
    if (document.getElementById('reminder-push'))    document.getElementById('reminder-push').checked    = prefs.push;
    if (document.getElementById('reminder-frequency')) document.getElementById('reminder-frequency').value = prefs.frequency || 'daily';
}

/** Activity log – chỉ hiển thị ở UI (có thể gửi về backend nếu muốn) */
function addActivity(desc) {
    const logContainer = document.getElementById('activity-log');
    if (!logContainer) return;

    const li = document.createElement('li');
    li.innerHTML = `<span class="timestamp">[${new Date().toLocaleString()}]</span> ${desc}`;
    logContainer.prepend(li); // Thêm vào đầu danh sách
}

// ===================================================================
// NOTES CHO DEVELOPER & BACKEND TEAM
// ===================================================================
// 1. Các API backend bắt buộc phải có (với response format chuẩn):
//    POST   /api/2fa/enable          → { success: true, qrCode?: string, secret?: string }
//    POST   /api/2fa/disable         → { success: true }
//    GET    /api/devices             → { success: true, devices: [{ id, name, browser, os, last_active, is_current }] }
//    POST   /api/devices/:id/logout  → { success: true }
//    POST   /api/password/change     → { success: true } (body: { newPassword })
//    PUT    /api/account/update      → { success: true, avatarUrl?: string } (FormData, hỗ trợ file)
//    DELETE /api/account/delete      → { success: true }
//    GET    /api/reminder-prefs      → { success: true, prefs: { email, sms, push, frequency } }
//    POST   /api/reminder-prefs      → { success: true } (body: prefs object)

// 2. Xử lý file upload avatar:
//    - Backend phải dùng multer hoặc tương tự để nhận FormData
//    - Trả về avatarUrl đầy đủ (có thể kèm timestamp/cache-busting)
//    - Gợi ý: lưu vào /uploads/avatars/ và trả về URL public

// 3. Reminder preferences:
//    - Nếu backend chưa có bảng reminder_preferences → cần tạo migration
//    - Có thể mở rộng thêm: sound_id, before_minutes, working_hours_only,...

// 4. Security gợi ý:
//    - Change password & delete account → yêu cầu nhập lại mật khẩu hiện tại
//    - Enable 2FA → trả về QR code + backup codes
//    - Logout device → không cho logout thiết bị hiện tại (hoặc hỏi confirm)

// 5. UI/UX nâng cao có thể thêm sau:
//    - Hiển thị "Thiết bị hiện tại" với icon đặc biệt
//    - Activity log thực tế gửi về backend (/api/activity-log)
//    - Dark mode toggle, language, timezone settings
//    - Hiển thị QR code modal khi bật 2FA
//    - Preview avatar trước khi lưu

// 6. Error handling nên thống nhất:
//    { success: false, message: "..." } hoặc throw HTTP error code (400, 401, 500)

// File này CHỈ xử lý UI + gọi API → không chứa logic nghiệp vụ, validation phức tạp, hay lưu localStorage
// ===================================================================