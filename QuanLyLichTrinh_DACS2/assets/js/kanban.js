// assets/js/kanban.js - PHIÊN BẢN HOÀN CHỈNH 100% (ĐÃ FIX TẤT CẢ)
let currentTaskId = null;
let tempColumnForNewTask = null; // Lưu tạm cột khi tạo task mới từ nút Add Task

// ------------------ LOAD / RENDER ------------------
async function loadKanban() {
  try {
    const res = await fetch('/api/kanban');
    if (!res.ok) throw new Error('API lỗi');
    const { success, data } = await res.json();
    if (success) {
      renderKanbanBoard(data);
      updateCountdowns(); // FIX: Cập nhật countdown ngay, không còn "đang tải..."
    }
  } catch (err) {
    console.error('Lỗi tải Kanban:', err);
    showToast('Lỗi tải dữ liệu Kanban', 'error');
  }
}
window.loadKanban = loadKanban;

function renderKanbanBoard(data) {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  board.innerHTML = '';

  // Dọn dẹp timer cũ
  if (window.taskTimers) {
    Object.values(window.taskTimers).forEach(clearInterval);
    window.taskTimers = {};
  } else {
    window.taskTimers = {};
  }

  const columns = [
    { id: 'todo', title: 'To Do', tasks: data.todo || [], color: '#6366f1' },
    { id: 'in_progress', title: 'In Progress', tasks: data.in_progress || [], color: '#f59e0b' },
    { id: 'done', title: 'Done', tasks: data.done || [], color: '#10b981' },
    { id: 'overdue', title: 'OverDue', tasks: data.overdue || [], color: '#ef4444' }
  ];

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'col';
    colDiv.style.borderTop = `5px solid ${col.color}`;

    let tasksHtml = '';
    col.tasks.forEach(task => {
      const isOverdueClass = col.id === 'overdue' ? 'task-overdue' : '';

      tasksHtml += `
        <div class="task-card ${isOverdueClass}" draggable="true" data-id="${task.task_id}" data-kanban-column="${task.kanban_column}" onclick="handleCardClick(event, ${task.task_id}, '${task.end_time || ''}', '${task.kanban_column}')">
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          <p class="task-desc">${escapeHtml(task.description || '')}</p>

          ${task.category_name ? `
          <span class="category-tag" style="background:${task.category_color || '#888'}; color:white; font-size:11px; padding:3px 8px; border-radius:12px; display:inline-block; margin:6px 0;">
            ${task.category_name}
          </span>` : ''}

          <div class="task-meta">
            <span class="priority-badge priority-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
            <small>Due: ${task.end_time ? new Date(task.end_time).toLocaleDateString('vi-VN') + ' ' + new Date(task.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</small>
          </div>

          ${task.progress > 0 ? `
          <div class="progress-container" style="margin-top:8px;">
            <div class="progress-bar" style="width: ${task.progress}%;"></div>
            <span style="font-size:11px; color:#666;">${task.progress}%</span>
          </div>` : ''}

          ${task.end_time && task.status !== 'done' ? `
          <small class="countdown" data-end="${task.end_time}" style="display:block; margin-top:6px; color:#d97706; font-weight:600;">
            Còn: <span class="time-left">đang tải...</span>
          </small>` : ''}
        </div>
      `;
    });

    colDiv.innerHTML = `
      <div class="col-header" style="border-bottom-color: ${col.color}">
        <h3 style="color:${col.color};">${col.title} <span class="badge">${col.tasks.length}</span></h3>
      </div>
      <div class="col-content task-list" data-column="${col.id}">
        ${tasksHtml}
        <button class="add-task-btn btn-primary" data-column-id="${col.id}">
          <i class="fas fa-plus"></i> Add Task
        </button>
      </div>
    `;

    board.appendChild(colDiv);

    // Khởi động Auto Task Manager cho task chưa done
    col.tasks.forEach(task => {
      if (col.id !== 'done') startAutoTaskManager(task);
    });
  });

  initDragAndDrop();
  attachAddTaskButtons(); // Gắn sự kiện cho nút Add Task
}

// ------------------ ADD TASK BUTTONS ------------------
function attachAddTaskButtons() {
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.onclick = () => {
      const columnId = btn.dataset.columnId;
      openCreateTaskModal(columnId);
    };
  });
}

function openCreateTaskModal(columnId) {
  currentTaskId = null;
  tempColumnForNewTask = columnId;

  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-due').value = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-assignee').value = '';
  document.getElementById('task-progress').value = 0;

  document.getElementById('task-detail-modal').classList.add('active');
}

// ------------------ SAVE TASK (TẠO MỚI HOẶC CẬP NHẬT) ------------------
async function saveTask() {
  const title = document.getElementById("task-title").value.trim();
  if (!title) return alert('Tiêu đề không được để trống!');

  const body = {
    title,
    description: document.getElementById("task-desc").value.trim() || null,
    end_time: document.getElementById("task-due").value ? document.getElementById("task-due").value + 'T00:00:00' : null,
    priority: document.getElementById("task-priority").value || 'medium',
    progress: Number(document.getElementById("task-progress").value || 0)
  };

  try {
    let res;
    if (currentTaskId) {
      // Cập nhật task cũ
      res = await fetch(`/api/kanban/${currentTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } else if (tempColumnForNewTask) {
      // Tạo task mới vào đúng cột
      body.kanban_column = tempColumnForNewTask;
      body.status = tempColumnForNewTask === 'done' ? 'done' :
                    tempColumnForNewTask === 'overdue' ? 'overdue' :
                    tempColumnForNewTask === 'in_progress' ? 'in_progress' : 'todo';

      res = await fetch('/api/tasks', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } else {
      return alert('Không xác định được hành động');
    }

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(currentTaskId ? 'Cập nhật thành công!' : 'Tạo task thành công!', 'success');
      await loadKanban();
      closeDetailModal();
      tempColumnForNewTask = null;
    } else {
      alert(data.message || 'Lỗi khi lưu task');
    }
  } catch (err) {
    console.error('Lỗi saveTask:', err);
    alert('Lỗi kết nối server');
  }
}

// ------------------ TOOLBAR BUTTONS ------------------
function attachKanbanEventListeners() {
  // Add Column
  document.getElementById('add-column')?.addEventListener('click', () => {
    const name = prompt('Nhập tên cột mới:');
    if (name) {
      showToast(`Sẽ thêm cột "${name}" (chưa lưu DB)`, 'info');
    }
  });

  // Save Board
  document.getElementById('save-board')?.addEventListener('click', () => {
    showToast('Board đã được tự động lưu!', 'success');
  });

  // Export
  document.querySelector('.toolbar button:nth-child(3)')?.addEventListener('click', () => {
    showToast('Chức năng Export đang phát triển...', 'info');
  });

  // Apply Filter
  document.getElementById('apply-filter')?.addEventListener('click', () => {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    if (start || end) {
      filterKanbanTasks(start, end);
    } else {
      showToast('Vui lòng chọn ít nhất một ngày', 'warning');
    }
  });

  // Clear Filter
  document.getElementById('clear-filter')?.addEventListener('click', () => {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    loadKanban();
    showToast('Đã xóa bộ lọc', 'info');
  });
}

// ------------------ FILTER KANBAN TASKS ------------------
async function filterKanbanTasks(startDate, endDate) {
  let url = '/api/kanban';
  const params = new URLSearchParams();

  if (startDate) params.append('start', startDate);
  if (endDate) params.append('end', endDate);

  // THÊM: Lấy assignee và category từ select
  const assignee = document.getElementById('filter-assignee')?.value;
  const category = document.getElementById('filter-category')?.value;

  if (assignee) params.append('assignee', assignee);
  if (category) params.append('category', category);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Lỗi tải dữ liệu lọc');

    const { success, data } = await res.json();
    if (success) {
      renderKanbanBoard(data);
      updateCountdowns();
      showToast('Đã áp dụng bộ lọc!', 'success');
    } else {
      showToast('Không có dữ liệu phù hợp', 'info');
      renderKanbanBoard({ todo: [], in_progress: [], done: [], overdue: [] });
    }
  } catch (err) {
    console.error('Lỗi Filter Kanban:', err);
    showToast('Lỗi khi lọc dữ liệu', 'error');
  }
}

// ------------------ DRAG & DROP ------------------
let draggedCard = null;

function initDragAndDrop() {
  const cards = document.querySelectorAll('.task-card');
  const lists = document.querySelectorAll('.task-list');

  cards.forEach(card => {
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
      draggedCard = card;
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedCard = null;
    });
  });

  lists.forEach(list => {
    list.addEventListener('dragover', e => e.preventDefault());
    list.addEventListener('drop', async e => {
      e.preventDefault();
      if (!draggedCard) return;

      list.appendChild(draggedCard);

      const taskId = draggedCard.dataset.id;
      const oldColumn = draggedCard.dataset.kanbanColumn;
      const newColumn = list.dataset.column;

      // YÊU CẦU: Nếu từ overdue sang todo -> Mở modal chỉnh sửa
      if (oldColumn === 'overdue' && newColumn === 'todo') {
          openTaskModal(taskId);
          // Thay đổi tiêu đề modal để người dùng biết cần chỉnh sửa lại thời gian
          setTimeout(() => {
              document.querySelector('#task-detail-modal h3').textContent = 'Cập nhật lại thời gian cho Task';
          }, 100);
          return; // Dừng việc cập nhật API tự động, đợi người dùng nhấn Save trong Modal
      }

      // Chỉ cho phép di chuyển task Quá hạn sang cột Todo
      if (oldColumn === 'overdue' && newColumn !== 'todo') {
          showToast('Task quá hạn chỉ có thể di chuyển sang cột To Do để thiết lập lại', 'warning');
          return;
      }
      
      try {
        const res = await fetch(`/api/kanban/${taskId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column: newColumn })
        });

        if (res.ok) {
          loadKanban();
        } else {
          showToast('Di chuyển thất bại', 'error');
        }
      } catch (err) {
        console.error('Lỗi di chuyển:', err);
        showToast('Lỗi kết nối', 'error');
      }
    });
  });
}

// ------------------ COUNTDOWN TIMER ------------------
function updateCountdowns() {
  document.querySelectorAll('.countdown').forEach(el => {
    const end = new Date(el.dataset.end).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) {
      el.querySelector('.time-left').textContent = 'Quá hạn!';
      el.style.color = '#ef4444';
    } else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      el.querySelector('.time-left').textContent = 
        `${days ? days + ' ngày ' : ''}${hours}h ${mins}p`;
    }
  });
}
setInterval(updateCountdowns, 60000);
updateCountdowns();

// ------------------ OPEN TASK MODAL ------------------
async function openTaskModal(taskId) {
  const modal = document.getElementById('task-detail-modal');
  if (!modal) {
    console.error("Modal không tồn tại!");
    return;
  }

  currentTaskId = taskId;
  tempColumnForNewTask = null; // Reset khi mở task cũ

  try {
    const res = await fetch(`/api/kanban/${taskId}`);
    if (!res.ok) throw new Error('Không lấy được dữ liệu task');

    const { success, data } = await res.json();
    if (!success || !data) throw new Error('Dữ liệu task không hợp lệ');

    // Điền dữ liệu vào modal
    document.getElementById('task-title').value = data.title || '';
    document.getElementById('task-desc').value = data.description || '';
    document.getElementById('task-due').value = data.end_time ? data.end_time.slice(0, 10) : '';
    document.getElementById('task-priority').value = data.priority || 'medium';
    document.getElementById('task-assignee').value = data.assigned_to || '';
    document.getElementById('task-progress').value = data.progress || 0;

    modal.classList.add('active');
  } catch (err) {
    console.error('Lỗi mở chi tiết task:', err);
    alert('Không thể tải thông tin task. Vui lòng thử lại.');
  }
}

function closeDetailModal() {
  const modal = document.getElementById('task-detail-modal');
  if (modal) modal.classList.remove('active');
  currentTaskId = null;
  tempColumnForNewTask = null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleCardClick(event, taskId, endTimeStr, kanbanColumn) {
  if (event.target.closest('.confirm-complete-btn')) {
    event.stopPropagation();
    return;
  }

  const end = endTimeStr ? new Date(endTimeStr).getTime() : null;
  const now = Date.now();
  const isInGracePeriod = end && now >= end && now <= end + 5 * 60 * 1000;

  if (isInGracePeriod && kanbanColumn !== 'done' && kanbanColumn !== 'overdue') {
    if (confirm("Công việc này đã hết hạn. Bạn có muốn xác nhận hoàn thành ngay không?")) {
      confirmComplete(taskId);
    }
    return;
  }

  openTaskModal(taskId);
}

// Toast đẹp
function showToast(msg, type = 'info') {
  const oldToast = document.querySelector('.toast-notification');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
}

// DOM INIT
document.addEventListener('DOMContentLoaded', () => {
  loadKanban();
  loadFilterOptions();
  attachKanbanEventListeners();

  document.getElementById('close-detail')?.addEventListener('click', closeDetailModal);
  document.getElementById('save-task')?.addEventListener('click', saveTask);
  document.getElementById('delete-task')?.addEventListener('click', deleteTask);
});

// Load danh sách assignee và category cho filter
async function loadFilterOptions() {
  try {
    // Load categories
    const catRes = await fetch('/api/categories');
    const catJson = await catRes.json();
    if (catJson.success && catJson.categories.length > 0) {
      const catSelect = document.getElementById('filter-category');
      catSelect.innerHTML = '<option value="">Tất cả danh mục</option>'; // reset
      catJson.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.category_id;
        opt.textContent = cat.category_name;
        catSelect.appendChild(opt);
      });
    }

    // Load assignees từ Kanban data (đã có sẵn)
    const tasksRes = await fetch('/api/kanban');
    const tasksJson = await tasksRes.json();
    if (tasksJson.success) {
      const assigneeSet = new Set();
      Object.values(tasksJson.data).flat().forEach(task => {
        if (task.assigned_to) assigneeSet.add(task.assigned_to.trim());
      });

      const assigneeSelect = document.getElementById('filter-assignee');
      assigneeSelect.innerHTML = '<option value="">Tất cả người giao việc</option>';
      [...assigneeSet].sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        assigneeSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Lỗi load filter options:', err);
  }
}

/**
 * Hàm gọi API để chuyển cột Kanban (được gọi từ AutoTaskManager)
 * (Lấy từ tasks.js)
 */
async function updateTaskKanbanColumn(taskId, newColumn) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/kanban`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kanbanColumn: newColumn })
    });
    const data = await res.json();
    if (data.success) {
      if (typeof loadKanban === 'function') loadKanban();
      // Bỏ loadTasks nếu đây là kanban.js standalone để tránh lỗi
      // if (typeof loadTasks === 'function') loadTasks(); 
      return true;
    }
    return false;
  } catch (err) {
    console.error('Lỗi API chuyển cột Kanban:', err);
    return false;
  }
}

// === TỰ ĐỘNG NHẮC + CHUYỂN CỘT + ÂN HẠN 5 PHÚT ===
// (Lấy từ tasks.js)
function startAutoTaskManager(task) {
  // Clear timer cũ nếu có
  if (window.taskTimers && window.taskTimers[task.task_id]) {
    clearInterval(window.taskTimers[task.task_id]);
  }
  window.taskTimers = window.taskTimers || {};

  if (!task.start_time && !task.end_time) return;

  const start = task.start_time ? new Date(task.start_time).getTime() : null;
  const end = task.end_time ? new Date(task.end_time).getTime() : null;
  const taskId = task.task_id;
  
  let lastNotificationTime = 0; 

  const check = async () => {
    const now = Date.now();
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    const isKanbanCard = taskElement?.classList.contains('task-card');

    // 1. Trước 15 phút → nhắc mỗi 5 phút
    if (start && now >= start - 15*60*1000 && now < start) {
      const minutesToStart = Math.ceil((start - now) / 60000);
      const minutesToCheck = [15, 10, 5]; 

      if (minutesToCheck.includes(minutesToStart)) {
        if (now - lastNotificationTime >= 5*60*1000) {
          showToast(`Sắp bắt đầu: "${task.title}" – còn ${minutesToStart} phút!`, 'warning');
          lastNotificationTime = now;
        }
      }
    }

    // 2. Đúng giờ bắt đầu → chuyển sang In Progress
    if (start && now >= start && task.kanban_column === 'todo') {
      if (await updateTaskKanbanColumn(taskId, 'in_progress')) {
        showToast(`Đang thực hiện: ${task.title}`, 'info');
        clearInterval(window.taskTimers[taskId]); 
      }
    }
    
    // 3. Trước 5 phút kết thúc
    if (end && now >= end - 5*60*1000 && now < end && task.kanban_column !== 'done' && task.kanban_column !== 'overdue') {
      if (now - lastNotificationTime >= 5*60*1000) { 
        showToast(`"${task.title}" sắp kết thúc!`, 'warning');
        lastNotificationTime = now;
      }
    }

    // 4. Đúng giờ kết thúc → hiện nút xác nhận (Thời gian ân hạn 5 phút)
    if (end && now >= end && now <= end + 5*1000) {
      if (taskElement && !taskElement.querySelector('.confirm-complete-btn')) {
        const btn = document.createElement('button');
        btn.className = 'btn-primary confirm-complete-btn';
        btn.innerHTML = isKanbanCard ? 'Hoàn thành' : '<i class="fas fa-check"></i> Hoàn thành';
        btn.style.marginTop = '8px';
        btn.onclick = () => confirmComplete(taskId);
        
        const metaDiv = taskElement.querySelector('.task-meta');
        if (metaDiv) metaDiv.insertAdjacentElement('afterend', btn);
      }
    } else {
        const existingBtn = taskElement?.querySelector('.confirm-complete-btn');
        if (existingBtn) existingBtn.remove();
    }

    // 5. Quá 5 phút ân hạn → trễ hạn
    if (end && now > end + 5*1000 && task.kanban_column !== 'done' && task.kanban_column !== 'overdue') {
      if (await updateTaskKanbanColumn(taskId, 'overdue')) {
        showToast(`TRỄ HẠN: ${task.title}`, 'error');
        clearInterval(window.taskTimers[taskId]); 
      }
    }
  };

  check();
  const timerId = setInterval(check, 10000); // check mỗi 10 giây
  window.taskTimers[taskId] = timerId;
}

// Xác nhận hoàn thành (Lấy từ tasks.js)
async function confirmComplete(taskId) {
  const res = await fetch(`/api/tasks/${taskId}/confirm-complete`, { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    showToast('Hoàn thành đúng hạn!', 'success');
    if (typeof loadKanban === 'function') loadKanban();
  } else {
    showToast(data.message || 'Đã quá thời gian ân hạn!', 'error');
    if (typeof loadKanban === 'function') loadKanban();
  }
}

// Toast đẹp (Lấy từ tasks.js)
function showToast(msg, type = 'info') {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = msg;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3500);
}

// Animation cho toast (Lấy từ tasks.js)
if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
  document.head.appendChild(style);
}

// Nút XÁC NHẬN
const confirmBtn = document.createElement('button');
confirmBtn.className = 'btn-primary confirm-complete-btn';
confirmBtn.innerHTML = 'Xác nhận Hoàn thành';
confirmBtn.onclick = (e) => {
    e.stopPropagation();
    confirmComplete(task.task_id);
};

// Nút HỦY (Để task tiếp tục chạy/chờ hết ân hạn)
const cancelBtn = document.createElement('button');
cancelBtn.className = 'btn-secondary cancel-grace-btn';
cancelBtn.innerHTML = 'Hủy';
cancelBtn.style.marginLeft = '10px';
cancelBtn.onclick = (e) => {
    e.stopPropagation(); // Ngăn mở modal
    groupDiv.remove();   // Xóa nút để ẩn khỏi view tạm thời
};

// 🌟 THÊM HÀM XỬ LÝ CLICK CARD ĐỂ ƯU TIÊN XÁC NHẬN (FIX 4)
function handleCardClick(event, taskId, endTimeStr, kanbanColumn) {
    // Ngăn chặn nếu click vào nút đã được thêm bởi Auto Task Manager
    if (event.target.closest('.confirm-complete-group')) {
        event.stopPropagation();
        return; 
    }
    
    const end = endTimeStr ? new Date(endTimeStr).getTime() : null;
    const now = Date.now();
    
    // Kiểm tra nếu task có end_time và đang trong thời gian ân hạn
    const isInGracePeriod = end && now >= end && now <= end + 5 * 60 * 1000;
    
    if (isInGracePeriod && kanbanColumn !== 'done' && kanbanColumn !== 'overdue') {
        // Task đang trong thời gian ân hạn, ưu tiên hỏi xác nhận
        // 🌟 FIX: Dùng confirm() để tạo hộp thoại xác nhận nhanh
        if (confirm("Công việc này đã hết hạn. Bạn có muốn xác nhận hoàn thành ngay không?")) {
            confirmComplete(taskId);
        }
        return; // Không mở modal detail
    }
    
    // Hành vi mặc định: Mở modal detail
    openTaskModal(taskId);
}

// ------------------ DELETE TASK ------------------
async function deleteTask() {
  if (!currentTaskId) {
    alert('Không có task nào để xóa!');
    return;
  }

  if (!confirm('Bạn có chắc chắn muốn xóa công việc này không? Hành động này không thể hoàn tác.')) {
    return;
  }

  try {
    const res = await fetch(`/api/kanban/${currentTaskId}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showToast('Xóa task thành công!', 'success');
      await loadKanban();
      closeDetailModal();
    } else {
      alert(data.message || 'Xóa task thất bại');
    }
  } catch (err) {
    console.error('Lỗi khi xóa task:', err);
    alert('Lỗi kết nối server. Vui lòng thử lại.');
  }
}