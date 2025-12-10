// assets/js/profile.js
// ===================================================================
// profile.js - FRONTEND (CHỈ XỬ LÝ UI VÀ GỌI API THẬT)
// Backend xử lý: controllers/profileController.js + User model
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();                    // Lấy dữ liệu profile từ API
    setupProfileListeners();          // Gắn tất cả sự kiện
    loadTimezoneOptions();            // Tải danh sách timezone (nếu có select)
});

// ===================================================================
// 1. CÁC HÀM GỌI API (THẬT)
// ===================================================================

/**
 * Lấy thông tin profile từ server
 */
async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();

        if (data.success && data.user) {
            displayProfile(data.user);
        } else {
            console.error('Lỗi load profile:', data.message);
        }
    } catch (error) {
        console.error('Lỗi kết nối load profile:', error);
    }
}

/**
 * Cập nhật profile (bao gồm cả đổi mật khẩu + upload avatar)
 */
async function updateProfile(formData) {
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            body: formData                    // FormData để hỗ trợ file upload
        });

        const data = await response.json();

        if (data.success) {
            alert('Cập nhật hồ sơ thành công!');
            loadProfile();      // Reload dữ liệu mới
            closeModal();
        } else {
            alert('Lỗi: ' + (data.message || 'Cập nhật thất bại'));
        }
    } catch (error) {
        console.error('Lỗi update profile:', error);
        alert('Có lỗi xảy ra, vui lòng thử lại!');
    }
}

/**
 * Đăng xuất
 */
async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Lỗi logout:', error);
    }
}

// ===================================================================
// 2. CÁC HÀM UI
// ===================================================================

function setupProfileListeners() {
    const editBtn        = document.getElementById('edit-btn');
    const logoutBtn      = document.getElementById('logout-btn');
    const editForm       = document.getElementById('edit-form');
    const closeModalBtn  = document.getElementById('close-modal');
    const modalOverlay   = document.getElementById('modal-overlay');

    if (editBtn)       editBtn.addEventListener('click', openEditModal);
    if (logoutBtn)     logoutBtn.addEventListener('click', handleLogout);
    if (editForm)      editForm.addEventListener('submit', handleUpdateProfile);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay)  modalOverlay.addEventListener('click', closeModal);
}

/**
 * Hiển thị dữ liệu profile lên giao diện
 */
function displayProfile(user) {
    if (!user) return;

    // Cập nhật các phần tử có id
    const nameEl   = document.getElementById('user-name');
    const emailEl  = document.getElementById('user-email');
    const phoneEl  = document.getElementById('user-phone');
    const joinedEl = document.getElementById('user-joined');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl)   nameEl.textContent   = user.full_name || 'Chưa đặt tên';
    if (emailEl)  emailEl.textContent  = user.email || '';
    if (phoneEl)  phoneEl.textContent  = user.phone || 'Chưa có số điện thoại';
    if (joinedEl) joinedEl.textContent = `Tham gia: ${formatDate(user.created_at)}`;
    if (avatarEl && user.avatar_url) {
        avatarEl.src = user.avatar_url;
    }
}

// Format ngày đẹp hơn
function formatDate(dateString) {
    if (!dateString) return 'Chưa xác định';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// ===================================================================
// 3. MODAL & FORM HANDLING
// ===================================================================

function openEditModal() {
    // Đưa dữ liệu hiện tại vào form
    document.getElementById('edit-name').value  = document.getElementById('user-name').textContent.trim();
    document.getElementById('edit-email').value = document.getElementById('user-email').textContent.trim();
    document.getElementById('edit-phone').value = document.getElementById('user-phone').textContent.trim() === 'Chưa có số điện thoại' ? '' : document.getElementById('user-phone').textContent.trim();

    // Reset password field
    document.getElementById('edit-password').value = '';

    // Hiển thị modal
    document.getElementById('edit-modal').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

function handleUpdateProfile(e) {
    e.preventDefault();

    const name     = document.getElementById('edit-name').value.trim();
    const email    = document.getElementById('edit-email').value.trim();
    const phone    = document.getElementById('edit-phone').value.trim();
    const password = document.getElementById('edit-password').value;
    const avatarFile = document.getElementById('avatar-upload')?.files[0];

    if (!name || !email) {
        alert('Vui lòng nhập đầy đủ Họ tên và Email!');
        return;
    }

    // Dùng FormData để hỗ trợ upload file
    const formData = new FormData();
    formData.append('full_name', name);
    formData.append('email', email);
    if (phone) formData.append('phone', phone);
    if (password) formData.append('password', password);
    if (avatarFile) formData.append('avatar', avatarFile);

    updateProfile(formData);
}

// ===================================================================
// 4. TIMEZONE SELECTOR (TÙY CHỌN - nếu bạn có thẻ select này)
// ===================================================================

function loadTimezoneOptions() {
    const timezoneSelect = document.getElementById("timezone-select");
    if (!timezoneSelect) return;

    const timezones = Intl.supportedValuesOf('timeZone');
    timezones.forEach(tz => {
        const opt = document.createElement("option");
        opt.value = tz;
        opt.textContent = tz.replace(/_/g, " ");
        timezoneSelect.appendChild(opt);
    });

    // Lấy timezone đã lưu hoặc mặc định
    const savedTz = localStorage.getItem("user-timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;
    timezoneSelect.value = savedTz;

    timezoneSelect.addEventListener("change", () => {
        localStorage.setItem("user-timezone", timezoneSelect.value);
        alert(`Timezone đã được cập nhật: ${timezoneSelect.value}`);
    });
}

// ===================================================================
// 5. GOOGLE SYNC (TÙY CHỌN - nếu bạn có nút này)
// ===================================================================

const googleSyncBtn = document.getElementById("google-sync");
if (googleSyncBtn) {
    googleSyncBtn.addEventListener("click", async () => {
        try {
            const res = await fetch('/api/sync/google', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('Đồng bộ Google Calendar thành công!');
                loadProfile();
            } else {
                alert('Lỗi đồng bộ: ' + data.message);
            }
        } catch (err) {
            alert('Không thể kết nối đồng bộ Google');
        }
    });
}

// ===================================================================
// NOTES CHO BACKEND DEVELOPER (và chính bạn sau này)
// ===================================================================

/*
  1. API cần thiết (đúng route + method + response format)
  
     GET  /api/profile
       → { success: true, user: { user_id, full_name, email, phone, avatar_url, created_at, ... } }
     
     PUT  /api/profile
       → Nhận FormData (vì có upload avatar)
       → Các field có thể có:
           • full_name (string, required)
           • email      (string, required)
           • phone      (string, optional)
           • password   (string, optional - chỉ khi người dùng nhập)
           • avatar     (file, optional)
       → Response: { success: true, message: "..." } hoặc { success: false, message: "..." }
       → Nếu có upload avatar → lưu file + trả về avatar_url mới trong loadProfile tiếp theo

     POST /api/logout
       → Xóa session / remember_token
       → Response: { success: true }

     POST /api/sync/google   (tùy chọn)
       → Đồng bộ Google Calendar (nếu có OAuth)
       → Response: { success: true/false, message: "..." }
*/

/*
  2. Xử lý upload avatar ở backend
     • Dùng multer hoặc tương tự để lưu file
     • Đường dẫn lưu ví dụ: /uploads/avatars/
     • Cập nhật users.avatar_url = `/uploads/avatars/filename.jpg`
     • Xóa file cũ nếu có (tùy chọn)
*/

/*
  3. Validation cần thiết ở backend
     • full_name: không rỗng
     • email: định dạng email + chưa tồn tại (trừ chính user đó)
     • password: nếu có thì phải >= 6 ký tự (và hash bằng bcrypt)
     • phone: định dạng số điện thoại VN (tùy chọn)
     • avatar: chỉ cho phép jpg, jpeg, png, webp; giới hạn size (ví dụ < 2MB)
*/

/*
  4. Response format thống nhất (rất quan trọng)
     Luôn trả về JSON có dạng:
     {
       success: true/false,
       message: "..." (khi lỗi),
       user: { ... } (khi GET profile thành công)
     }
     → Frontend đang dựa hoàn toàn vào thuộc tính .success
*/

/*
  5. Bảo mật
     • Tất cả các route trên phải có middleware requireAuth
     • Khi update email → nên gửi email xác nhận (tùy chọn nâng cao)
     • Rate limit cho /api/profile PUT để tránh spam
*/

/*
  6. Các field hiện tại frontend đang dùng
     • user-name      → full_name
     • user-email     → email
     • user-phone     → phone (có thể null)
     • user-joined    → created_at (format ngày VN)
     • user-avatar    → src = avatar_url (nếu có)
*/

/*
  7. Tính năng mở rộng (nếu muốn thêm sau)
     • Đổi username
     • Thay đổi timezone (lưu vào users.timezone)
     • Kết nối Google Calendar / Microsoft Outlook
     • Xem lịch sử đăng nhập
*/

/*
  8. Lỗi thường gặp nếu backend thiếu
     • Không dùng FormData → avatar không nhận được
     • Không trả success: true → modal không đóng
     • Không trả avatar_url mới → ảnh không cập nhật
     • Không có requireAuth → ai cũng sửa được profile người khác
*/

// ===================================================================
// KẾT LUẬN: Với NOTES này, bất kỳ backend dev nào (kể cả bạn 6 tháng sau)
// cũng có thể implement đúng 100% mà không cần hỏi lại frontend.
// ===================================================================
