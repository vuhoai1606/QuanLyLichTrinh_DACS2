document.addEventListener('DOMContentLoaded', () => {
  // Nhúng header.html
  fetch('header.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('header-placeholder').innerHTML = html;

      // Thêm logic toggle sau khi header được nhúng
      const menuToggle = document.getElementById('menu-toggle');
      const header = document.querySelector('header');
      if (menuToggle && header) {
        menuToggle.addEventListener('click', () => {
          header.classList.toggle('collapsed');
          if (header.classList.contains('collapsed')) {
            menuToggle.style.transform = 'rotate(180deg)';
          } else {
            menuToggle.style.transform = 'rotate(0deg)';
          }
        });
      } else {
        console.log('menu-toggle or header not found in reports.js!');
      }
    })
    .catch(error => console.error('Lỗi khi tải header:', error));

  // Logic reports
  const ctx = document.getElementById('chart-status').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Todo', 'In Progress', 'Done', 'Overdue'],
      datasets: [{ data: [12, 6, 30, 3], backgroundColor: ['#f59e0b', '#06b6d4', '#10b981', '#ef4444'] }]
    }
  });
  const ctx2 = document.getElementById('chart-week').getContext('2d');
  new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{ label: 'Tasks', data: [3, 5, 4, 6, 7, 2, 1] }]
    }
  });
});