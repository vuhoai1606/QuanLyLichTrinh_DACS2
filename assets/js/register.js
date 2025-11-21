// register.js - Xử lý đăng ký
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const registerUsername = document.getElementById('register-username');
  const registerFullname = document.getElementById('register-fullname');
  const registerEmail = document.getElementById('register-email');
  const registerPassword = document.getElementById('register-password');
  const registerDob = document.getElementById('register-dob');
  const usernameError = document.getElementById('username-error');
  const fullnameError = document.getElementById('fullname-error');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Xóa thông báo lỗi cũ
    usernameError.textContent = '';
    fullnameError.textContent = '';
    emailError.textContent = '';
    passwordError.textContent = '';

    // Lấy dữ liệu từ form
    const username = registerUsername.value.trim();
    const fullName = registerFullname.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    const dateOfBirth = registerDob.value;
    
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username) {
      usernameError.textContent = 'Vui lòng nhập tên đăng nhập!';
      return;
    }
    if (!fullName) {
      fullnameError.textContent = 'Vui lòng nhập họ và tên!';
      return;
    }
    if (!emailRegex.test(email)) {
      emailError.textContent = 'Vui lòng nhập email hợp lệ!';
      return;
    }
    if (password.length < 6) {
      passwordError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
      return;
    }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';

    try {
      // Gửi request đăng ký
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          fullName, 
          email, 
          password,
          dateOfBirth: dateOfBirth || null
        })
      });

      const data = await response.json();

      if (data.success) {
        // Đăng ký thành công, chuyển về trang chủ
        alert('Đăng ký thành công!');
        window.location.href = '/';
      } else {
        // Hiển thị thông báo lỗi
        alert(data.message || 'Đăng ký thất bại');
      }
    } catch (error) {
      console.error('Lỗi:', error);
      alert('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Đăng ký';
    }
  });

  // Xóa lỗi khi focus vào input
  [registerUsername, registerFullname, registerEmail, registerPassword].forEach(input => {
    input.addEventListener('focus', () => {
      const error = input.nextElementSibling;
      if (error && error.classList.contains('error')) {
        error.textContent = '';
      }
    });
  });
});

