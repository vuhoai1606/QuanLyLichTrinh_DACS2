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
          menuToggle.style.transform = header.classList.contains('collapsed')
            ? 'rotate(180deg)'
            : 'rotate(0deg)';
        });
      } else {
        console.log('menu-toggle or header not found in timeline.js!');
      }
    })
    .catch(error => console.error('Lỗi khi tải header:', error));

  // Các phần tử DOM
  const timeline = document.getElementById('timeline');
  const addTimelineBtn = document.getElementById('add-timeline');
  const modalOverlay = document.getElementById('modal-overlay');
  const addSprintModal = document.getElementById('add-sprint-modal');
  const formSprint = document.getElementById('form-sprint');
  const closeModalBtn = document.getElementById('close-modal');
  const sTitle = document.getElementById('s-title');
  const sStart = document.getElementById('s-start');
  const sEnd = document.getElementById('s-end');

  // Hàm mở modal
  function openModal() {
    addSprintModal.style.display = 'flex';
    modalOverlay.style.display = 'block';
  }

  // Hàm đóng modal
  function closeModal() {
    addSprintModal.style.display = 'none';
    modalOverlay.style.display = 'none';
    formSprint.reset();
  }

  // Hàm thêm sprint
  function addSprint(title, start, end) {
    const li = document.createElement('li');
    li.className = 'timeline-row';
    li.dataset.start = start;
    li.dataset.end = end;
    li.innerHTML = `
      <div class="timeline-label">
        <strong>${title}</strong>
        <div class="small">${start} → ${end}</div>
      </div>
      <div class="timeline-bar-container">
        <div class="timeline-bar"></div>
      </div>
    `;
    timeline.insertBefore(li, addTimelineBtn.parentNode);
  }

  // Sự kiện thêm sprint
  addTimelineBtn.addEventListener('click', openModal);

  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);

  formSprint.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = sTitle.value;
    const start = sStart.value;
    const end = sEnd.value;
    if (title && start && end) {
      addSprint(title, start, end);
      closeModal();
    }
  });

  // Tính toán chiều dài timeline-bar dựa trên ngày
  function updateTimelineBars() {
    const rows = document.querySelectorAll('.timeline-row');
    rows.forEach(row => {
      const start = new Date(row.dataset.start);
      const end = new Date(row.dataset.end);
      const totalDays = (end - start) / (1000 * 60 * 60 * 24);
      const today = new Date();
      const daysPassed = (today - start) / (1000 * 60 * 60 * 24);
      const progress = Math.min(Math.max(daysPassed / totalDays * 100, 0), 100);
      const bar = row.querySelector('.timeline-bar');
      bar.style.width = `${progress}%`;
    });
  }

  // Cập nhật timeline khi tải trang
  updateTimelineBars();
  setInterval(updateTimelineBars, 86400000); // Cập nhật mỗi ngày
});