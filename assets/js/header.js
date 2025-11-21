// header.js - Xử lý sidebar và dropdown tài khoản
(function () {
  // === KHỞI TẠO SIDEBAR ===
  function initSidebar() {
    const header = document.querySelector('header');
    const menuToggle = document.getElementById('menu-toggle');
    
    if (!header || !menuToggle) {
      return;
    }

    // Tránh khởi tạo lại nhiều lần
    if (window.__headerSidebarInit) return;
    window.__headerSidebarInit = true;

    // Hàm áp trạng thái sidebar
    function applySidebarState(collapsed) {
      if (collapsed) {
        header.classList.add('collapsed');
        menuToggle.classList.add('inside');
        menuToggle.style.transform = 'rotate(180deg)';
      } else {
        header.classList.remove('collapsed');
        menuToggle.classList.remove('inside');
        menuToggle.style.transform = 'rotate(0deg)';
      }
    }

    // Phục hồi trạng thái từ localStorage
    const saved = localStorage.getItem('menuCollapsed') === 'true';
    applySidebarState(saved);

    // Toggle khi click nút menu
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const willCollapse = !header.classList.contains('collapsed');
      applySidebarState(willCollapse);
      localStorage.setItem('menuCollapsed', willCollapse.toString());
    });
  }

  // === KHỞI TẠO DROPDOWN TÀI KHOẢN ===
  function initAccountDropdown() {
    const container = document.getElementById('account-dropdown-container');
    const trigger = document.getElementById('account-trigger');
    const logoutBtn = document.getElementById('logout-btn');

    if (!container || !trigger) {
      return;
    }

    // Xử lý đăng xuất
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
          const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (data.success) {
            alert('Đăng xuất thành công!');
            window.location.href = '/login';
          } else {
            alert(data.message || 'Đăng xuất thất bại');
          }
        } catch (error) {
          console.error('Lỗi:', error);
          alert('Có lỗi xảy ra khi đăng xuất.');
        }
      });
    }

    // Hiệu ứng hover + click cho dropdown
    let hoverTimeout;
    const show = () => {
      clearTimeout(hoverTimeout);
      container.classList.add('active');
    };
    const hide = () => {
      hoverTimeout = setTimeout(() => container.classList.remove('active'), 300);
    };

    container.addEventListener('mouseenter', show);
    container.addEventListener('mouseleave', hide);
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      container.classList.toggle('active');
    });
  }

  // === KHỞI CHẠY ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSidebar();
      initAccountDropdown();
    });
  } else {
    initSidebar();
    initAccountDropdown();
  }
})();

