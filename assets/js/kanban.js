document.addEventListener('DOMContentLoaded', () => {
  // Nhúng header.html
  fetch('header.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('header-placeholder').innerHTML = html;
      const menuToggle = document.getElementById('menu-toggle');
      const header = document.querySelector('header');
      if (menuToggle && header) {
        menuToggle.addEventListener('click', () => {
          header.classList.toggle('collapsed');
          menuToggle.style.transform = header.classList.contains('collapsed')
            ? 'rotate(180deg)'
            : 'rotate(0deg)';
        });
      }
    })
    .catch(error => console.error('Lỗi khi tải header:', error));

  // Dữ liệu từ tasks (đồng bộ với tasks.js)
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [
    { id: 1, title: 'Tạo slides', desc: '', due: '', priority: 'medium', status: 'todo', assignee: '' },
    { id: 2, title: 'Code feature X', desc: '', due: '', priority: 'high', status: 'in_progress', assignee: '' },
    { id: 3, title: 'Review PR', desc: '', due: '', priority: 'low', status: 'done', assignee: '' }
  ];
  const kanbanBoard = document.getElementById('kanban-board');
  const taskDetailModal = document.getElementById('task-detail-modal');
  const columnEditModal = document.getElementById('column-edit-modal');
  const addColumnBtn = document.getElementById('add-column');
  const saveBoardBtn = document.getElementById('save-board');

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    window.dispatchEvent(new Event('tasksUpdated'));
  }

  function render() {
    kanbanBoard.innerHTML = '';
    const defaultColumns = {
      todo: { id: 'todo', title: 'To Do' },
      in_progress: { id: 'in_progress', title: 'In Progress' },
      done: { id: 'done', title: 'Done' }
    };
    Object.values(defaultColumns).forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'col';
      colEl.dataset.id = col.id;
      colEl.innerHTML = `
        <div class="col-header">
          <h3>${col.title}</h3>
          <div class="col-actions">
            <button class="btn btn-edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="card-list" data-col-id="${col.id}"></div>
      `;
      const cardList = colEl.querySelector('.card-list');
      tasks.filter(task => task.status === col.id).forEach(task => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-item';
        cardEl.draggable = true;
        cardEl.dataset.id = task.id;
        cardEl.innerHTML = `<span>${task.title}</span><small>${task.due ? new Date(task.due).toLocaleDateString() : ''}</small>`;
        cardEl.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ cardId: task.id, colId: col.id }));
          cardEl.classList.add('dragging');
        });
        cardEl.addEventListener('dragend', () => cardEl.classList.remove('dragging'));
        cardEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          selectedCardId = task.id;
          selectedColId = col.id;
          taskDetailModal.style.display = 'flex';
          const card = tasks.find(c => c.id === selectedCardId);
          document.getElementById('task-title').value = card.title;
          document.getElementById('task-desc').value = card.desc || '';
          document.getElementById('task-due').value = card.due || '';
          document.getElementById('task-priority').value = card.priority || 'medium';
          document.getElementById('task-assignee').value = card.assignee || '';
        });
        cardList.appendChild(cardEl);
      });
      const editBtn = colEl.querySelector('.btn-edit');
      const deleteBtn = colEl.querySelector('.btn-delete');
      editBtn.addEventListener('click', () => {
        selectedColId = col.id;
        document.getElementById('column-title').value = col.title;
        columnEditModal.style.display = 'flex';
      });
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Bạn có chắc chắn muốn xóa cột "${col.title}"?`)) {
          tasks = tasks.filter(t => t.status !== col.id);
          saveTasks();
          render();
        }
      });
      kanbanBoard.appendChild(colEl);
    });
  }

  // Drag-and-Drop đồng bộ với tasks
  kanbanBoard.addEventListener('dragover', (e) => e.preventDefault());
  kanbanBoard.addEventListener('drop', (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const sourceColId = data.colId;
    const targetColId = e.target.closest('.col')?.dataset.id;
    if (!targetColId || sourceColId === targetColId) return;
    const task = tasks.find(t => t.id == data.cardId);
    if (task) {
      task.status = targetColId; // Cập nhật trạng thái trong tasks
      saveTasks();
      render();
    }
  });

  document.querySelectorAll('.card-list').forEach(list => {
    new Sortable(list, {
      group: 'kanban',
      animation: 150,
      onEnd: updateTaskStatus
    });
  });

  function updateTaskStatus(evt) {
    const itemEl = evt.item; // phần tử task được kéo
    const newColumn = evt.to.closest('.col'); // cột mới
    if (!newColumn) return;

    const newStatus = newColumn.dataset.id; // lấy id của cột mới (vd: todo, in_progress, done)
    const taskId = parseInt(itemEl.dataset.id);

    // Cập nhật trạng thái trong mảng tasks
    const task = tasks.find(t => t.id === taskId);
    if (task && newStatus) {
      task.status = newStatus;
      localStorage.setItem('tasks', JSON.stringify(tasks));
      console.log(`✅ Task ${taskId} moved to ${newStatus}`);
    }

    // Gọi lại render để làm mới giao diện (tuỳ chọn)
    render();
  }

  // Thêm cột mới (không ảnh hưởng tasks, chỉ bổ sung giao diện)
  addColumnBtn.addEventListener('click', () => {
    const title = prompt('Tên cột mới');
    if (title) {
      const newColId = `col_${Date.now()}`;
      // Thêm cột mới vào giao diện, nhưng không tự động gán tasks (yêu cầu người dùng kéo thẻ)
      const colEl = document.createElement('div');
      colEl.className = 'col';
      colEl.dataset.id = newColId;
      colEl.innerHTML = `
        <div class="col-header">
          <h3>${title}</h3>
          <div class="col-actions">
            <button class="btn btn-edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="card-list" data-col-id="${newColId}"></div>
      `;
      const editBtn = colEl.querySelector('.btn-edit');
      editBtn.addEventListener('click', () => {
        selectedColId = newColId;
        document.getElementById('column-title').value = title;
        columnEditModal.style.display = 'flex';
      });
      const deleteBtn = colEl.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Bạn có chắc chắn muốn xóa cột "${title}"?`)) {
          kanbanBoard.removeChild(colEl);
        }
      });
      kanbanBoard.appendChild(colEl);
    }
  });

  // Lưu board
  saveBoardBtn.addEventListener('click', () => {
    saveTasks();
    alert('Board đã được lưu tại ' + new Date().toLocaleTimeString());
  });

  // Modal Task
  let selectedCardId = null, selectedColId = null;
  document.getElementById('task-title').addEventListener('input', () => {
    if (selectedCardId) {
      const task = tasks.find(c => c.id === selectedCardId);
      task.title = document.getElementById('task-title').value;
      saveTasks();
      render();
    }
  });
  document.getElementById('task-desc').addEventListener('input', () => {
    if (selectedCardId) {
      const task = tasks.find(c => c.id === selectedCardId);
      task.desc = document.getElementById('task-desc').value;
      saveTasks();
    }
  });
  document.getElementById('task-due').addEventListener('change', () => {
    if (selectedCardId) {
      const task = tasks.find(c => c.id === selectedCardId);
      task.due = document.getElementById('task-due').value;
      saveTasks();
      render();
    }
  });
  document.getElementById('task-priority').addEventListener('change', () => {
    if (selectedCardId) {
      const task = tasks.find(c => c.id === selectedCardId);
      task.priority = document.getElementById('task-priority').value;
      saveTasks();
    }
  });
  document.getElementById('task-assignee').addEventListener('input', () => {
    if (selectedCardId) {
      const task = tasks.find(c => c.id === selectedCardId);
      task.assignee = document.getElementById('task-assignee').value;
      saveTasks();
    }
  });
  document.getElementById('save-task').addEventListener('click', () => {
    if (selectedCardId) {
      saveTasks();
      taskDetailModal.style.display = 'none';
    }
  });
  document.getElementById('delete-task').addEventListener('click', () => {
    if (selectedCardId) {
      tasks = tasks.filter(t => t.id !== selectedCardId);
      selectedCardId = null;
      selectedColId = null;
      saveTasks();
      taskDetailModal.style.display = 'none';
      render();
    }
  });
  document.getElementById('close-detail').addEventListener('click', () => {
    taskDetailModal.style.display = 'none';
  });

  // Modal Column
  document.getElementById('column-title').addEventListener('input', () => {
    if (selectedColId) {
      // Chỉ cập nhật giao diện, không ảnh hưởng dữ liệu tasks
      const col = kanbanBoard.querySelector(`.col[data-id="${selectedColId}"] .col-header h3`);
      if (col) col.textContent = document.getElementById('column-title').value;
    }
  });
  document.getElementById('save-column').addEventListener('click', () => {
    columnEditModal.style.display = 'none';
  });
  document.getElementById('close-column').addEventListener('click', () => {
    columnEditModal.style.display = 'none';
  });

  // Lắng nghe sự kiện từ tasks.js để đồng bộ
  window.addEventListener('tasksUpdated', () => {
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    render();
  });

  render();
});