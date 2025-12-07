// assets/js/tasks.js
// ===================================================================
// PHIÊN BẢN ĐÃ CHUYển ĐỔI HOÀN TOÀN SANG GỌI API (không dùng localStorage)
// Tương thích 100% với backend taskRoutes.js + taskController.js
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ==================== LOAD HEADER (nếu cần) ====================
  // Nếu bạn dùng include header bằng fetch thì giữ lại, còn không thì bỏ
  // (để lại đoạn này nếu các trang khác cũng dùng)

  // ==================== BIẾN TOÀN CỤC ====================
  let tasks = [];           // Dữ liệu tasks từ server
  let deletedTask = null;   // Để hỗ trợ undo xóa
  let currentEditId = null; // Task đang được edit

  // ==================== DOM ELEMENTS ====================
  const taskList       = document.getElementById('task-list');
  const goalList       = document.getElementById('goal-list');
  const emptyState     = document.getElementById('empty-state');
  const restoreMessage = document.getElementById('restore-message');
  const restoreBtn     = document.getElementById('restore-btn');
  const restoreText    = document.getElementById('restore-text');

  const modal          = document.getElementById('task-modal');
  const overlay        = document.getElementById('modal-overlay');
  const modalTitle     = document.getElementById('modal-title');
  const form           = document.getElementById('form-task');

  const inpTitle       = document.getElementById('t-title');
  const inpDesc        = document.getElementById('t-desc');
  const inpDue         = document.getElementById('t-due');
  const inpPriority    = document.getElementById('t-priority');
  const inpRecurring   = document.getElementById('t-recurring');
  const inpDependency  = document.getElementById('t-dependency');
  const inpAssign      = document.getElementById('t-assign');

  const btnOpenCreate  = document.getElementById('open-create');
  const btnCloseModal  = document.getElementById('close-modal');
  const btnViewGantt   = document.getElementById('view-gantt');
  const ganttContainer = document.getElementById('gantt-container');

  // ==================== GỌI API CHUNG ====================
  const api = {
    async getAll() {
      const res = await fetch('/api/tasks');
      const json = await res.json();
      return json.success ? json.tasks : [];
    },
    async getOne(id) {
      const res = await fetch(`/api/tasks/${id}`);
      const json = await res.json();
      return json.success ? json.task : null;
    },
    async create(data) {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
    async update(id, data) {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
    async delete(id) {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      return await res.json();
    },
    async updateStatus(id, status) {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return await res.json();
    }
  };

  // ==================== LOAD + RENDER ====================
  const loadTasks = async () => {
    tasks = await api.getAll();
    renderTasks(tasks);
    window.dispatchEvent(new Event('tasksUpdated')); // cho Kanban đồng bộ
  };

  const renderTasks = (taskArray = tasks, targetList = taskList) => {
    targetList.innerHTML = '';
    if (taskArray.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    taskArray.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.id = task.task_id;

      const priorityClass = task.priority === 'high' ? 'priority-high' :
                          task.priority === 'medium' ? 'priority-medium' : 'priority-low';

      li.innerHTML = `
        <div class="task-main">
          <strong>${task.title}</strong>
        </div>

        <div class="task-meta">
          <span class="priority ${priorityClass}">${task.priority || 'medium'}</span>
          <span class="status">${task.status || 'todo'}</span>
        </div>

        <div class="task-actions">
          <button class="btn-edit" title="Sửa"><i class="fas fa-edit"></i></button>
          <button class="btn-delete" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>
      `;
      targetList.appendChild(li);
    });
  };


  // ==================== MODAL ====================
  const openModal = async (task = null) => {
    currentEditId = task ? task.task_id : null;
    modalTitle.textContent = task ? 'Chỉnh sửa công việc' : 'Tạo công việc mới';

    // ĐẢM BẢO CÁC TRƯỜNG DỮ LIỆU ĐƯỢC ĐIỀN CHÍNH XÁC TỪ OBJECT task
    inpTitle.value       = task?.title || '';
    inpDesc.value        = task?.description || '';
    
    // Hạn chót (t-due) cần lấy từ end_time của DB và cắt chuỗi để hiển thị
    inpDue.value         = task?.end_time ? task.end_time.slice(0, 16) : ''; 
    
    inpPriority.value    = task?.priority || 'medium';
    // Lặp lại (t-recurring) cần lấy từ repeat_type của DB
    inpRecurring.value   = task?.repeat_type || 'none'; 
    
    inpAssign.value      = task?.assigned_to || ''; // Giữ nguyên assigned_to

    // Dependency: hiện tại chưa có bảng dependency → tạm ẩn hoặc để trống
    inpDependency.innerHTML = '<option value="">Không phụ thuộc</option>';

    ganttContainer.style.display = 'none';
    btnViewGantt.textContent = 'Xem Gantt Chart';

    modal.style.display = 'block';
    overlay.style.display = 'block';
  };

  const closeModal = () => {
    modal.style.display = 'none';
    overlay.style.display = 'none';
    form.reset();
    currentEditId = null;
  };

  // ==================== FORM SUBMIT ====================
  form.addEventListener('submit', async e => {
      e.preventDefault();

      // BƯỚC 1: Lấy dữ liệu task hiện tại để duy trì start_time
      let existingTask = null;
      if (currentEditId) {
        existingTask = tasks.find(t => t.task_id === currentEditId);
      }

      const payload = {
        title: inpTitle.value.trim(),
        description: inpDesc.value.trim() || null,
        endTime: inpDue.value || null, 
        // ĐIỀU CHỈNH QUAN TRỌNG: Duy trì start_time cũ nếu đang chỉnh sửa
        startTime: existingTask ? existingTask.start_time : new Date().toISOString(), // Dùng start_time hiện tại hoặc giá trị cũ
        priority: inpPriority.value,
        repeatType: inpRecurring.value,
        assigned_to: inpAssign.value || null,
      };

      let result;
      if (currentEditId) {
        // BƯỚC 2: Gọi update
        result = await api.update(currentEditId, payload);
      } else {
        // BƯỚC 2: Gọi create
        result = await api.create(payload);
      }

      if (result.success) {
        await loadTasks();
        closeModal();
      } else {
        alert(result.message || 'Có lỗi xảy ra');
      }
  });

  // ==================== EDIT & DELETE ====================
  taskList.addEventListener('click', async e => {
    const editBtn   = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');

    if (editBtn) {
      const id = editBtn.closest('.task-item').dataset.id;
      const task = await api.getOne(id);
      if (task) openModal(task);
    }

    if (deleteBtn) {
      if (!confirm('Xóa công việc này?')) return;

      const id = Number(deleteBtn.closest('.task-item').dataset.id);
      const task = tasks.find(t => t.task_id === id);
      deletedTask = task;

      const result = await api.delete(id);
      if (result.success) {
        await loadTasks();

        restoreText.textContent = `Đã xóa "${deletedTask.title}"`;
        restoreMessage.style.display = 'block';
        setTimeout(() => restoreMessage.style.display = 'none', 6000);
      }
    }
  });

  // Undo xóa
  restoreBtn.addEventListener('click', async () => {
    if (!deletedTask) return;
    const result = await api.create({
      title: deletedTask.title,
      description: deletedTask.description,
      due_date: deletedTask.due_date,
      priority: deletedTask.priority,
      recurring: deletedTask.recurring || 'none',
      assigned_to: deletedTask.assigned_to
    });
    if (result.success) {
      await loadTasks();
      restoreMessage.style.display = 'none';
      deletedTask = null;
    }
  });

  // ==================== TÌM KIẾM & LỌC ====================
  document.getElementById('search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
    renderTasks(filtered);
  });

  document.getElementById('filter-status').addEventListener('change', e => {
    const status = e.target.value;
    const filtered = status === 'all'
      ? tasks
      : tasks.filter(t => t.status === status);
    renderTasks(filtered);
  });

  document.querySelectorAll('.btn-quick-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      let filtered = [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filter === 'today') {
        filtered = tasks.filter(t => {
          if (!t.due_date) return false;
          const due = new Date(t.due_date);
          return due.toDateString() === today.toDateString();
        });
      } else if (filter === 'week') {
        const weekLater = new Date(today);
        weekLater.setDate(today.getDate() + 7);
        filtered = tasks.filter(t => t.due_date && new Date(t.due_date) <= weekLater);
      }

      renderTasks(filtered);
    });
  });

  // ==================== TAB Tasks / Goals ====================
  document.querySelectorAll('.tab-button').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const isGoals = tab.id === 'tab-goals';
      taskList.style.display = isGoals ? 'none' : 'block';
      goalList.style.display = isGoals ? 'block' : 'none';

      if (isGoals) renderTasks(tasks, goalList);
      else renderTasks();
    });
  });

  // ==================== NÚT CHUNG ====================
  btnOpenCreate.addEventListener('click', () => openModal());
  btnCloseModal.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Gantt placeholder
  btnViewGantt.addEventListener('click', () => {
    if (ganttContainer.style.display === 'block') {
      ganttContainer.style.display = 'none';
      btnViewGantt.innerHTML = 'Xem Gantt Chart';
    } else {
      ganttContainer.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">Gantt Chart sẽ được tích hợp ở đây (Frappe Gantt / mermaid / dhtmlxGantt...)</p>';
      ganttContainer.style.display = 'block';
      btnViewGantt.innerHTML = 'Đóng Gantt';
    }
  });

  // ==================== KHỞI TẠO ====================
  loadTasks(); // Lấy dữ liệu từ server ngay khi load trang

  // ==================== AUTO REFRESH ====================
  // Auto refresh mỗi 20 giây → đồng bộ Tasks list với Kanban / Timeline
  setInterval(() => {
    if (!document.hidden) loadTasks();
  }, 20000);
});
// ===================================================================
// NOTES CHO BẠN:
// ===================================================================
// 1. File này CHỈ xử lý giao diện và gọi API
// 2. KHÔNG có logic nghiệp vụ (validation phức tạp, tính toán, database)
// 3. Logic nghiệp vụ nằm trong: controllers/taskController.js
// 4. Bạn có thể tích hợp code cũ của bạn vào đây nhưng CHỈ giữ phần UI
// 5. Mọi xử lý dữ liệu đều qua API: /api/tasks
// ===================================================================
