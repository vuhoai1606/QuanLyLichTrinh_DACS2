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
    // USERNAME VALIDATION - Real-time feedback
    // ===================================================================
    const reqUsernameLength = document.getElementById('req-username-length');
    const reqUsernameValid = document.getElementById('req-username-valid');
    const reqUsernameNoSpace = document.getElementById('req-username-no-space');

    usernameInput.addEventListener('input', () => {
        const username = usernameInput.value;
        
        // Check length (at least 6 characters)
        if (username.length >= 6) {
            reqUsernameLength.style.color = '#22c55e';
            reqUsernameLength.querySelector('i').className = 'fas fa-check-circle';
        } else {
            reqUsernameLength.style.color = '#94a3b8';
            reqUsernameLength.querySelector('i').className = 'fas fa-circle';
        }

        // Check valid characters (only letters, numbers, underscore)
        if (/^[a-zA-Z0-9_]*$/.test(username)) {
            reqUsernameValid.style.color = '#22c55e';
            reqUsernameValid.querySelector('i').className = 'fas fa-check-circle';
        } else {
            reqUsernameValid.style.color = '#94a3b8';
            reqUsernameValid.querySelector('i').className = 'fas fa-circle';
        }

        // Check no spaces
        if (username.length > 0 && !/\s/.test(username)) {
            reqUsernameNoSpace.style.color = '#22c55e';
            reqUsernameNoSpace.querySelector('i').className = 'fas fa-check-circle';
        } else {
            reqUsernameNoSpace.style.color = '#94a3b8';
            reqUsernameNoSpace.querySelector('i').className = 'fas fa-circle';
        }
    });

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
        const genderInput = document.querySelector('input[name="gender"]:checked');
        const gender = genderInput ? genderInput.value : '';
        const phoneInput = document.getElementById('register-phone');
        const phoneNumber = phoneInput ? phoneInput.value.trim() : '';

        // Frontend validation
        let hasError = false;

        if (!username) {
            usernameError.textContent = 'Vui lòng nhập tên đăng nhập';
            hasError = true;
        } else if (username.length < 6) {
            usernameError.textContent = 'Tên đăng nhập phải có ít nhất 6 ký tự';
            hasError = true;
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            usernameError.textContent = 'Tên đăng nhập chỉ chứa chữ, số và gạch dưới';
            hasError = true;
        } else if (/\s/.test(username)) {
            usernameError.textContent = 'Tên đăng nhập không được chứa khoảng trắng';
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

        // Validate phone number if provided (optional but must be 10 digits if entered)
        if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
            const phoneError = document.getElementById('phone-error');
            if (phoneError) {
                phoneError.textContent = 'Số điện thoại phải đúng 10 chữ số';
                hasError = true;
            }
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
                    gender,
                    phoneNumber,
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
                    dateOfBirth,
                    gender,
                    phoneNumber
                }));

                // Chuyển đến trang nhập OTP
                alert('✅ Mã OTP đã được gửi đến email của bạn!');
                window.location.href = '/verify-otp';
            } else {
                // Hiển thị lỗi chi tiết
                const msg = data.message || 'Có lỗi xảy ra';
                
                if (msg.includes('Tên đăng nhập') || msg.includes('username')) {
                    usernameError.textContent = msg;
                } else if (msg.includes('Mật khẩu') || msg.includes('password')) {
                    passwordError.textContent = msg;
                } else if (msg.includes('Email') || msg.includes('email')) {
                    emailError.textContent = msg;
                } else if (msg.includes('Số điện thoại') || msg.includes('phone')) {
                    const phoneError = document.getElementById('phone-error');
                    if (phoneError) phoneError.textContent = msg;
                } else if (msg.includes('Họ tên') || msg.includes('fullname')) {
                    fullNameError.textContent = msg;
                } else if (msg.includes('Captcha') || msg.includes('captcha') || msg.includes('Mã xác thực')) {
                    captchaError.textContent = msg;
                    // Reload captcha
                    captchaImage.src = '/api/captcha?' + Date.now();
                    captchaInput.value = '';
                } else {
                    // Lỗi chung - hiển thị ở captcha error (cuối form)
                    captchaError.textContent = msg;
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