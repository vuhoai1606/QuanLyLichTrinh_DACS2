// assets/js/profile.js
// Profile Page - New Implementation with Settings Layout

document.addEventListener('DOMContentLoaded', () => {
    setupProfileHandlers();
});

function setupProfileHandlers() {
    // Password match validation
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const matchMessage = document.getElementById('password-match-message');

    if (confirmPassword && newPassword && matchMessage) {
        confirmPassword.addEventListener('input', () => {
            if (confirmPassword.value === '') {
                matchMessage.style.display = 'none';
                return;
            }
            
            matchMessage.style.display = 'block';
            if (confirmPassword.value === newPassword.value) {
                matchMessage.textContent = 'Mật khẩu trùng khớp';
                matchMessage.style.color = '#22c55e';
            } else {
                matchMessage.textContent = 'Mật khẩu không trùng khớp';
                matchMessage.style.color = '#ef4444';
            }
        });

        newPassword.addEventListener('input', () => {
            if (confirmPassword.value !== '') {
                confirmPassword.dispatchEvent(new Event('input'));
            }
        });
    }

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
    
    const fullName = document.getElementById('fullName').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const genderInput = document.querySelector('input[name="gender"]:checked');
    const gender = genderInput ? genderInput.value : '';
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    
    if (!fullName) {
        showNotification('Vui lòng điền họ tên', 'error');
        return;
    }

    // Validate phone number if provided (chỉ 10 số)
    if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
        showNotification('Số điện thoại không hợp lệ (phải đúng 10 số)', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);
    if (gender) formData.append('gender', gender);
    if (phoneNumber) formData.append('phoneNumber', phoneNumber);
    
    // Avatar upload
    const avatarFile = document.getElementById('avatar-upload')?.files[0];
    if (avatarFile) {
        // Validate file size (5MB max)
        if (avatarFile.size > 5 * 1024 * 1024) {
            showNotification('Kích thước ảnh không được vượt quá 5MB', 'error');
            return;
        }
        // Validate file type
        if (!avatarFile.type.startsWith('image/')) {
            showNotification('Chỉ chấp nhận file ảnh', 'error');
            return;
        }
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
            
            // Cập nhật avatar preview nếu có
            if (result.user.avatar_url) {
                const avatarPreview = document.getElementById('avatar-preview');
                if (avatarPreview) {
                    avatarPreview.src = result.user.avatar_url;
                }
            }
            
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
        // Bước 1: Yêu cầu gửi OTP
        showNotification('Đang gửi mã OTP...', 'info');
        
        const requestResponse = await fetch('/api/profile/change-password/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword })
        });

        const requestResult = await requestResponse.json();
        
        if (!requestResponse.ok || !requestResult.success) {
            showNotification(requestResult.message || 'Không thể gửi mã OTP', 'error');
            return;
        }

        showNotification('Mã OTP đã được gửi đến email của bạn!', 'success');

        // Bước 2: Hiển thị modal nhập OTP
        const otp = await promptOTP();
        
        if (!otp) {
            showNotification('Đã hủy đổi mật khẩu', 'info');
            return;
        }

        // Bước 3: Xác minh OTP và đổi mật khẩu
        showNotification('Đang xác minh OTP...', 'info');
        
        const verifyResponse = await fetch('/api/profile/change-password/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp, newPassword })
        });

        const verifyResult = await verifyResponse.json();
        
        if (verifyResponse.ok && verifyResult.success) {
            showNotification('Đổi mật khẩu thành công!', 'success');
            document.getElementById('password-form').reset();
            document.getElementById('password-match-message').style.display = 'none';
        } else {
            showNotification(verifyResult.message || 'Mã OTP không đúng hoặc đã hết hạn', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Không thể đổi mật khẩu', 'error');
    }
}

// Hiển thị modal nhập OTP với giao diện đẹp (6 ô riêng biệt)
function promptOTP() {
    return new Promise((resolve) => {
        // Tạo modal OTP
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s ease;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 64px; margin-bottom: 15px;">🔐</div>
                    <h2 style="margin: 0 0 10px 0; color: #333; font-size: 28px;">Xác thực OTP</h2>
                    <p style="color: #666; font-size: 14px; margin: 0;">
                        Mã OTP đã được gửi đến email của bạn
                    </p>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <div id="otp-input-group" style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
                        <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" style="width: 60px; height: 70px; font-size: 28px; text-align: center; border: 2px solid #ddd; border-radius: 12px; transition: all 0.3s; font-weight: 600;" />
                        <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" style="width: 60px; height: 70px; font-size: 28px; text-align: center; border: 2px solid #ddd; border-radius: 12px; transition: all 0.3s; font-weight: 600;" />
                        <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" style="width: 60px; height: 70px; font-size: 28px; text-align: center; border: 2px solid #ddd; border-radius: 12px; transition: all 0.3s; font-weight: 600;" />
                        <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" style="width: 60px; height: 70px; font-size: 28px; text-align: center; border: 2px solid #ddd; border-radius: 12px; transition: all 0.3s; font-weight: 600;" />
                        <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" style="width: 60px; height: 70px; font-size: 28px; text-align: center; border: 2px solid #ddd; border-radius: 12px; transition: all 0.3s; font-weight: 600;" />
                        <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" style="width: 60px; height: 70px; font-size: 28px; text-align: center; border: 2px solid #ddd; border-radius: 12px; transition: all 0.3s; font-weight: 600;" />
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 15px;">
                        <button id="resend-otp" style="background: none; border: none; color: #667eea; cursor: pointer; font-size: 14px; text-decoration: underline;">
                            <i class="fas fa-redo"></i> Gửi lại mã OTP
                        </button>
                    </div>
                    
                    <div style="text-align: center; color: #666; font-size: 13px;">
                        Mã OTP hết hạn sau: <span id="countdown" style="color: #667eea; font-weight: 600;">5:00</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="otp-cancel" style="flex: 1; padding: 15px; border: 2px solid #d1d5db; background: white; color: #374151; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button id="otp-confirm" style="flex: 1; padding: 15px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                        <i class="fas fa-check"></i> Xác nhận
                    </button>
                </div>
            </div>
        `;
        
        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .otp-digit:focus {
                outline: none !important;
                border-color: #667eea !important;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
            }
            #otp-cancel:hover {
                background: #f3f4f6 !important;
            }
            #otp-confirm:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            #resend-otp:hover {
                color: #764ba2 !important;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(modal);
        
        const otpInputs = modal.querySelectorAll('.otp-digit');
        const confirmBtn = document.getElementById('otp-confirm');
        const cancelBtn = document.getElementById('otp-cancel');
        const resendBtn = document.getElementById('resend-otp');
        const countdownEl = document.getElementById('countdown');
        
        // Focus first input
        otpInputs[0].focus();
        
        // Countdown timer (5 minutes)
        let timeLeft = 300; // 5 minutes in seconds
        const countdownInterval = setInterval(() => {
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
        
        // OTP input handling - auto focus next
        otpInputs.forEach((input, index) => {
            // Only allow numbers
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
                
                // Auto focus next input
                if (e.target.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                
                // Auto submit when all filled
                if (index === otpInputs.length - 1 && e.target.value) {
                    const allFilled = Array.from(otpInputs).every(inp => inp.value);
                    if (allFilled) {
                        confirmBtn.focus();
                    }
                }
            });
            
            // Backspace to previous input
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
                
                // Enter to confirm
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });
            
            // Paste handling
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                pastedData.split('').forEach((char, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].value = char;
                    }
                });
                if (pastedData.length === 6) {
                    otpInputs[5].focus();
                }
            });
        });
        
        // Resend OTP
        resendBtn.addEventListener('click', () => {
            showNotification('Đang gửi lại mã OTP...', 'info');
            // Reset countdown
            timeLeft = 300;
            // Clear inputs
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        });
        
        // Confirm button
        confirmBtn.addEventListener('click', () => {
            const otp = Array.from(otpInputs).map(input => input.value).join('');
            if (otp.length !== 6) {
                showNotification('Vui lòng nhập đầy đủ 6 chữ số', 'error');
                return;
            }
            clearInterval(countdownInterval);
            document.body.removeChild(modal);
            document.head.removeChild(style);
            resolve(otp);
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', () => {
            clearInterval(countdownInterval);
            document.body.removeChild(modal);
            document.head.removeChild(style);
            resolve(null);
        });
        
        // ESC để hủy
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', escHandler);
                resolve(null);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
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
