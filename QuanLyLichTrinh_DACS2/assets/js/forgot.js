// assets/js/forgot.js
// ===================================================================
// forgot.js - FRONTEND (QUÊN MẬT KHẨU - PRODUCTION READY)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const form       = document.getElementById('forgot-form');
    const emailInput = document.getElementById('forgot-email');
    const emailError = document.getElementById('email-error');
    const submitBtn  = form.querySelector('button[type="submit"]');

    // Tạo container thông báo (thành công + lỗi chung)
    const alertBox = document.createElement('div');
    alertBox.className = 'alert-box';
    form.parentNode.insertBefore(alertBox, form);

    const showAlert = (message, type = 'error') => {
        alertBox.textContent = message;
        alertBox.className = `alert-box ${type} show`;
        setTimeout(() => alertBox.classList.remove('show'), type === 'success' ? 5000 : 8000);
    };

    const setLoading = (loading) => {
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading 
            ? '<i class="fas fa-spinner fa-spin"></i> Đang gửi...' 
            : '<i class="fas fa-paper-plane"></i> Gửi yêu cầu';
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset UI
        emailError.textContent = '';
        emailInput.classList.remove('error-input');
        alertBox.classList.remove('show');

        const email = emailInput.value.trim();

        // Client-side validation
        if (!email) {
            emailError.textContent = 'Vui lòng nhập email của bạn.';
            emailInput.classList.add('error-input');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            emailError.textContent = 'Email không hợp lệ. Vui lòng kiểm tra lại.';
            emailInput.classList.add('error-input');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                showAlert('Liên kết đặt lại mật khẩu đã được gửi tới email của bạn!', 'success');
                form.reset();
            } else {
                showAlert(data.message || 'Không tìm thấy tài khoản với email này.', 'error');
            }
        } catch (err) {
            console.error('Lỗi mạng hoặc server:', err);
            showAlert('Không thể kết nối tới máy chủ. Vui lòng thử lại sau.', 'error');
        } finally {
            setLoading(false);
        }
    });

    // Xóa lỗi khi người dùng nhập lại
    emailInput.addEventListener('input', () => {
        if (emailInput.value.trim()) {
            emailError.textContent = '';
            emailInput.classList.remove('error-input');
        }
    });

    // Thêm Enter key để submit (người dùng hay bấm Enter)
    emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            form.dispatchEvent(new Event('submit'));
        }
    });

    // Tự focus vào ô email khi load trang
    emailInput.focus();
});

// ===================================================================
// NOTES (CẬP NHẬT - PRODUCTION READY 100%):
// ===================================================================
// Backend cần có route POST /api/auth/forgot-password trả về JSON:
//   { success: true } hoặc { success: false, message: '...' }

// Bảo mật quan trọng (phải có ở backend):
// - Rate limiting (max 5 lần/giờ/IP hoặc/email)
// - Không được tiết lộ user tồn tại hay không (luôn trả "Đã gửi email" dù đúng/sai)
// - Gửi email qua queue (BullMQ, Redis) để tránh block
// - Token reset chỉ dùng 1 lần + hết hạn sau 15-30 phút
// - Log lại IP + thời gian để chống brute-force
// ===================================================================