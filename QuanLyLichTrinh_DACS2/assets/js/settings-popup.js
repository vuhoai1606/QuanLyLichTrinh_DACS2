// Settings Popup Functionality

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupSettingsListeners();
});

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
      // For now just save the preference
      // Translation implementation can be added later
      console.log('Language changed to:', e.target.value);
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

  // Close when clicking overlay
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeSettingsPopup();
      }
    });
  }

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('settings-overlay');
      if (overlay && overlay.style.display !== 'none') {
        closeSettingsPopup();
      }
    }
  });
}

// Load settings from localStorage
function loadSettings() {
  // Load theme
  const savedTheme = localStorage.getItem('theme') || 'system';
  const themeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
  if (themeRadio) {
    themeRadio.checked = true;
  }
  applyTheme(savedTheme);

  // Load language
  const savedLanguage = localStorage.getItem('language') || 'en';
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.value = savedLanguage;
  }

  // Load notifications
  const notificationsEnabled = localStorage.getItem('notifications') !== 'false'; // Default true
  const notificationsToggle = document.getElementById('notifications-toggle');
  const notificationsStatus = document.getElementById('notifications-status');
  if (notificationsToggle) {
    notificationsToggle.checked = notificationsEnabled;
  }
  if (notificationsStatus) {
    notificationsStatus.textContent = notificationsEnabled ? 'Bật' : 'Tắt';
  }
}

// Save settings
function saveSettings() {
  // Save theme
  const selectedTheme = document.querySelector('input[name="theme"]:checked')?.value || 'system';
  localStorage.setItem('theme', selectedTheme);
  applyTheme(selectedTheme);

  // Save language
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    localStorage.setItem('language', languageSelect.value);
  }

  // Save notifications
  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    localStorage.setItem('notifications', notificationsToggle.checked ? 'true' : 'false');
  }

  // Show success notification
  showNotificationPopup('Đã lưu cài đặt thành công!', 'success');
  
  // Close popup after a short delay
  setTimeout(() => {
    closeSettingsPopup();
  }, 1000);
}

// Apply theme
function applyTheme(theme) {
  const body = document.body;
  
  if (theme === 'dark') {
    body.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    body.setAttribute('data-theme', 'light');
  } else {
    // System theme
    body.setAttribute('data-theme', 'system');
    
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }
}

// Notification helper for settings popup
let currentNotification = null; // Đảm bảo chỉ hiển thị 1 thông báo tại một thời điểm

function showNotificationPopup(message, type = 'info') {
  // Xóa thông báo cũ nếu đang tồn tại
  if (currentNotification && currentNotification.parentNode) {
    currentNotification.remove();
  }

  const notification = document.createElement('div');
  currentNotification = notification;

  // Xác định icon và màu nền theo type
  let iconClass = 'fa-info-circle';
  let bgColor = '#3b82f6'; // info (xanh dương)

  if (type === 'success') {
    iconClass = 'fa-check-circle';
    bgColor = '#22c55e'; // xanh lá
  } else if (type === 'error') {
    iconClass = 'fa-exclamation-circle';
    bgColor = '#ef4444'; // đỏ
  }

  notification.style.cssText = `
    position: fixed !important;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    max-width: 320px;
    min-height: 56px;
    height: auto !important;

    background: ${bgColor};
    color: white;

    border-radius: 40px;
    padding: 12px 24px;

    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 10px;

    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    text-align: center;

    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    z-index: 999999;   /* đảm bảo cao hơn overlay */

    pointer-events: none;
    user-select: none;
    overflow: hidden;

    animation: fadeInScale 0.35s ease-out;
  `;

  
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
  notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations for notifications
if (!document.getElementById('settings-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'settings-notification-styles';
  style.textContent = `
    @keyframes slideInRight {
      from { 
        opacity: 0;
        transform: translateX(400px);
      }
      to { 
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes slideOutRight {
      from { 
        opacity: 1;
        transform: translateX(0);
      }
      to { 
        opacity: 0;
        transform: translateX(400px);
      }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const currentTheme = localStorage.getItem('theme') || 'system';
  if (currentTheme === 'system') {
    applyTheme('system');
  }
});