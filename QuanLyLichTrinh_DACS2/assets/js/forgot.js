// assets/js/forgot.js
// Flow: Username + Email -> OTP -> Reset Password

let currentStep = 1;
let userEmail = '';
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Forgot password page loaded');
    try {
        setupStep1(); // Verify username & email
        console.log('Step 1 setup complete');
    } catch (error) {
        console.error('Error setting up step 1:', error);
    }
    
    try {
        setupStep2(); // OTP verification
        console.log('Step 2 setup complete');
    } catch (error) {
        console.error('Error setting up step 2:', error);
    }
    
    try {
        setupStep3(); // Reset password
        console.log('Step 3 setup complete');
    } catch (error) {
        console.error('Error setting up step 3:', error);
    }
});

// ========== BƯỚC 1: Nhập username và email ==========
function setupStep1() {
    const form = document.getElementById('verify-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const usernameError = document.querySelector('#step-1 .error-message');
    const emailError = document.querySelector('#step-1 .email-error');
    
    console.log('Setup Step 1 elements:', {
        form: !!form,
        usernameInput: !!usernameInput,
        emailInput: !!emailInput,
        usernameError: !!usernameError,
        emailError: !!emailError
    });
    
    if (!form || !usernameInput || !emailInput) {
        console.error('Missing required elements for Step 1');
        return;
    }
    
    // Clear error on input
    usernameInput.addEventListener('input', () => {
        usernameInput.style.borderColor = '';
        if (usernameError) usernameError.textContent = '';
    });
    
    emailInput.addEventListener('input', () => {
        emailInput.style.borderColor = '';
        if (emailError) emailError.textContent = '';
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Form submitted - Step 1');
        
        // Clear previous errors
        if (usernameError) usernameError.textContent = '';
        if (emailError) emailError.textContent = '';
        usernameInput.style.borderColor = '';
        emailInput.style.borderColor = '';
        
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        
        // Validation
        let hasError = false;
        
        if (!username) {
            showNotification('Vui lòng nhập tên đăng nhập', 'error');
            if (usernameError) usernameError.textContent = 'Tên đăng nhập không được để trống';
            usernameInput.style.borderColor = '#ef4444';
            usernameInput.focus();
            hasError = true;
        }
        
        if (!email) {
            showNotification('Vui lòng nhập email', 'error');
            if (emailError) emailError.textContent = 'Email không được để trống';
            emailInput.style.borderColor = '#ef4444';
            if (!hasError) emailInput.focus();
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showNotification('Email không hợp lệ', 'error');
            if (emailError) emailError.textContent = 'Định dạng email không đúng';
            emailInput.style.borderColor = '#ef4444';
            if (!hasError) emailInput.focus();
            hasError = true;
        }
        
        if (hasError) return;
        
        console.log('Validation passed, sending request...');
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        submitBtn.disabled = true;
        
        try {
            console.log('Calling API: /api/auth/forgot-password/verify');
            const response = await fetch('/api/auth/forgot-password/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email })
            });
            
            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);
            
            if (response.ok && result.success) {
                userEmail = email;
                showNotification('Mã OTP đã được gửi đến email của bạn!', 'success');
                setTimeout(() => goToStep(2), 1000);
            } else {
                const msg = result.message || 'Tên đăng nhập hoặc email không đúng';
                showNotification(msg, 'error');
                
                // Hiển thị lỗi chi tiết
                if (msg.includes('Tên đăng nhập') || msg.includes('username')) {
                    if (usernameError) usernameError.textContent = msg;
                    usernameInput.style.borderColor = '#ef4444';
                    usernameInput.focus();
                } else if (msg.includes('Email') || msg.includes('email')) {
                    if (emailError) emailError.textContent = msg;
                    emailInput.style.borderColor = '#ef4444';
                    emailInput.focus();
                } else {
                    // Lỗi chung - hiển thị ở cả 2
                    if (usernameError) usernameError.textContent = msg;
                    usernameInput.style.borderColor = '#ef4444';
                    emailInput.style.borderColor = '#ef4444';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Không thể kết nối đến máy chủ', 'error');
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
        
        return false; // Prevent form submission
    });
}

// ========== BƯỚC 2: Xác thực OTP ==========
// Countdown timer function (global scope)
function startCountdown() {
    let timeLeft = 300; // 5 minutes
    const countdownEl = document.getElementById('countdown');
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownEl.textContent = '0:00';
            countdownEl.style.color = '#ef4444';
            showNotification('Mã OTP đã hết hạn. Vui lòng gửi lại!', 'error');
        }
    }, 1000);
}

function setupStep2() {
    const form = document.getElementById('otp-form');
    const otpInputs = document.querySelectorAll('.otp-input');
    const resendBtn = document.getElementById('resend-otp');
    const backBtn = document.getElementById('back-to-step1');
    
    console.log('Setup Step 2 elements:', {
        form: !!form,
        otpInputs: otpInputs.length,
        resendBtn: !!resendBtn,
        backBtn: !!backBtn
    });
    
    if (!form) {
        console.error('OTP form not found');
        return;
    }
    
    // Back to step 1
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (countdownInterval) clearInterval(countdownInterval);
            goToStep(1);
        });
    }
    
    // OTP input handling
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            
            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            
            // Auto submit when all filled
            if (index === otpInputs.length - 1 && e.target.value) {
                const allFilled = Array.from(otpInputs).every(inp => inp.value);
                if (allFilled) {
                    form.querySelector('button[type="submit"]').focus();
                }
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        });
        
        // Paste support
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            pastedData.split('').forEach((char, i) => {
                if (otpInputs[i]) otpInputs[i].value = char;
            });
            if (pastedData.length === 6) otpInputs[5].focus();
        });
    });
    
    // Resend OTP
    resendBtn.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        
        resendBtn.disabled = true;
        resendBtn.textContent = 'Đang gửi...';
        
        try {
            const response = await fetch('/api/auth/forgot-password/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                showNotification('Mã OTP mới đã được gửi!', 'success');
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();
                startCountdown();
            }
        } catch (error) {
            showNotification('Không thể gửi lại mã OTP', 'error');
        } finally {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Gửi lại mã OTP';
        }
    });
    
    // Submit OTP
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        
        if (otp.length !== 6) {
            showNotification('Vui lòng nhập đầy đủ 6 chữ số', 'error');
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác minh...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/auth/forgot-password/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                if (countdownInterval) clearInterval(countdownInterval);
                showNotification('Xác thực thành công!', 'success');
                setTimeout(() => goToStep(3), 1000);
            } else {
                const msg = result.message || 'Mã OTP không đúng';
                showNotification(msg, 'error');
                
                // Làm nổi bật ô OTP có lỗi
                otpInputs.forEach(input => {
                    input.style.borderColor = '#ef4444';
                    setTimeout(() => {
                        input.style.borderColor = '';
                    }, 2000);
                });
                
                // Clear OTP nếu sai
                if (msg.includes('không đúng') || msg.includes('hết hạn')) {
                    otpInputs.forEach(input => input.value = '');
                    otpInputs[0].focus();
                }
            }
        } catch (error) {
            showNotification('Không thể xác minh OTP', 'error');
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    });
}

// ========== BƯỚC 3: Đổi mật khẩu ==========
function setupStep3() {
    const form = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const matchMessage = document.getElementById('password-match');
    const passwordError = document.querySelector('#step-3 .error-message');
    
    console.log('Setup Step 3 elements:', {
        form: !!form,
        newPasswordInput: !!newPasswordInput,
        confirmPasswordInput: !!confirmPasswordInput,
        matchMessage: !!matchMessage,
        passwordError: !!passwordError
    });
    
    if (!form || !newPasswordInput || !confirmPasswordInput) {
        console.error('Missing required elements for Step 3');
        return;
    }
    
    // Clear error on input
    newPasswordInput.addEventListener('input', () => {
        newPasswordInput.style.borderColor = '';
        if (passwordError) passwordError.textContent = '';
    });
    
    confirmPasswordInput.addEventListener('input', () => {
        confirmPasswordInput.style.borderColor = '';
        if (passwordError) passwordError.textContent = '';
    });
    
    // Password match validation
    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value === '') {
            matchMessage.style.display = 'none';
            return;
        }
        
        matchMessage.style.display = 'block';
        if (confirmPasswordInput.value === newPasswordInput.value) {
            matchMessage.textContent = 'Mật khẩu trùng khớp';
            matchMessage.style.color = '#22c55e';
        } else {
            matchMessage.textContent = 'Mật khẩu không trùng khớp';
            matchMessage.style.color = '#ef4444';
        }
    });
    
    newPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value !== '') {
            confirmPasswordInput.dispatchEvent(new Event('input'));
        }
    });
    
    // Submit reset password
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const passwordError = document.querySelector('#step-3 .error-message');
        
        // Clear previous errors
        if (passwordError) passwordError.textContent = '';
        newPasswordInput.style.borderColor = '';
        confirmPasswordInput.style.borderColor = '';
        
        // Validation
        if (!newPassword) {
            const msg = 'Vui lòng nhập mật khẩu mới';
            showNotification(msg, 'error');
            if (passwordError) passwordError.textContent = msg;
            newPasswordInput.style.borderColor = '#ef4444';
            newPasswordInput.focus();
            return;
        }
        
        if (newPassword.length < 6) {
            const msg = 'Mật khẩu phải có ít nhất 6 ký tự';
            showNotification(msg, 'error');
            if (passwordError) passwordError.textContent = msg;
            newPasswordInput.style.borderColor = '#ef4444';
            newPasswordInput.focus();
            return;
        }
        
        if (!/\d/.test(newPassword)) {
            const msg = 'Mật khẩu phải có ít nhất 1 chữ số';
            showNotification(msg, 'error');
            if (passwordError) passwordError.textContent = msg;
            newPasswordInput.style.borderColor = '#ef4444';
            newPasswordInput.focus();
            return;
        }
        
        if (!/[a-zA-Z]/.test(newPassword)) {
            const msg = 'Mật khẩu phải có ít nhất 1 chữ cái';
            showNotification(msg, 'error');
            if (passwordError) passwordError.textContent = msg;
            newPasswordInput.style.borderColor = '#ef4444';
            newPasswordInput.focus();
            return;
        }
        
        if (!confirmPassword) {
            const msg = 'Vui lòng xác nhận mật khẩu';
            showNotification(msg, 'error');
            if (passwordError) passwordError.textContent = msg;
            confirmPasswordInput.style.borderColor = '#ef4444';
            confirmPasswordInput.focus();
            return;
        }
        
        if (newPassword !== confirmPassword) {
            const msg = 'Mật khẩu xác nhận không khớp';
            showNotification(msg, 'error');
            if (passwordError) passwordError.textContent = msg;
            confirmPasswordInput.style.borderColor = '#ef4444';
            confirmPasswordInput.focus();
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đổi mật khẩu...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/auth/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                showNotification('Đổi mật khẩu thành công! Đang chuyển đến trang đăng nhập...', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                showNotification(result.message || 'Không thể đổi mật khẩu', 'error');
            }
        } catch (error) {
            showNotification('Không thể kết nối đến máy chủ', 'error');
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    });
}

// ========== HELPER FUNCTIONS ==========
function goToStep(step) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    currentStep = step;
    
    // Setup countdown when entering step 2
    if (step === 2) {
        const emailDisplay = document.getElementById('email-display');
        emailDisplay.textContent = userEmail;
        startCountdown();
        document.querySelector('.otp-input').focus();
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