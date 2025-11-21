// index.js (bỏ gọi initAccountDropdown() vì header.js tự xử lý)
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const welcome = document.getElementById('welcome-message');

  if (user) {
    welcome.innerHTML = `Xin chào, <strong>${user.name}</strong> 👋`;
  }

  // Fetch header (chỉ insert, không gọi init dropdown nữa)
  fetch('header.html')
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const headerHTML = doc.querySelector('header').outerHTML;
      document.getElementById('header-placeholder').innerHTML = headerHTML;

      // header.js tự init dropdown → KHÔNG CẦN GỌI
    })
    .catch(err => console.error('Lỗi load header:', err));

  const todayTasks = document.getElementById('today-tasks');
  const statDone = document.getElementById('stat-done');
  const statOverdue = document.getElementById('stat-overdue');
  const statTotal = document.getElementById('stat-total');
  const progressBar = document.getElementById('progress-bar');
  const upcomingEvents = document.getElementById('upcoming-events');

  // Current date for overdue check
  const today = new Date('2025-10-09').toISOString().split('T')[0];

  // Load or initialize tasks
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [
    { id: 1, title: 'Gửi báo cáo dự án', due: '2025-09-20', status: 'overdue' },
    { id: 2, title: 'Họp team', due: '2025-09-20', status: 'todo' },
    { id: 3, title: 'Nộp bài tập', due: '2025-09-21', status: 'todo' }
  ];

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function updateProgress() {
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    progressBar.style.width = `${(doneCount / total) * 100}%`;
  }

  function renderTasks() {
    todayTasks.innerHTML = '';
    tasks.forEach(t => {
      const statusClass = t.due && new Date(t.due) < new Date(today) && t.status !== 'done' ? 'overdue' : t.status;
      if (statusClass === 'overdue') t.status = 'overdue';
      const li = document.createElement('li');
      li.className = `task-item ${statusClass}`;
      li.innerHTML = `
        <span>${t.title} — <span class="due-date">${t.due || 'Không có hạn'}</span></span>
        <span class="status ${statusClass}">${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}</span>
        <button class="delete-btn">✖</button>
      `;
      li.querySelector('.delete-btn').addEventListener('click', () => {
        tasks = tasks.filter(task => task.id !== t.id);
        saveTasks();
        renderTasks();
        updateStats();
      });
      todayTasks.appendChild(li);
    });
    updateStats();
  }

  function updateStats() {
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.status === 'overdue' || (t.due && new Date(t.due) < new Date(today) && t.status !== 'done')).length;
    statDone.textContent = done;
    statOverdue.textContent = overdue;
    statTotal.textContent = tasks.length;
    updateProgress();
  }

  renderTasks();

  document.getElementById('global-search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm));
    todayTasks.innerHTML = '';
    filteredTasks.forEach(t => {
      const li = document.createElement('li');
      li.className = `task-item ${t.status}`;
      li.innerHTML = `
        <span>${t.title} — <span class="due-date">${t.due || 'Không có hạn'}</span></span>
        <span class="status ${t.status}">${t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
        <button class="delete-btn">✖</button>
      `;
      li.querySelector('.delete-btn').addEventListener('click', () => {
        tasks = tasks.filter(task => task.id !== t.id);
        saveTasks();
        renderTasks();
      });
      todayTasks.appendChild(li);
    });
  });
});