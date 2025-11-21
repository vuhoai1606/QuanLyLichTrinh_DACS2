// login.js - Xử lý đăng nhập
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const usernameError = document.getElementById('username-error');
  const passwordError = document.getElementById('password-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Xóa thông báo lỗi cũ
    usernameError.textContent = '';
    passwordError.textContent = '';
    
    // Lấy dữ liệu từ form
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Validation đơn giản
    if (!username) {
      usernameError.textContent = 'Vui lòng nhập tên đăng nhập!';
      return;
    }
    if (password.length < 6) {
      passwordError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
      return;
    }
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
    
    try {
      // Gửi request đăng nhập
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, rememberMe })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Đăng nhập thành công, chuyển về trang chủ
        alert('Đăng nhập thành công!');
        window.location.href = '/';
      } else {
        // Hiển thị thông báo lỗi
        alert(data.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Lỗi:', error);
      alert('Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Đăng nhập';
    }
  });
  
  // Xóa lỗi khi focus vào input
  [loginUsername, loginPassword].forEach(input => {
    input.addEventListener('focus', () => {
      const error = input.nextElementSibling;
      if (error) error.textContent = '';
    });
  });
});
