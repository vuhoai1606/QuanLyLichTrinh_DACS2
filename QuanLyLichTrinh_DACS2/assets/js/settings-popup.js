// Settings Popup Functionality - PHIÊN BẢN HOÀN THIỆN 2025 VỚI 2FA FULL

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupSettingsListeners();
});

let is2FAEnabled = false; // Trạng thái hiện tại từ backend

// Show settings popup
function showSettingsPopup() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    loadSettings(); // Reload current settings
  }
}

// Close settings popup
function closeSettingsPopup() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease-in';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.animation = '';
    }, 200);
  }
}

// Close 2FA modal
function close2FAModal() {
  document.getElementById('2fa-modal').style.display = 'none';
}

// Setup event listeners
function setupSettingsListeners() {
  // Theme radio buttons
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  });

  // Language dropdown
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      localStorage.setItem('language', e.target.value);
      showNotificationPopup('Ngôn ngữ đã thay đổi!', 'success');
    });
  }

  // Notifications toggle
  const notificationsToggle = document.getElementById('notifications-toggle');
  const notificationsStatus = document.getElementById('notifications-status');
  if (notificationsToggle && notificationsStatus) {
    notificationsToggle.addEventListener('change', (e) => {
      notificationsStatus.textContent = e.target.checked ? 'Bật' : 'Tắt';
    });
  }

  // 2FA Toggle
  const twoFAToggle = document.getElementById('2fa-toggle');
  if (twoFAToggle) {
    twoFAToggle.addEventListener('change', async (e) => {
      if (e.target.checked && !is2FAEnabled) {
        await showEnable2FAModal();
      } else if (!e.target.checked && is2FAEnabled) {
        showDisable2FAModal();
      }
    });
  }

  // Confirm button trong modal
  document.getElementById('2fa-confirm-btn').addEventListener('click', handle2FAConfirm);

  // Close khi click overlay
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeSettingsPopup();
      }
    });
  }

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('2fa-modal').style.display !== 'none') {
        close2FAModal();
      } else if (document.getElementById('settings-overlay').style.display !== 'none') {
        closeSettingsPopup();
      }
    }
  });
}

// Load settings từ localStorage + backend (2FA)
async function loadSettings() {
  // Theme
  const savedTheme = localStorage.getItem('theme') || 'system';
  const themeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
  if (themeRadio) themeRadio.checked = true;
  applyTheme(savedTheme);

  // Language
  const savedLanguage = localStorage.getItem('language') || 'vi';
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) languageSelect.value = savedLanguage;

  // Notifications
  const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
  const notificationsToggle = document.getElementById('notifications-toggle');
  const notificationsStatus = document.getElementById('notifications-status');
  if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;
  if (notificationsStatus) notificationsStatus.textContent = notificationsEnabled ? 'Bật' : 'Tắt';

  // 2FA - Lấy trạng thái từ backend
  try {
    const res = await fetch('/api/auth/2fa/status');
    
    // Nếu chưa đăng nhập → server trả 302/401 → res.ok = false
    if (!res.ok) {
      // Không làm gì, giữ trạng thái mặc định "Tắt"
      document.getElementById('2fa-status').textContent = 'Tắt';
      return;
    }

    const data = await res.json();
    
    if (data.success) {
      is2FAEnabled = data.enabled;
      const twoFAToggle = document.getElementById('2fa-toggle');
      const twoFAStatus = document.getElementById('2fa-status');
      if (twoFAToggle) twoFAToggle.checked = is2FAEnabled;
      if (twoFAStatus) twoFAStatus.textContent = is2FAEnabled ? 'Bật' : 'Tắt';
    } else {
      document.getElementById('2fa-status').textContent = 'Tắt';
    }
  } catch (err) {
    console.error('Lỗi load 2FA status:', err);
    document.getElementById('2fa-status').textContent = 'Tắt'; // Fallback an toàn
  }
}

// Save settings
async function saveSettings() {
  // Theme
  const selectedTheme = document.querySelector('input[name="theme"]:checked')?.value || 'system';
  localStorage.setItem('theme', selectedTheme);
  applyTheme(selectedTheme);

  // Language
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) localStorage.setItem('language', languageSelect.value);

  // Notifications
  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    localStorage.setItem('notifications', notificationsToggle.checked ? 'true' : 'false');
  }

  showNotificationPopup('Đã lưu cài đặt thành công!', 'success');
  setTimeout(closeSettingsPopup, 1000);
}

// Apply theme
function applyTheme(theme) {
  const body = document.body;
  body.setAttribute('data-theme', theme);
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.classList.toggle('dark-mode', prefersDark);
  } else {
    body.classList.toggle('dark-mode', theme === 'dark');
  }
}

// ==================== 2FA MODAL FUNCTIONS ====================

async function showEnable2FAModal() {
  const modal = document.getElementById('2fa-modal');
  const title = document.getElementById('2fa-modal-title');
  const body = document.getElementById('2fa-modal-body');
  const confirmBtn = document.getElementById('2fa-confirm-btn');

  title.textContent = 'Bật xác thực 2 bước';
  confirmBtn.textContent = 'Xác nhận mã';

  try {
    const res = await fetch('/api/auth/2fa/setup');
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Lỗi setup 2FA');

    body.innerHTML = `
      <p>Quét mã QR bằng ứng dụng xác thực (Google Authenticator, Authy...)</p>
      <div style="text-align:center; margin:20px 0;">
        <img src="${data.qrCode}" alt="QR Code" style="width:200px; height:200px; border-radius:12px;">
      </div>
      <p>Hoặc nhập mã thủ công:</p>
      <code style="background:#f3f4f6; padding:8px 12px; border-radius:8px; display:block; text-align:center; font-family:monospace;">
        ${data.secret}
      </code>
      <div style="margin-top:20px;">
        <label>Nhập mã xác thực (6 chữ số):</label>
        <input type="text" id="2fa-code-input" maxlength="6" placeholder="123456" style="width:100%; padding:10px; margin-top:8px; border-radius:8px; border:1px solid #ddd; text-align:center; font-size:18px;">
      </div>
    `;

    modal.style.display = 'flex';
  } catch (err) {
    showNotificationPopup(err.message || 'Không thể bật 2FA', 'error');
    document.getElementById('2fa-toggle').checked = is2FAEnabled;
  }
}

function showDisable2FAModal() {
  const modal = document.getElementById('2fa-modal');
  const title = document.getElementById('2fa-modal-title');
  const body = document.getElementById('2fa-modal-body');
  const confirmBtn = document.getElementById('2fa-confirm-btn');

  title.textContent = 'Tắt xác thực 2 bước';
  confirmBtn.textContent = 'Xác nhận tắt';

  body.innerHTML = `
    <p style="color:#ef4444;">Cảnh báo: Tắt 2FA sẽ giảm bảo mật tài khoản!</p>
    <p>Vui lòng nhập mã xác thực hiện tại để xác nhận:</p>
    <input type="text" id="2fa-code-input" maxlength="6" placeholder="123456" style="width:100%; padding:10px; margin-top:12px; border-radius:8px; border:1px solid #ddd; text-align:center; font-size:18px;">
  `;

  modal.style.display = 'flex';
}

async function handle2FAConfirm() {
  const codeInput = document.getElementById('2fa-code-input');
  const code = codeInput ? codeInput.value.trim() : '';

  // 1. Kiểm tra định dạng mã cơ bản
  if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
    showNotificationPopup('Vui lòng nhập đủ 6 chữ số', 'error');
    return;
  }

  const toggle = document.getElementById('2fa-toggle');
  // Quan trọng: Kiểm tra trạng thái hiện tại của biến hệ thống, không dựa hoàn toàn vào UI toggle
  const action = toggle.checked ? 'enable' : 'disable';

  console.log(`[2FA] Đang gửi yêu cầu ${action} với mã: ${code}`);

  try {
    const res = await fetch(`/api/auth/2fa/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: code })
    });

    const data = await res.json();
    console.log("[2FA] Phản hồi từ server:", data);

    if (data.success) {
      // THÀNH CÔNG: Cập nhật trạng thái hệ thống
      is2FAEnabled = (action === 'enable');
      
      const statusText = document.getElementById('2fa-status');
      if (statusText) statusText.textContent = is2FAEnabled ? 'Bật' : 'Tắt';
      
      showNotificationPopup(data.message || 'Xác thực thành công!', 'success');
      close2FAModal();
    } else {
      // THẤT BẠI: 
      // Tuyệt đối KHÔNG gán toggle.checked = is2FAEnabled ở đây 
      // vì sẽ làm kích hoạt màn hình đỏ bảo vệ.
      
      console.error("[2FA] Lỗi xác thực:", data.message);
      showNotificationPopup(data.message || 'Mã xác thực không đúng hoặc đã hết hạn', 'error');
      
      // Reset riêng input để người dùng nhập lại thay vì đóng modal hay gạt toggle
      if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
      }
    }
  } catch (err) {
    console.error('[2FA] Lỗi kết nối:', err);
    showNotificationPopup('Không thể kết nối đến máy chủ', 'error');
  }
}

// Notification
let currentNotification = null;
function showNotificationPopup(message, type = 'info') {
  if (currentNotification && currentNotification.parentNode) {
    currentNotification.remove();
  }

  const notification = document.createElement('div');
  currentNotification = notification;

  let iconClass = 'fa-info-circle';
  let bgColor = '#3b82f6';

  if (type === 'success') { iconClass = 'fa-check-circle'; bgColor = '#22c55e'; }
  else if (type === 'error') { iconClass = 'fa-exclamation-circle'; bgColor = '#ef4444'; }

  notification.style.cssText = `
      position: fixed; 
      top: 50%; 
      left: 50%; 
      transform: translate(-50%, -50%);
      background: ${bgColor}; 
      color: white; 
      padding: 10px 20px; 
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
      z-index: 999999;
      display: flex; 
      align-items: center; 
      gap: 8px; 
      font-weight: 500;
      font-size: 14px;
      white-space: nowrap;
      animation: fadeInScale 0.4s ease-out;
  `;

  notification.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// CSS animations
if (!document.getElementById('settings-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'settings-notification-styles';
  style.textContent = `
    @keyframes fadeInScale {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes fadeOut {
      to { opacity: 0; }
    }
    .modal-overlay { 
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); 
      align-items: center; justify-content: center; z-index: 99999; 
    }
    .modal-content { 
      background: var(--card-bg, #fff); border-radius: 20px; width: 90%; max-width: 420px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
    }
    .modal-header { 
      padding: 20px; border-bottom: 1px solid var(--border, #eee); 
      display: flex; justify-content: space-between; align-items: center; 
    }
    .modal-body { padding: 24px; }
    .modal-footer { 
      padding: 20px; display: flex; justify-content: flex-end; gap: 12px; 
      border-top: 1px solid var(--border, #eee); 
    }
    .close-modal { 
      background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; 
    }
  `;
  document.head.appendChild(style);
}

// System theme listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('theme') === 'system') {
    applyTheme('system');
  }
});