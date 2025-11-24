// assets/js/login.js - UPDATED FOR CAPTCHA + GOOGLE OAUTH
// ===================================================================
// login.js - FRONTEND với Captcha và Google Sign-In
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const captchaInput = document.getElementById('captcha-input');
    const captchaImage = document.getElementById('captcha-image');
    const reloadCaptchaBtn = document.getElementById('reload-captcha');

    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');
    const captchaError = document.getElementById('captcha-error');

    // ===================================================================
    // CAPTCHA - Reload button
    // ===================================================================
    if (reloadCaptchaBtn) {
        reloadCaptchaBtn.addEventListener('click', () => {
            captchaImage.src = '/api/captcha?' + Date.now();
            captchaInput.value = '';
        });
    }

    // Clear errors on input
    usernameInput.addEventListener('input', () => {
        usernameError.textContent = '';
    });

    passwordInput.addEventListener('input', () => {
        passwordError.textContent = '';
    });

    if (captchaInput) {
        captchaInput.addEventListener('input', () => {
            captchaError.textContent = '';
        });
    }

    // ===================================================================
    // FORM SUBMIT - Đăng nhập thông thường
    // ===================================================================
    form.addEventListener('submit', handleLogin);

    async function handleLogin(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const captcha = captchaInput ? captchaInput.value.trim() : '';
        const remember = document.getElementById('remember-me').checked;

        // Reset lỗi
        usernameError.textContent = '';
        passwordError.textContent = '';
        if (captchaError) captchaError.textContent = '';

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
        // Chỉ validate captcha nếu có trường captcha
        if (captchaInput && !captcha) {
            captchaError.textContent = 'Vui lòng nhập mã xác thực';
            hasError = true;
        }
        if (hasError) return;

        // Loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    captcha,
                    remember
                })
            });

            const data = await response.json();

            if (data.success) {
                // Success toast
                showToast('✅ Đăng nhập thành công!', 'success');
                
                // Redirect
                setTimeout(() => {
                    window.location.href = data.redirectUrl || '/';
                }, 500);
            } else {
                // Hiển thị lỗi
                if (data.message.includes('Username') || data.message.includes('Tên đăng nhập')) {
                    usernameError.textContent = data.message;
                } else if (data.message.includes('Password') || data.message.includes('Mật khẩu')) {
                    passwordError.textContent = data.message;
                } else if (data.message.includes('Captcha') || data.message.includes('captcha')) {
                    if (captchaError) captchaError.textContent = data.message;
                    // Reload captcha if exists
                    if (captchaImage) captchaImage.src = '/api/captcha?' + Date.now();
                    if (captchaInput) captchaInput.value = '';
                } else {
                    showToast('❌ ' + data.message, 'error');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('❌ Lỗi kết nối server. Vui lòng thử lại!', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // ===================================================================
    // GOOGLE OAUTH - Sign in with Google
    // ===================================================================
    const googleSignInBtn = document.getElementById('google-signin-btn');

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }

    async function handleGoogleSignIn() {
        try {
            // Sử dụng Google Identity Services (GIS)
            // Đọc GOOGLE_CLIENT_ID từ window (được inject từ login.ejs)
            const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID;

            if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-') || GOOGLE_CLIENT_ID === 'undefined') {
                showToast('❌ Google OAuth chưa được cấu hình. Vui lòng cấu hình GOOGLE_CLIENT_ID trong .env', 'error');
                return;
            }

            // Check if google object is loaded
            if (typeof google === 'undefined') {
                showToast('❌ Google SDK chưa được tải. Vui lòng thử lại sau!', 'error');
                return;
            }

            // Initialize Google Sign-In
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback
            });

            // Prompt sign-in
            google.accounts.id.prompt();
        } catch (error) {
            console.error('Google Sign-In error:', error);
            showToast('❌ Lỗi khi đăng nhập Google: ' + error.message, 'error');
        }
    }

    async function handleGoogleCallback(response) {
        // response.credential chứa JWT token từ Google
        const idToken = response.credential;

        try {
            // Gửi token đến backend để verify
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: idToken
                })
            });

            const data = await res.json();

            if (data.success) {
                showToast('✅ Đăng nhập Google thành công!', 'success');
                
                setTimeout(() => {
                    window.location.href = data.redirectUrl || '/';
                }, 500);
            } else {
                showToast('❌ ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            showToast('❌ Lỗi khi xác thực Google', 'error');
        }
    }

    // ===================================================================
    // HELPER - Toast notification
    // ===================================================================
    function showToast(message, type = 'info') {
        // Tạo toast element
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        // Auto remove after 3s
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ===================================================================
    // ALTERNATIVE: Google One Tap (tự động hiển thị)
    // ===================================================================
    // Uncomment để bật Google One Tap
    /*
    window.onload = function() {
        google.accounts.id.initialize({
            client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
            callback: handleGoogleCallback
        });
        google.accounts.id.prompt(); // Auto-show One Tap
    };
    */
});
