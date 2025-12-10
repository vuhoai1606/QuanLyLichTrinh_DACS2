// assets/js/tasks.js
// ===================================================================
// PHIÊN BẢN HOÀN CHỈNH ĐÃ FIX LỖI SCOPE VÀ ĐỒNG BỘ
// ===================================================================

// ==================== KHAI BÁO BIẾN TOÀN CỤC ====================
let tasks = []; // Dữ liệu task chính
window.taskTimers = window.taskTimers || {}; // Timer cho AutoTaskManager

let deletedTask = null;   
let currentEditId = null;

// ==================== GỌI API CHUNG (Phạm vi Toàn cục) ====================
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

// ==================== CÁC HÀM TIỆN ÍCH (Phạm vi Toàn cục) ====================

/**
 * Hàm render danh sách task (Truy cập DOM trực tiếp)
 */
const renderTasks = (taskArray, targetListEl) => {
    const taskList = targetListEl || document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const tasksToRender = taskArray || [];

    if (!taskList) return;

    taskList.innerHTML = '';
    if (tasksToRender.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    tasksToRender.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.id = task.task_id;

        const priorityClass = task.priority === 'high' ? 'priority-high' :
                            task.priority === 'medium' ? 'priority-medium' : 'priority-low';
        
        const overdueClass = task.kanban_column === 'overdue' ? 'task-item-overdue' : '';

        li.innerHTML = `
            <div class="task-main ${overdueClass}">
                <strong>${task.title}</strong>
            </div>

            <div class="task-meta">
                <span class="priority ${priorityClass}">${task.priority || 'medium'}</span>
                <span class="status">${task.status || 'todo'}</span>
                ${task.end_time ? `<small>Due: ${new Date(task.end_time).toLocaleDateString('vi-VN')} ${new Date(task.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</small>` : ''}
            </div>

            <div class="task-actions">
                <button class="btn-edit" title="Sửa"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" title="Xóa"><i class="fas fa-trash"></i></button>
            </div>
        `;
        taskList.appendChild(li);
    });
};


/**
 * Hàm tải lại dữ liệu task và render.
 * Đã được đặt vào window để kanban.js có thể gọi.
 */
const loadTasks = async () => {
    const newTasks = await api.getAll();
    tasks = newTasks; // Cập nhật biến toàn cục tasks

    // Sử dụng document.getElementById('task-list') để render
    renderTasks(tasks, document.getElementById('task-list')); 
    window.dispatchEvent(new Event('tasksUpdated')); 
    
    tasks.forEach(task => {
        if (task.status !== 'done') {
            startAutoTaskManager(task);
        }
    });
};
window.loadTasks = loadTasks; // Gắn vào window


/**
 * Hàm mở Modal Task (Truy cập DOM trực tiếp)
 */
const openModal = async (task = null) => {
    const modal = document.getElementById('task-modal');
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const inpTitle = document.getElementById('t-title');
    const inpDesc = document.getElementById('t-desc');
    const inpStart = document.getElementById('t-start'); 
    const inpEnd = document.getElementById('t-end'); 
    const inpPriority = document.getElementById('t-priority');
    const inpRecurring = document.getElementById('t-recurring');
    const inpDependency = document.getElementById('t-dependency');
    const inpAssign = document.getElementById('t-assign');
    const btnViewGantt = document.getElementById('view-gantt');
    const ganttContainer = document.getElementById('gantt-container');
    
    currentEditId = task ? task.task_id : null;
    if (modalTitle) modalTitle.textContent = task ? 'Chỉnh sửa công việc' : 'Tạo công việc mới';

    if (inpTitle) inpTitle.value = task?.title || '';
    if (inpDesc) inpDesc.value = task?.description || '';
    
    if (inpEnd) inpEnd.value = task?.end_time ? task.end_time.slice(0, 16) : ''; 
    if (inpStart) inpStart.value = task?.start_time ? task.start_time.slice(0, 16) : '';
    
    if (inpPriority) inpPriority.value = task?.priority || 'medium';
    if (inpRecurring) inpRecurring.value = task?.repeat_type || 'none'; 
    if (inpAssign) inpAssign.value = task?.assigned_to || ''; 

    if (inpDependency) inpDependency.innerHTML = '<option value="">Không phụ thuộc</option>';
    if (ganttContainer) ganttContainer.style.display = 'none';
    if (btnViewGantt) btnViewGantt.textContent = 'Xem Gantt Chart';

    if (modal) modal.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
};

const closeModal = () => {
    const modal = document.getElementById('task-modal');
    const overlay = document.getElementById('modal-overlay');
    const form = document.getElementById('form-task');
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (form) form.reset();
    currentEditId = null;
};


// ==================== AUTO TASK MANAGER LOGIC ====================

/**
 * Hàm gọi API để chuyển cột Kanban
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
        if (typeof loadTasks === 'function') loadTasks(); 
        if (typeof loadKanban === 'function') loadKanban(); 
        return true;
      }
      return false;
    } catch (err) {
      console.error('Lỗi API chuyển cột Kanban:', err);
      return false;
    }
}

/**
 * Hàm đếm ngược và chuyển cột tự động
 */
function startAutoTaskManager(task) {
    window.taskTimers = window.taskTimers || {};
    
    if (window.taskTimers[task.task_id]) {
        clearInterval(window.taskTimers[task.task_id]);
    }

    if (!task.start_time && !task.end_time) return;

    const start = task.start_time ? new Date(task.start_time).getTime() : null;
    const end = task.end_time ? new Date(task.end_time).getTime() : null;
    const taskId = task.task_id;
    
    let lastNotificationTime = 0; 

    const check = async () => {
        const now = Date.now();
        const taskElement = document.querySelector(`[data-id="${taskId}"]`);
        
        // 1. Thông báo trước 15 phút
        if (start && now >= start - 15*60*1000 && now < start) {
            const minutesToStart = Math.ceil((start - now) / 60000);
            if (minutesToStart % 5 === 0 || minutesToStart <= 5) {
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
        if (end && now >= end && now <= end + 5*60*1000) {
            if (taskElement && !taskElement.querySelector('.confirm-complete-group')) {
                
                const groupDiv = document.createElement('div');
                groupDiv.className = 'confirm-complete-group';
                groupDiv.style.marginTop = '8px';

                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'btn-primary confirm-complete-btn';
                confirmBtn.innerHTML = 'Xác nhận Hoàn thành';
                confirmBtn.onclick = () => confirmComplete(taskId);
                
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn-secondary cancel-grace-btn';
                cancelBtn.innerHTML = 'Hủy';
                cancelBtn.style.marginLeft = '10px';
                cancelBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    groupDiv.remove();
                };
                
                groupDiv.appendChild(confirmBtn);
                groupDiv.appendChild(cancelBtn);
                
                const metaDiv = taskElement?.querySelector('.task-meta');
                if (metaDiv) metaDiv.insertAdjacentElement('afterend', groupDiv);
            }
        } else {
            const existingGroup = taskElement?.querySelector('.confirm-complete-group');
            if (existingGroup) existingGroup.remove();
        }

        // 5. Quá 5 phút ân hạn → trễ hạn
        if (end && now > end + 5*60*1000 && task.kanban_column !== 'done' && task.kanban_column !== 'overdue') {
            if (await updateTaskKanbanColumn(taskId, 'overdue')) {
                showToast(`TRỄ HẠN: ${task.title}`, 'error');
                clearInterval(window.taskTimers[taskId]); 
            }
        }
    };

    check();
    const timerId = setInterval(check, 10000); 
    window.taskTimers[taskId] = timerId;
}

/**
 * Xử lý xác nhận hoàn thành
 */
async function confirmComplete(taskId) {
    const res = await fetch(`/api/tasks/${taskId}/confirm-complete`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Hoàn thành đúng hạn!', 'success');
      if (typeof loadTasks === 'function') loadTasks(); 
      if (typeof loadKanban === 'function') loadKanban();
    } else {
      showToast(data.message || 'Đã quá thời gian ân hạn!', 'error');
      if (typeof loadTasks === 'function') loadTasks(); 
      if (typeof loadKanban === 'function') loadKanban();
    }
}

/**
 * Xử lý hiển thị Toast
 */
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
// Thêm style animation cho toast
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
    document.head.appendChild(style);
}


// ==================== DOM CONTENT LOADED (Listeners) ====================
document.addEventListener('DOMContentLoaded', () => {
    // === LẤY CÁC DOM ELEMENTS CẦN THIẾT CHO LISTENERS ===
    const taskList = document.getElementById('task-list');
    const goalList = document.getElementById('goal-list');
    const restoreBtn = document.getElementById('restore-btn');
    const restoreText = document.getElementById('restore-text');
    const restoreMessage = document.getElementById('restore-message');
    const btnOpenCreate = document.getElementById('open-create');
    const btnCloseModal = document.getElementById('close-modal');
    const overlay = document.getElementById('modal-overlay');
    const form = document.getElementById('form-task');
    const searchInput = document.getElementById('search');
    const filterStatus = document.getElementById('filter-status');
    const quickFilters = document.querySelectorAll('.btn-quick-filter');
    const btnViewGantt = document.getElementById('view-gantt');
    const ganttContainer = document.getElementById('gantt-container');
    
    // Khai báo biến cục bộ
    let deletedTask = null;

    // === GẮN LISTENERS ===
    
    // Nút Tạo mới
    if (btnOpenCreate) btnOpenCreate.addEventListener('click', () => openModal());
    
    // Modal
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);
    
    // Form Submit
    if (form) form.addEventListener('submit', async e => {
        e.preventDefault();

        let existingTask = null;
        if (currentEditId) {
            existingTask = tasks.find(t => t.task_id === currentEditId);
        }

        const inpStart = document.getElementById('t-start'); 
        const inpEnd = document.getElementById('t-end'); 
        const inpTitle = document.getElementById('t-title');
        const inpDesc = document.getElementById('t-desc');
        const inpPriority = document.getElementById('t-priority');
        const inpRecurring = document.getElementById('t-recurring');
        const inpAssign = document.getElementById('t-assign');

        const payload = {
            title: inpTitle.value.trim(),
            description: inpDesc.value.trim() || null,
            end_time: inpEnd.value || null, 
            start_time: inpStart.value || existingTask?.start_time || new Date().toISOString(), 
            priority: inpPriority.value,
            repeat_type: inpRecurring.value, 
            assigned_to: inpAssign.value || null,
        };

        let result;
        if (currentEditId) {
            result = await api.update(currentEditId, payload);
        } else {
            result = await api.create(payload);
        }

        if (result.success) {
            await loadTasks();
            closeModal();
        } else {
            alert(result.message || 'Có lỗi xảy ra');
        }
    });

    // EDIT & DELETE
    if (taskList) taskList.addEventListener('click', async e => {
        const editBtn = e.target.closest('.btn-edit');
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
                if (restoreText) restoreText.textContent = `Đã xóa "${deletedTask.title}"`;
                if (restoreMessage) restoreMessage.style.display = 'block';
                setTimeout(() => { if (restoreMessage) restoreMessage.style.display = 'none'; }, 6000);
            }
        }
    });

    // UNDO XÓA
    if (restoreBtn) restoreBtn.addEventListener('click', async () => {
        if (!deletedTask) return;
        const result = await api.create({
            title: deletedTask.title,
            description: deletedTask.description,
            start_time: deletedTask.start_time,
            end_time: deletedTask.end_time,
            priority: deletedTask.priority,
            repeat_type: deletedTask.repeat_type || 'none',
            assigned_to: deletedTask.assigned_to
        });
        if (result.success) {
            await loadTasks();
            if (restoreMessage) restoreMessage.style.display = 'none';
            deletedTask = null;
        }
    });
    
    // FILTER
    if (searchInput) searchInput.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const filtered = tasks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q))
        );
        renderTasks(filtered, taskList); 
    });

    if (filterStatus) filterStatus.addEventListener('change', e => {
        const status = e.target.value;
        const filtered = status === 'all'
            ? tasks
            : tasks.filter(t => t.status === status);
        renderTasks(filtered, taskList);
    });

    if (quickFilters) quickFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            let filtered = [];
            
            // Logic Quick Filter
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filter === 'today') {
                filtered = tasks.filter(t => {
                    if (!t.start_time && !t.end_time) return false;
                    const start = t.start_time ? new Date(t.start_time) : null;
                    const end = t.end_time ? new Date(t.end_time) : null;
                    
                    const isToday = (date) => date && date.toDateString() === today.toDateString();

                    return isToday(start) || isToday(end);
                });
            } else if (filter === 'week') {
                const weekLater = new Date(today);
                weekLater.setDate(today.getDate() + 7);
                filtered = tasks.filter(t => t.end_time && new Date(t.end_time) <= weekLater);
            }

            renderTasks(filtered, taskList);
        });
    });

    // TABs
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const isGoals = tab.id === 'tab-goals';
            if (taskList) taskList.style.display = isGoals ? 'none' : 'block';
            if (goalList) goalList.style.display = isGoals ? 'block' : 'none';

            if (isGoals) renderTasks(tasks, goalList);
            else renderTasks(tasks, taskList);
        });
    });

    // GANTT
    if (btnViewGantt) btnViewGantt.addEventListener('click', () => {
        if (ganttContainer) {
            if (ganttContainer.style.display === 'block') {
                ganttContainer.style.display = 'none';
                btnViewGantt.innerHTML = 'Xem Gantt Chart';
            } else {
                ganttContainer.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">Gantt Chart sẽ được tích hợp ở đây (Frappe Gantt / mermaid / dhtmlxGantt...)</p>';
                ganttContainer.style.display = 'block';
                btnViewGantt.innerHTML = 'Đóng Gantt';
            }
        }
    });
    
    // ==================== KHỞI TẠO ====================
    loadTasks(); 

    // ==================== AUTO REFRESH ====================
    setInterval(() => {
        if (!document.hidden) loadTasks();
    }, 20000);
});