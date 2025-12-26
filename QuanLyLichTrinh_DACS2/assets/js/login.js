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
    const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID;
    const googleSignInBtn = document.getElementById('google-signin-btn');

    // Initialize Google One Tap khi trang load
    function initializeGoogleOneTap() {
        console.log('🔍 ===== INITIALIZING GOOGLE OAUTH =====');
        console.log('1. CLIENT_ID:', GOOGLE_CLIENT_ID);
        console.log('2. google object:', typeof google);

        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-') || GOOGLE_CLIENT_ID === 'undefined' || GOOGLE_CLIENT_ID === '') {
            console.warn('⚠️ Google OAuth chưa được cấu hình');
            return;
        }

        if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
            console.warn('⚠️ Google SDK chưa sẵn sàng, thử lại sau 500ms...');
            setTimeout(initializeGoogleOneTap, 500);
            return;
        }

        try {
            console.log('✅ Khởi tạo Google Sign-In...');

            // Initialize với callback
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
                auto_select: false,
                cancel_on_tap_outside: true
            });

7            // Tạo custom button đẹp + renderButton ẩn bên dưới
            if (googleSignInBtn) {
                console.log('✅ Thiết lập custom Google button...');
                
                // Tạo container cho cả 2 buttons
                const container = document.createElement('div');
                container.style.position = 'relative';
                
                // Custom button (hiển thị)
                const customBtn = document.createElement('div');
                customBtn.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 12px 24px;
                    background: white;
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: #3c4043;
                    transition: all 0.2s;
                    font-family: 'Roboto', sans-serif;
                `;
                customBtn.innerHTML = `
                    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Đăng nhập với Google
                `;
                
                // Hover effect
                customBtn.addEventListener('mouseenter', () => {
                    customBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
                    customBtn.style.backgroundColor = '#f8f9fa';
                });
                customBtn.addEventListener('mouseleave', () => {
                    customBtn.style.boxShadow = 'none';
                    customBtn.style.backgroundColor = 'white';
                });
                
                // Hidden real Google button (để trigger OAuth flow)
                const hiddenBtn = document.createElement('div');
                hiddenBtn.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    pointer-events: none;
                    z-index: -1;
                `;
                
                // Render real button vào hidden div
                google.accounts.id.renderButton(
                    hiddenBtn,
                    { 
                        theme: 'filled_blue',
                        size: 'large',
                        text: 'signin_with',
                        width: '280'
                    }
                );
                
                // Khi click custom button → trigger click vào real button
                customBtn.onclick = function() {
                    console.log('🖱️ User clicked custom button, triggering real Google button...');
                    const realBtn = hiddenBtn.querySelector('[role="button"]');
                    if (realBtn) {
                        realBtn.click();
                    } else {
                        console.error('❌ Không tìm thấy real button');
                        showToast('❌ Lỗi khởi tạo Google button', 'error');
                    }
                };
                
                // Ghép vào container
                container.appendChild(customBtn);
                container.appendChild(hiddenBtn);
                
                // Thay thế nội dung của googleSignInBtn
                googleSignInBtn.innerHTML = '';
                googleSignInBtn.appendChild(container);
            }

            // One Tap đã bị XÓA theo yêu cầu user
            // Lý do: FedCM errors và không cần thiết khi đã có button
            console.log('ℹ️ One Tap disabled - Chỉ dùng button click');
        } catch (error) {
            console.error('❌ Error initializing Google OAuth:', error);
            console.log('💡 Fallback: Click nút Google để đăng nhập');
        }
    }

    // Gọi initialize khi DOM ready
    if (GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('your-')) {
        // Đợi Google SDK load xong
        if (typeof google !== 'undefined' && google.accounts) {
            initializeGoogleOneTap();
        } else {
            // Retry sau 500ms nếu SDK chưa load
            setTimeout(initializeGoogleOneTap, 500);
        }
    }

    async function handleGoogleCallback(response) {
        console.log('🎉 ===== GOOGLE CALLBACK TRIGGERED =====');
        console.log('Response object:', response);
        console.log('Has credential:', !!response.credential);
        
        // response.credential chứa JWT token từ Google
        const idToken = response.credential;

        if (!idToken) {
            console.error('❌ Token is null or undefined');
            console.error('Full response:', JSON.stringify(response, null, 2));
            showToast('❌ Không nhận được token từ Google', 'error');
            return;
        }

        console.log('✅ Token received. Length:', idToken.length);
        console.log('Token preview:', idToken.substring(0, 50) + '...');
        console.log('📤 Sending to backend: /api/auth/google');

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

            console.log('📥 Backend response status:', res.status);
            console.log('📥 Response OK:', res.ok);

            const data = await res.json();
            console.log('📥 Backend data:', JSON.stringify(data, null, 2));

            if (data.success) {
                console.log('✅ Login successful! Redirecting...');
                showToast('✅ Đăng nhập Google thành công!', 'success');
                
                setTimeout(() => {
                    window.location.href = data.redirectUrl || '/';
                }, 500);
            } else {
                console.error('❌ Backend returned error:', data.message);
                showToast('❌ ' + data.message, 'error');
            }
        } catch (error) {
            console.error('❌ Exception in handleGoogleCallback:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Stack:', error.stack);
            showToast('❌ Lỗi kết nối: ' + error.message, 'error');
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
            top: 80px;
            right: 20px;
            padding: 12px 20px;
            max-width: 320px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
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
});
