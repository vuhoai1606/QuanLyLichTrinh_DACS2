document.addEventListener('DOMContentLoaded', () => {
  // === 1. Nhúng header ===
  fetch('header.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('header-placeholder').innerHTML = html;
    });

  // === 2. DOM elements ===
  const form = document.getElementById('account-form');
  const enable2fa = document.getElementById('enable-2fa');
  const disable2fa = document.getElementById('disable-2fa');
  const changePwd = document.getElementById('change-password');
  const deleteAcc = document.getElementById('delete-account');
  const saveAll = document.getElementById('save-all');
  const devices = document.getElementById('devices-list');
  const newPwd = document.getElementById('new-password');

  // === 3. Devices list ===
  const deviceData = ['Chrome - Windows 10', 'Safari - iPhone 14', 'Edge - macOS'];
  deviceData.forEach(d => {
    const li = document.createElement('li');
    li.className = 'device-item';
    li.innerHTML = `${d} <button class="btn-logout">Đăng xuất</button>`;
    devices.appendChild(li);
  });

  devices.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-logout')) {
      e.target.closest('li').remove();
      alert('Thiết bị đã được đăng xuất!');
    }
  });

  // === 4. Form xử lý ===
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('✅ Thông tin cá nhân đã được lưu thành công!');
  });

  enable2fa.addEventListener('click', () => alert('🔐 2FA đã được bật!'));
  disable2fa.addEventListener('click', () => alert('⚠️ 2FA đã bị tắt!'));

  changePwd.addEventListener('click', () => {
    if (newPwd.value.trim()) {
      alert('🔑 Mật khẩu đã được thay đổi!');
      newPwd.value = '';
    } else alert('❗ Vui lòng nhập mật khẩu mới');
  });

  deleteAcc.addEventListener('click', () => {
    if (confirm('⚠️ Bạn có chắc muốn xóa tài khoản?')) {
      alert('🗑️ Tài khoản đã bị xóa.');
    }
  });

  saveAll.addEventListener('click', () => alert('💾 Tất cả thay đổi đã được lưu!'));
});
