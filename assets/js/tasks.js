document.addEventListener('DOMContentLoaded', () => {
  // Nhúng header.html
  fetch('header.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('header-placeholder').innerHTML = html;

      // Thêm logic toggle chỉ cho nút menu-toggle
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
        console.log('menu-toggle or header not found in tasks.js!');
      }
    })
    .catch(error => console.error('Lỗi khi tải header:', error));

  // Dữ liệu mẫu
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [
    { id: 1, title: 'Chuẩn bị slides', desc: 'Slides cho buổi meeting', priority: 'high', status: 'in_progress' },
    { id: 2, title: 'Gọi khách hàng', desc: 'Phone call', priority: 'medium', status: 'todo' },
    { id: 3, title: 'Nộp báo cáo', desc: 'Báo cáo tuần', priority: 'low', status: 'done' }
  ];
  let deletedTask = null;

  const ul = document.getElementById('task-list');
  const goalList = document.getElementById('goal-list');
  const emptyState = document.getElementById('empty-state');
  const restoreMessage = document.getElementById('restore-message');
  const restoreBtn = document.getElementById('restore-btn');
  const taskModal = document.getElementById('task-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const formTask = document.getElementById('form-task');
  const modalTitle = document.getElementById('modal-title');
  const tTitle = document.getElementById('t-title');
  const tDesc = document.getElementById('t-desc');
  const tPriority = document.getElementById('t-priority');
  const tStatus = document.getElementById('t-status') || { value: 'todo' }; 
  let editId = null;

  // Hàm lưu tasks và thông báo Kanban
  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    window.dispatchEvent(new Event('tasksUpdated'));
  }

  // Hàm render
  function render(tasksToRender = tasks, isGoals = false) {
    const list = isGoals ? goalList : ul;
    list.innerHTML = '';
    tasksToRender.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.id = task.id;
      li.innerHTML = `
        <span>${task.title}</span>
        <span class="status">${task.status}</span>
        <button class="btn-edit"><i class="fas fa-edit"></i></button>
        <button class="btn-delete"><i class="fas fa-trash"></i></button>
      `;
      list.appendChild(li);
    });
    emptyState.style.display = tasksToRender.length ? 'none' : 'block';
  }

  // Hàm mở modal tạo/edit task
  function openModal(isEdit = false, task = {}) {
    modalTitle.textContent = isEdit ? 'Edit Task' : 'New Task';
    tTitle.value = task.title || '';
    tDesc.value = task.desc || '';
    tPriority.value = task.priority || 'medium';
    tStatus.value = task.status || 'todo';
    editId = isEdit ? task.id : null;
    taskModal.style.display = 'block';
    modalOverlay.style.display = 'block';
  }

  // Hàm đóng modal
  function closeModal() {
    taskModal.style.display = 'none';
    modalOverlay.style.display = 'none';
    formTask.reset();
    editId = null;
  }

  // Submit form cập nhật status
  formTask.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskData = {
      id: editId || Date.now(),
      title: tTitle.value,
      desc: tDesc.value,
      priority: tPriority.value,
      status: tStatus.value
    };
    if (editId) {
      const task = tasks.find(t => t.id === editId);
      Object.assign(task, taskData);
    } else {
      tasks.push(taskData);
    }
    saveTasks();
    closeModal();
    render();
  });

  // Sự kiện xóa task
  ul.addEventListener('click', (e) => {
    if (e.target.closest('.btn-delete')) {
      const li = e.target.closest('.task-item');
      const id = parseInt(li.dataset.id);
      deletedTask = tasks.find(t => t.id === id);
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
      restoreMessage.style.display = 'block';
      setTimeout(() => restoreMessage.style.display = 'none', 5000);
    }
    if (e.target.closest('.btn-edit')) {
      const id = parseInt(e.target.closest('.task-item').dataset.id);
      openModal(true, tasks.find(t => t.id === id));
    }
  });

  // Sự kiện khôi phục task
  restoreBtn.addEventListener('click', () => {
    if (deletedTask) {
      tasks.push(deletedTask);
      saveTasks();
      render();
      restoreMessage.style.display = 'none';
      deletedTask = null;
    }
  });

  // Filter & Search
  document.getElementById('filter-status').addEventListener('change', () => {
    const v = document.getElementById('filter-status').value;
    render(v === 'all' ? tasks : tasks.filter(x => x.status === v));
  });

  document.getElementById('search').addEventListener('input', () => {
    const q = document.getElementById('search').value.toLowerCase();
    render(tasks.filter(x =>
      x.title.toLowerCase().includes(q) ||
      (x.desc || '').toLowerCase().includes(q)
    ));
  });

  // Quick Filters
  document.querySelectorAll('.btn-quick-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      const today = new Date().toISOString().slice(0, 10);
      const week = new Date();
      week.setDate(week.getDate() + 7);
      const tasksFiltered = filter === 'today'
        ? tasks.filter(t => t.due && t.due.slice(0, 10) === today)
        : filter === 'week'
          ? tasks.filter(t => t.due && new Date(t.due) <= week)
          : tasks;
      render(tasksFiltered);
    });
  });

  // Tabs
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const isGoals = button.id === 'tab-goals';
      ul.style.display = isGoals ? 'none' : 'block';
      goalList.style.display = isGoals ? 'block' : 'none';
      render(tasks, isGoals);
    });
  });

  // Edit Task
  document.getElementById('edit-task').addEventListener('click', () => {
    if (editId) openModal(true, tasks.find(t => t.id === editId));
  });

  // Lắng nghe sự kiện từ Kanban để cập nhật tasks
  window.addEventListener('tasksUpdated', () => {
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    render();
  });

  // Sự kiện mở modal tạo task (giả định có #open-create)
  const openCreateBtn = document.getElementById('open-create');
  if (openCreateBtn) {
    openCreateBtn.addEventListener('click', () => openModal());
  }

  // Đóng modal khi click overlay
  modalOverlay.addEventListener('click', closeModal);

  render(tasks);
});