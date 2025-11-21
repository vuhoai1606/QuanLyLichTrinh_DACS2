// logout.js (tương tự, bỏ gọi initAccountDropdown() vì header.js tự xử lý)
document.addEventListener('DOMContentLoaded', () => {
  // Fetch header (chỉ insert, không gọi init dropdown nữa)
  fetch('header.html')
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const headerHTML = doc.querySelector('header').outerHTML;
      document.getElementById('header-placeholder').innerHTML = headerHTML;

      // header.js sẽ tự init mọi thứ (sidebar + dropdown)
    })
    .catch(error => console.error('Lỗi tải header:', error));

  console.log('Đã đăng xuất thành công.');

  // XÓA user
  localStorage.removeItem('currentUser');

  // Chuyển về trang chủ sau 2 giây
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 2000);
});