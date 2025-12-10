// assets/js/kanban.js - Phiên bản đã fix Save/Delete
let refreshInterval = null;
let currentTaskId = null; // <-- khai báo biến lưu task đang mở

// ------------------ LOAD / RENDER ------------------
async function loadKanban() {
  try {
    const res = await fetch('/api/kanban');
    if (!res.ok) throw new Error('API lỗi');
    const { success, data } = await res.json();
    if (success) renderKanbanBoard(data);
  } catch (err) {
    console.error('Lỗi tải Kanban:', err);
  }
}
window.loadKanban = loadKanban;
function renderKanbanBoard(data) {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  board.innerHTML = '';
  
  // Dọn dẹp timer cũ trước khi render mới
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
    { id: 'overdue', title: 'OverDue', tasks: data.overdue || [], color: '#ef4444' } // <--- ĐÃ THÊM CỘT NÀY
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
                  <div class="task-meta">
                    <span class="priority-badge priority-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                    <small>Due: ${task.end_time ? new Date(task.end_time).toLocaleDateString('vi-VN') + ' ' + new Date(task.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</small>
                  </div>
                </div>
            `;
      });
    
    // ... (phần tạo colDiv.innerHTML giữ nguyên)
    colDiv.innerHTML = `
      <div class="col-header" style="border-bottom-color: ${col.color}">
        <h3 style="color:${col.color};">${col.title} <span class="badge">${col.tasks.length}</span></h3>
      </div>
      <div class="col-content task-list" data-column="${col.id}">
        ${tasksHtml}
        <button class="add-task-btn" data-column-id="${col.id}">
          <i class="fas fa-plus"></i> Add Task
        </button>
      </div>
    `;


    board.appendChild(colDiv);
    
    // Khởi động Auto Task Manager cho các task đã render
    col.tasks.forEach(task => {
        if (col.id !== 'done') { // Không chạy timer cho task đã xong
            startAutoTaskManager(task);
        }
    });
  });

  initDragAndDrop();
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
    list.addEventListener('dragover', e => {
      e.preventDefault();
    });

    list.addEventListener('drop', async e => {
      e.preventDefault();
      const card = draggedCard;
      if (!card) return;

      list.appendChild(card);
      card.classList.remove('dragging');

      const taskId = card.dataset.id;
      const newColumn = list.dataset.column;

      try {
        const res = await fetch(`/api/kanban/${taskId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column: newColumn })
        });

        if (res.ok) {
          loadKanban();
        } else {
          console.error('API Move Failed');
          // Optionally: revert UI change or notify user.
        }
      } catch (err) {
        console.error('Lỗi di chuyển task:', err);
      }
    });
  });
}

// ------------------ HELPERS ------------------
function stopAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ------------------ EVENTS / FILTERS ------------------
function attachKanbanEventListeners() {
  const filterStart = document.getElementById('filter-start');
  const filterEnd = document.getElementById('filter-end');

  document.getElementById('apply-filter').addEventListener('click', () => {
    const startDate = filterStart.value;
    const endDate = filterEnd.value;
    filterKanbanTasks(startDate, endDate);
  });

  document.getElementById('clear-filter').addEventListener('click', () => {
    filterStart.value = '';
    filterEnd.value = '';
    loadKanban();
  });

  // toolbar placeholders (guard in case buttons missing)
  const toolbarBtnExport = document.querySelector('.toolbar button:nth-child(3)');
  if (toolbarBtnExport) {
    toolbarBtnExport.addEventListener('click', () => {
      alert('Chức năng Export đang được thực hiện...');
    });
  }

  const addColumnBtn = document.getElementById('add-column');
  if (addColumnBtn) addColumnBtn.addEventListener('click', () => alert('Chức năng Thêm cột đang được phát triển.'));

  const saveBoardBtn = document.getElementById('save-board');
  if (saveBoardBtn) saveBoardBtn.addEventListener('click', () => alert('Board được tự động lưu. (Tính năng đang phát triển)'));
}

async function filterKanbanTasks(startDate, endDate) {
  let url = '/api/kanban?';
  if (startDate) url += `start=${encodeURIComponent(startDate)}&`;
  if (endDate) url += `end=${encodeURIComponent(endDate)}&`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Lỗi tải dữ liệu lọc');
    const { success, data } = await res.json();
    if (success) renderKanbanBoard(data);
  } catch (err) {
    console.error('Lỗi Filter Kanban:', err);
  }
}

// ------------------ TASK MODAL (OPEN / SAVE / DELETE) ------------------
async function openTaskModal(taskId) {
  const modal = document.getElementById('task-detail-modal');
  if (!modal) return console.error("Modal không tồn tại trong DOM!");

  try {
    const res = await fetch(`/api/kanban/${taskId}`);
    if (!res.ok) throw new Error("Không lấy được dữ liệu task");

    const { success, data } = await res.json();
    if (!success) throw new Error("API trả về lỗi");

    // populate modal fields (IDs come from kanban.ejs)
    document.getElementById('task-title').value = data.title || '';
    document.getElementById('task-desc').value = data.description || '';
    document.getElementById('task-due').value = data.end_time ? data.end_time.split('T')[0] : '';
    document.getElementById('task-priority').value = data.priority || '';
    document.getElementById('task-assignee').value = data.assignee || '';
    document.getElementById('task-progress').value = data.progress ?? 0;

    // set currentTaskId for save/delete functions
    currentTaskId = taskId;

    // open modal
    modal.classList.add('active');
  } catch (err) {
    console.error("Lỗi khi mở modal Task:", err);
    alert('Không thể tải chi tiết task. Vui lòng thử lại.');
  }
}

function closeDetailModal() {
  const modal = document.getElementById('task-detail-modal');
  if (!modal) return;
  modal.classList.remove('active');
  currentTaskId = null;
}

// Save - use PATCH to match backend route (/api/kanban/:id)
async function saveTask() {
  if (!currentTaskId) return alert('Không có task để lưu.');

  const body = {
    title: document.getElementById("task-title").value.trim(),
    description: document.getElementById("task-desc").value.trim(),
    priority: document.getElementById("task-priority").value,
    assignee: document.getElementById("task-assignee").value.trim(),
    endTime: document.getElementById("task-due").value || null,
    progress: Number(document.getElementById("task-progress").value || 0)
  };

  try {
    const res = await fetch(`/api/kanban/${currentTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // success
      await loadKanban();
      closeDetailModal();
    } else {
      console.error('Lỗi lưu task:', data);
      alert(data.message || 'Lưu task thất bại');
    }
  } catch (err) {
    console.error('Lỗi saveTask:', err);
    alert('Lỗi khi lưu task. Kiểm tra console để biết chi tiết.');
  }
}

// Delete
async function deleteTask() {
  if (!currentTaskId) return alert('Không có task để xóa.');
  if (!confirm("Bạn có chắc muốn xóa task này?")) return;

  try {
    const res = await fetch(`/api/kanban/${currentTaskId}`, {
      method: "DELETE"
    });

    const data = await res.json();
    if (res.ok && data.success) {
      await loadKanban();
      closeDetailModal();
    } else {
      console.error('Lỗi xóa task:', data);
      alert(data.message || 'Xóa task thất bại');
    }
  } catch (err) {
    console.error('Lỗi deleteTask:', err);
    alert('Lỗi khi xóa task. Kiểm tra console để biết chi tiết.');
  }
}

// ------------------ DOM INIT ------------------
document.addEventListener('DOMContentLoaded', () => {
  loadKanban();
  attachKanbanEventListeners();

  // Gắn sự kiện cho modal buttons (nếu tồn tại)
  const closeBtn = document.getElementById('close-detail');
  if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);

  const saveBtn = document.getElementById('save-task');
  if (saveBtn) saveBtn.addEventListener('click', saveTask);

  const deleteBtn = document.getElementById('delete-task');
  if (deleteBtn) deleteBtn.addEventListener('click', deleteTask);
});


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
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 10000;
    padding: 16px 24px; border-radius: 12px; color: white; font-weight: 600;
    background: ${type==='error'?'#ef4444':type==='warning'?'#f59e0b':type==='success'?'#10b981':'#6366f1'};
    box-shadow: 0 4px 20px rgba(0,0,0,0.2); animation: slideIn 0.4s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
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
// 🌟 SỬA: Thêm e.stopPropagation() để ngăn click lan truyền lên card (ngăn mở openTaskModal)
confirmBtn.onclick = (e) => {
    e.stopPropagation(); 
    confirmComplete(taskId);
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

