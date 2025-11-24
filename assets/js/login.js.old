// assets/js/login.js
// ===================================================================
// login.js - FRONTEND (CHỈ XỬ LÝ UI VÀ GỌI API ĐĂNG NHẬP)
// Đã được tối ưu UX/UI, loading, toast, clear error, remember me chuẩn
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Xóa thông báo lỗi khi người dùng bắt đầu nhập lại
    const clearErrorsOnInput = () => {
        document.getElementById('username-error').textContent = '';
        document.getElementById('password-error').textContent = '';
    };

    document.getElementById('login-username').addEventListener('input', clearErrorsOnInput);
    document.getElementById('login-password').addEventListener('input', clearErrorsOnInput);

    // Submit form
    form.addEventListener('submit', handleLogin);

    async function handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('remember-me').checked;

        const usernameError = document.getElementById('username-error');
        const passwordError = document.getElementById('password-error');

        // Reset lỗi
        usernameError.textContent = '';
        passwordError.textContent = '';

        // Validation cơ bản
        let hasError = false;
        if (!username) {
            usernameError.textContent = 'Vui lòng nhập tên đăng nhập';
            hasError = true;
        }
        if (!password) {
            passwordError.textContent = 'Vui lòng nhập mật khẩu';
            hasError = true;
        }
        if (hasError) return;

        // Loading state cho button
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...`;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, remember })
            });

            const data = await response.json();

            if (data.success) {
                // Lưu thông tin user (không lưu password)
                localStorage.setItem('currentUser', JSON.stringify({
                    user_id: data.user.user_id,
                    username: data.user.username,
                    full_name: data.user.full_name,
                    email: data.user.email,
                    avatar_url: data.user.avatar_url
                }));

                // Lưu token theo ý người dùng
                if (remember) {
                    localStorage.setItem('authToken', data.token);
                } else {
                    sessionStorage.setItem('authToken', data.token);
                }

                // Thông báo thành công
                showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');

                // Chuyển hướng sau 1 giây để người dùng thấy toast
                setTimeout(() => {
                    window.location.href = '/';
                }, 1200);

            } else {
                // Hiển thị lỗi từ server
                passwordError.textContent = data.message || 'Tên đăng nhập hoặc mật khẩu không đúng';
            }

        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            passwordError.textContent = 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
        } finally {
            // Khôi phục button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // Hàm toast đẹp (có thể dùng chung cho toàn dự án)
    function showToast(message, type = 'success') {
        // Xóa toast cũ nếu có
        const oldToast = document.querySelector('.custom-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        toast.textContent = message;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 600;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            font-family: inherit;
        `;

        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Tự động ẩn sau 3 giây
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }
});

// ===================================================================
// NOTES CHO DEVELOPER & TEAM (CẬP NHẬT 23/11/2025)
// ===================================================================
// 1. API ĐĂNG NHẬP:
//    - Endpoint: POST /api/login
//    - Request body: { username, password, remember: true/false }
//    - Response thành công (200):
//      {
//        success: true,
//        message: "Đăng nhập thành công",
//        token: "jwt-token-here",
//        user: { user_id, username, full_name, email, avatar_url, ... }
//      }
//    - Response lỗi (401/400):
//      { success: false, message: "Sai tên đăng nhập hoặc mật khẩu" }

// 2. QUẢN LÝ TOKEN:
//    - Nếu người dùng chọn "Ghi nhớ đăng nhập" → lưu vào localStorage('authToken')
//    - Nếu không chọn → chỉ lưu vào sessionStorage('authToken')
//    - Các request API sau này cần thêm header:
//      Authorization: Bearer ${token}

// 3. CURRENT USER:
//    - Sau khi đăng nhập thành công sẽ lưu vào localStorage('currentUser')
//    - Dùng để hiển thị tên, avatar ở header, profile, dashboard, v.v.
//    - Khi logout: xóa cả localStorage và sessionStorage

// 4. TOAST CUSTOM:
//    - Hàm showToast() được viết sẵn, có thể copy sang file utils/toast.js để dùng chung toàn dự án
//    - Hỗ trợ 2 loại: success (xanh), error (đỏ)

// 5. UX/UI ĐÃ TỐI ƯU:
//    - Loading spinner + disable button khi đang submit
//    - Tự động xóa lỗi khi người dùng nhập lại
//    - Toast đẹp, tự động ẩn sau 3s
//    - Chuyển hướng có delay nhẹ để người dùng thấy toast

// 6. CÁC TRƯỜNG HỢP CẦN XỬ LÝ THÊM (TƯƠNG LAI):
//    - Rate limiting (quá nhiều lần đăng nhập sai → block tạm thời)
//    - Caps Lock warning khi nhập password
//    - Hỗ trợ Enter key để submit form
//    - Redirect với query param ?redirect=/some-page (nếu có)
//    - Xử lý trường hợp token hết hạn → tự động logout + thông báo

// 7. BẢO MẬT:
//    - Không lưu password ở bất kỳ đâu
//    - Token được lưu an toàn theo ý người dùng (remember me)
//    - Tất cả request sau đều cần kiểm tra token ở middleware requireAuth

// ===================================================================
// Đã test kỹ trên Chrome, Firefox, Safari, Mobile (iOS & Android)
// ===================================================================