// assets/js/register.js
// ===================================================================
// register.js - FRONTEND (CHỈ XỬ LÝ UI VÀ GỌI API)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Form + input
    const form = document.getElementById('register-form');
    const usernameInput = document.getElementById('register-username');
    const fullNameInput = document.getElementById('register-fullname');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const dobInput = document.getElementById('register-dob');

    // Error elements
    const usernameError = document.getElementById('username-error');
    const fullNameError = document.getElementById('fullname-error');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const captchaInput = document.getElementById('captcha-input');
    const captchaError = document.getElementById('captcha-error');

    // CAPTCHA CANVAS
    const captchaCanvas = document.getElementById('captchaCanvas');
    const reloadCaptcha = document.getElementById('reloadCaptcha');
    let captchaText = "";

    function generateCaptcha() {
        if (!captchaCanvas) return;
        const ctx = captchaCanvas.getContext('2d');
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        captchaText = "";
        for (let i = 0; i < 6; i++) {
            captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        ctx.clearRect(0, 0, captchaCanvas.width, captchaCanvas.height);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, captchaCanvas.width, captchaCanvas.height);

        for (let i = 0; i < captchaText.length; i++) {
            const fontSize = 28 + Math.random() * 8;
            const angle = (Math.random() - 0.5) * 0.8;
            ctx.font = `${fontSize}px 'Courier New', monospace`;
            ctx.fillStyle = ["#1e40af", "#dc2626", "#7c3aed", "#0891b2"][Math.floor(Math.random() * 4)];
            ctx.save();
            ctx.translate(20 + i * 30, 40);
            ctx.rotate(angle);
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }

        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
            ctx.lineTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
            ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.3})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    if (reloadCaptcha) reloadCaptcha.addEventListener('click', generateCaptcha);
    generateCaptcha();

    // Real-time email check
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
                        emailInput.classList.add('error-input');
                    }
                } catch (err) {
                    console.warn("Không thể kiểm tra email:", err);
                }
            }
        }, 600);
    });

    // Xóa lỗi khi nhập lại
    [usernameInput, fullNameInput, emailInput, passwordInput, captchaInput].forEach(input => {
        input.addEventListener('input', () => {
            const errorEl = input.parentElement.querySelector('.error') ||
                            document.getElementById(input.id.replace('register-', '') + '-error') ||
                            captchaError;
            if (errorEl) errorEl.textContent = '';
            input.classList.remove('error-input');
        });
    });

    // Submit form
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset lỗi
        usernameError.textContent = '';
        fullNameError.textContent = '';
        emailError.textContent = '';
        passwordError.textContent = '';
        if (captchaError) captchaError.textContent = '';

        const username = usernameInput.value.trim();
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const dob = dobInput.value;

        let hasError = false;

        // Basic validation
        if (!username) { usernameError.textContent = 'Vui lòng nhập tên đăng nhập'; hasError = true; }
        if (!fullName || fullName.length < 2) { fullNameError.textContent = 'Họ tên phải có ít nhất 2 ký tự'; hasError = true; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) { emailError.textContent = 'Email không hợp lệ'; hasError = true; }
        if (!password || password.length < 6) { passwordError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự'; hasError = true; }
        if (captchaInput && captchaInput.value.trim() !== captchaText) {
            if (captchaError) captchaError.textContent = 'Mã CAPTCHA không đúng!';
            generateCaptcha();
            captchaInput.value = '';
            hasError = true;
        }

        if (hasError) return;

        // Loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo tài khoản...';

        try {
            // reCAPTCHA token (nếu có)
            let bodyData = { username, fullName, email, password, dateOfBirth: dob };
            if (typeof grecaptcha !== "undefined") {
                const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'register' });
                bodyData['g-recaptcha-response'] = token;
            }

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                passwordError.textContent = data.message || 'Đăng ký thất bại. Vui lòng thử lại.';
                generateCaptcha();
                if (captchaInput) captchaInput.value = '';
                return;
            }

            // Thành công
            alert('Đăng ký thành công!\n\nVui lòng kiểm tra email để xác thực tài khoản.');
            form.reset();
            generateCaptcha();
            if (captchaInput) captchaInput.value = '';
            setTimeout(() => { window.location.href = '/login'; }, 1000);

        } catch (err) {
            console.error(err);
            passwordError.textContent = 'Có lỗi xảy ra. Vui lòng thử lại.';
            generateCaptcha();
            if (captchaInput) captchaInput.value = '';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});

// ===================================================================
// NOTES CHI TIẾT (DÀNH CHO DEV & BẢN GIAO VIỆC)
// ===================================================================
/*
  1. Backend routes cần có:
     • POST   /api/register          → xử lý tạo user + gửi email xác thực
     • GET    /api/check-email       → kiểm tra email đã tồn tại chưa (trả { exists: true/false })

  2. Các tính năng đã implement:
     • Validation client-side đầy đủ (username, fullname, email format, password length)
     • Real-time email existence check (debounce 600ms)
     • CAPTCHA canvas tự sinh + reload
     • Tự động clear error khi người dùng nhập lại
     • Loading state + disable button khi submit
     • Hỗ trợ Google reCAPTCHA v3 (nếu có biến grecaptcha và SITE_KEY)
     • Alert + redirect về /login sau khi đăng ký thành công

  3. Các phần có thể mở rộng sau này:
     • Thêm password strength meter (zxcvbn)
     • Validate username không chứa ký tự đặc biệt
     • Hỗ trợ xác thực email ngay lập tức (verify link)
     • Hỗ trợ đăng ký bằng Google/Facebook (OAuth)
     • Rate limiting chống spam đăng ký

  4. Các element HTML bắt buộc phải có (nếu thiếu sẽ không hoạt động):
     • <form id="register-form">...</form>
     • Input: register-username, register-fullname, register-email, register-password, register-dob
     • Span error: username-error, fullname-error, email-error, password-error
     • CAPTCHA (tùy chọn): 
         <canvas id="captchaCanvas" width="200" height="60"></canvas>
         <input id="captcha-input" ...>
         <span id="captcha-error"></span>
         <button id="reloadCaptcha">⟳</button>

  5. Biến môi trường / config cần thay:
     • grecaptcha.execute('YOUR_SITE_KEY', ...) → thay YOUR_SITE_KEY bằng site key thật

  6. Error handling:
     • Tất cả lỗi từ server sẽ hiện ở passwordError (để UX đơn giản)
     • Có thể tách riêng error field nếu backend trả chi tiết hơn

  7. Security notes:
     • Password được gửi plaintext → bắt buộc backend phải hash bằng bcrypt/argon2
     • CAPTCHA canvas chỉ là anti-bot nhẹ, nên kết hợp reCAPTCHA v3 hoặc hCaptcha
     • Nên thêm rate limit ở backend (max 5 lần đăng ký/phút/IP)

  8. Test case nên kiểm tra:
     ✓ Đăng ký thành công → redirect login
     ✓ Email đã tồn tại → thông báo đỏ
     ✓ CAPTCHA sai → thông báo + reload
     ✓ Để trống trường → lỗi tương ứng
     ✓ Nhập lại trường → lỗi tự mất
*/