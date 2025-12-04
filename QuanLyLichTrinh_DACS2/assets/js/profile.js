// assets/js/profile.js
// Profile Page - New Implementation with Settings Layout

document.addEventListener('DOMContentLoaded', () => {
    setupProfileHandlers();
});

function setupProfileHandlers() {
    // Avatar upload preview
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarPreview = document.getElementById('avatar-preview');

    if (avatarUpload && avatarPreview) {
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    showNotification('Kích thước ảnh không được vượt quá 2MB', 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    // Password form submission
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordSubmit);
    }

    // Link Google account
    const linkGoogleBtn = document.getElementById('link-google');
    if (linkGoogleBtn) {
        linkGoogleBtn.addEventListener('click', () => {
            window.location.href = '/auth/google/link';
        });
    }

    // Delete account
    const deleteAccountBtn = document.getElementById('delete-account');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleDeleteAccount);
    }

    // Save all button
    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            profileForm?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    
    if (!fullName || !email) {
        showNotification('Vui lòng điền đầy đủ họ tên và email', 'error');
        return;
    }

    formData.append('fullName', fullName);
    formData.append('email', email);
    if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);
    
    const avatarFile = document.getElementById('avatar-upload')?.files[0];
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }

    try {
        const response = await fetch('/api/profile/update', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Cập nhật thông tin thành công!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showNotification(result.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Không thể cập nhật thông tin', 'error');
    }
}

async function handlePasswordSubmit(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showNotification('Mật khẩu mới không khớp!', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        return;
    }

    if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
        showNotification('Mật khẩu phải có cả chữ và số', 'error');
        return;
    }

    try {
        const response = await fetch('/api/profile/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Đổi mật khẩu thành công!', 'success');
            document.getElementById('password-form').reset();
        } else {
            showNotification(result.message || 'Mật khẩu hiện tại không đúng', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Không thể đổi mật khẩu', 'error');
    }
}

async function handleDeleteAccount() {
    const confirmed = confirm(
        '⚠️ BẠN CHẮC CHẮN MUỐN XÓA TÀI KHOẢN?\n\n' +
        'Tất cả dữ liệu sẽ bị xóa vĩnh viễn:\n' +
        '• Các task và lịch trình\n' +
        '• Nhóm và cộng tác\n' +
        '• Thông báo và báo cáo\n\n' +
        'Hành động này KHÔNG THỂ HOÀN TÁC!'
    );

    if (!confirmed) return;

    const doubleConfirm = prompt('Nhập "XÓA TÀI KHOẢN" để xác nhận:');
    if (doubleConfirm !== 'XÓA TÀI KHOẢN') {
        showNotification('Hủy xóa tài khoản', 'info');
        return;
    }

    try {
        const response = await fetch('/api/profile/delete-account', {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Tài khoản đã được xóa. Tạm biệt!', 'success');
            setTimeout(() => window.location.href = '/login', 2000);
        } else {
            showNotification(result.message || 'Không thể xóa tài khoản', 'error');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showNotification('Có lỗi xảy ra', 'error');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
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
