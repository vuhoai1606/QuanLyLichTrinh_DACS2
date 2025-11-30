// assets/js/register.js - UPDATED FOR OTP FLOW
// ===================================================================
// register.js - FRONTEND với OTP verification flow
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const form = document.getElementById('register-form');
    const usernameInput = document.getElementById('register-username');
    const fullNameInput = document.getElementById('register-fullname');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const dobInput = document.getElementById('register-dob');
    const captchaInput = document.getElementById('captcha-input');

    // Error elements
    const usernameError = document.getElementById('username-error');
    const fullNameError = document.getElementById('fullname-error');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const captchaError = document.getElementById('captcha-error');

    // Captcha reload
    const captchaImage = document.getElementById('captcha-image');
    const reloadCaptcha = document.getElementById('reloadCaptcha');

    if (reloadCaptcha) {
        reloadCaptcha.addEventListener('click', () => {
            captchaImage.src = '/api/captcha?' + Date.now();
            captchaInput.value = '';
        });
    }

    // ===================================================================
    // PASSWORD VALIDATION - Real-time feedback
    // ===================================================================
    const reqLength = document.getElementById('req-length');
    const reqLetter = document.getElementById('req-letter');
    const reqNumber = document.getElementById('req-number');

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        
        // Check length
        if (password.length >= 6) {
            reqLength.style.color = '#22c55e';
            reqLength.querySelector('i').className = 'fas fa-check-circle';
        } else {
            reqLength.style.color = '#94a3b8';
            reqLength.querySelector('i').className = 'fas fa-circle';
        }

        // Check letters
        if (/[a-zA-Z]/.test(password)) {
            reqLetter.style.color = '#22c55e';
            reqLetter.querySelector('i').className = 'fas fa-check-circle';
        } else {
            reqLetter.style.color = '#94a3b8';
            reqLetter.querySelector('i').className = 'fas fa-circle';
        }

        // Check numbers
        if (/[0-9]/.test(password)) {
            reqNumber.style.color = '#22c55e';
            reqNumber.querySelector('i').className = 'fas fa-check-circle';
        } else {
            reqNumber.style.color = '#94a3b8';
            reqNumber.querySelector('i').className = 'fas fa-circle';
        }
    });

    // Clear errors on input
    [usernameInput, fullNameInput, emailInput, passwordInput, captchaInput].forEach(input => {
        input.addEventListener('input', () => {
            const errorEl = document.getElementById(input.id.replace('register-', '') + '-error');
            if (errorEl) errorEl.textContent = '';
        });
    });

    // ===================================================================
    // FORM SUBMIT - Gửi OTP qua email
    // ===================================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset errors
        usernameError.textContent = '';
        fullNameError.textContent = '';
        emailError.textContent = '';
        passwordError.textContent = '';
        captchaError.textContent = '';

        // Get values
        const username = usernameInput.value.trim();
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const dateOfBirth = dobInput.value;
        const captcha = captchaInput.value.trim();

        // Frontend validation
        let hasError = false;

        if (!username) {
            usernameError.textContent = 'Vui lòng nhập tên đăng nhập';
            hasError = true;
        }

        if (!fullName) {
            fullNameError.textContent = 'Vui lòng nhập họ tên';
            hasError = true;
        }

        if (!email) {
            emailError.textContent = 'Vui lòng nhập email';
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailError.textContent = 'Email không hợp lệ';
            hasError = true;
        }

        if (!password) {
            passwordError.textContent = 'Vui lòng nhập mật khẩu';
            hasError = true;
        } else if (password.length < 6) {
            passwordError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
            hasError = true;
        } else if (!/[a-zA-Z]/.test(password)) {
            passwordError.textContent = 'Mật khẩu phải có chữ cái';
            hasError = true;
        } else if (!/[0-9]/.test(password)) {
            passwordError.textContent = 'Mật khẩu phải có số';
            hasError = true;
        }

        if (!captcha) {
            captchaError.textContent = 'Vui lòng nhập mã xác thực';
            hasError = true;
        }

        if (hasError) return;

        // Loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi OTP...';
        submitBtn.disabled = true;

        try {
            // Gọi API initiate registration (BƯỚC 1: Gửi OTP)
            const response = await fetch('/api/register/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    fullName,
                    email,
                    password,
                    dateOfBirth,
                    captcha
                })
            });

            const data = await response.json();

            if (data.success) {
                // Lưu email vào session/localStorage để trang OTP biết
                sessionStorage.setItem('registrationEmail', email);
                sessionStorage.setItem('registrationData', JSON.stringify({
                    username,
                    fullName,
                    email,
                    password,
                    dateOfBirth
                }));

                // Chuyển đến trang nhập OTP
                alert('✅ Mã OTP đã được gửi đến email của bạn!');
                window.location.href = '/verify-otp';
            } else {
                // Hiển thị lỗi
                if (data.message.includes('Username')) {
                    usernameError.textContent = data.message;
                } else if (data.message.includes('Email')) {
                    emailError.textContent = data.message;
                } else if (data.message.includes('Captcha') || data.message.includes('captcha')) {
                    captchaError.textContent = data.message;
                    // Reload captcha
                    captchaImage.src = '/api/captcha?' + Date.now();
                    captchaInput.value = '';
                } else {
                    alert('❌ ' + data.message);
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('❌ Lỗi kết nối server. Vui lòng thử lại!');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // ===================================================================
    // EMAIL CHECK - Kiểm tra email đã tồn tại chưa
    // ===================================================================
    let emailCheckTimeout;
    emailInput.addEventListener('blur', async () => {
        clearTimeout(emailCheckTimeout);
        emailCheckTimeout = setTimeout(async () => {
            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (email && emailRegex.test(email)) {
                try {
                    const res = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
                    const data = await res.json();
                    
                    if (data.exists) {
                        emailError.textContent = "Email này đã được sử dụng!";
                    }
                } catch (err) {
                    console.warn("Không thể kiểm tra email:", err);
                }
            }
        }, 600);
    });
});
