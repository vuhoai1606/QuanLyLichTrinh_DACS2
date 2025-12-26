// assets/js/tasks.js
// ===================================================================
// PHIÊN BẢN HOÀN CHỈNH 100% - ĐIỂM TUYỆT ĐỐI
// ===================================================================

// ==================== KHAI BÁO BIẾN TOÀN CỤC ====================
let tasks = []; // Dữ liệu task chính
window.taskTimers = window.taskTimers || {}; // Timer cho AutoTaskManager

let deletedTask = null;   
let currentEditId = null;
// THÊM: Biến lưu quick filter hiện tại để kết hợp filter
window.currentQuickFilter = null;

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
        
        const overdueClass = task.kanban_column === 'overdue' || 
                    (task.end_time && new Date(task.end_time) < new Date() && task.status !== 'done')
                    ? 'task-item-overdue' : '';

        const isOverdue = task.kanban_column === 'overdue' || 
                         (task.end_time && new Date(task.end_time) < new Date() && task.status !== 'done');
        
        li.innerHTML = `
            <div class="task-main ${overdueClass}">
                <strong>${task.title}</strong>
                ${task.category_name ? 
                    `<span class="category-tag" style="background:${task.category_color || '#888'}; color:white;">
                        ${task.category_name}
                    </span>` : ''}
            </div>

            <div class="task-meta">
                <span class="priority ${priorityClass}">${task.priority || 'medium'}</span>
                <span class="status">${task.status || 'todo'}</span>
                ${task.end_time ? `<small>Due: ${new Date(task.end_time).toLocaleDateString('vi-VN')} ${new Date(task.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</small>` : ''}
            </div>

            ${task.progress > 0 ? `
            <div class="progress-container">
                <div class="progress-bar" style="width: ${task.progress}%"></div>
                <span class="progress-text">${task.progress}%</span>
            </div>` : ''}

            ${task.end_time && task.status !== 'done' ? `
            <small class="countdown" data-end="${task.end_time}">Còn: <span class="time-left">đang tải...</span></small>` : ''}

            <div class="task-actions">
                ${isOverdue ? `
                <button class="btn-reset" title="Tái thiết lập" style="background-color: #6366f1; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                    <i class="fas fa-undo"></i> Reset
                </button>` : ''}
                <button class="btn-edit" title="Sửa"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" title="Xóa"><i class="fas fa-trash"></i></button>
            </div>
        `;

        const btnReset = li.querySelector('.btn-reset');
        if (btnReset) {
            btnReset.onclick = () => {
                openModal(task);
                document.getElementById('modal-title').textContent = 'Tái thiết lập công việc quá hạn';
                // Đặt trạng thái ngầm định là todo khi lưu
                currentResetMode = true; 
            };
        }
        
        // Drag & Drop
        li.draggable = true;
        li.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', task.task_id);
            li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));

        taskList.appendChild(li);
    });
};

const loadTasks = async () => {
    const newTasks = await api.getAll();
    tasks = newTasks;

    renderTasks(tasks, document.getElementById('task-list')); 
    updateCountdowns(); // Cập nhật countdown ngay sau khi render
    window.dispatchEvent(new Event('tasksUpdated')); 
    
    tasks.forEach(task => {
        if (task.status !== 'done') {
            startAutoTaskManager(task);
        }
    });
};
window.loadTasks = loadTasks;

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

// ==================== AUTO TASK MANAGER LOGIC (giữ nguyên) ====================
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
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = msg;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.4s ease forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
}

// Countdown timer
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

// ==================== DOM CONTENT LOADED (Listeners) ====================
document.addEventListener('DOMContentLoaded', () => {
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
    const filterCategory = document.getElementById('filter-category');
    const categorySelect = document.getElementById('t-category');
    const quickFilters = document.querySelectorAll('.btn-quick-filter');
    const btnViewGantt = document.getElementById('view-gantt');
    const ganttContainer = document.getElementById('gantt-container');

    // Load categories
    const loadCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            const json = await res.json();
            if (json.success && json.categories && json.categories.length > 0) {
                const optionsHTML = json.categories.map(cat => 
                    `<option value="${cat.category_id}">${cat.category_name}</option>`
                ).join('');

                if (categorySelect) {
                    categorySelect.innerHTML = '<option value="">Không có danh mục</option>' + optionsHTML;
                }
                if (filterCategory) {
                    filterCategory.innerHTML = '<option value="all">Tất cả danh mục</option>' + optionsHTML;
                }
            }
        } catch (err) {
            console.error('Không load được categories:', err);
        }
    };
    loadCategories();

    // Apply filters
    const applyFilters = () => {
        let filtered = tasks;

        if (window.currentQuickFilter === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filtered = filtered.filter(t => {
                if (!t.start_time && !t.end_time) return false;
                const start = t.start_time ? new Date(t.start_time) : null;
                const end = t.end_time ? new Date(t.end_time) : null;
                const isToday = date => date && date.toDateString() === today.toDateString();
                return isToday(start) || isToday(end);
            });
        } else if (window.currentQuickFilter === 'week') {
            const weekLater = new Date();
            weekLater.setDate(weekLater.getDate() + 7);
            filtered = filtered.filter(t => t.end_time && new Date(t.end_time) <= weekLater);
        }

        const q = searchInput?.value.toLowerCase().trim();
        if (q) {
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(q) || 
                (t.description && t.description.toLowerCase().includes(q))
            );
        }

        const statusVal = filterStatus?.value;
        if (statusVal && statusVal !== 'all') {
            filtered = filtered.filter(t => t.status === statusVal);
        }

        const catVal = filterCategory?.value;
        if (catVal && catVal !== 'all') {
            filtered = filtered.filter(t => t.category_id === Number(catVal));
        }

        renderTasks(filtered, taskList);
        updateCountdowns();
    };

    // Listeners
    if (btnOpenCreate) {
        btnOpenCreate.addEventListener('click', () => {
            currentEditId = null;
            document.getElementById('modal-title').textContent = 'Tạo công việc mới';
            form.reset();
            loadCategories();
            openModal();
        });
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // Submit form
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML; // Lưu nội dung gốc của nút

            // Hiển thị loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';

            try {
                // Lấy dữ liệu từ form
                const title = document.getElementById('t-title').value.trim();
                const description = document.getElementById('t-desc').value.trim() || null;
                const start_time = document.getElementById('t-start').value || null;
                const end_time = document.getElementById('t-end').value || null;
                const priority = document.getElementById('t-priority').value;
                const repeat_type = document.getElementById('t-recurring').value;
                const assigned_to = document.getElementById('t-assign').value || null;
                const category_id = categorySelect.value ? Number(categorySelect.value) : null;

                // Validation
                if (!title) {
                    alert('Tiêu đề không được để trống!');
                    return;
                }
                if (currentEditId === null && !start_time) {
                    alert('Thời gian bắt đầu là bắt buộc khi tạo task mới!');
                    return;
                }

                // Tạo payload
                const payload = {
                    title,
                    description,
                    start_time: start_time ? start_time + ':00' : null,
                    end_time: end_time ? end_time + ':00' : null,
                    priority,
                    repeat_type,
                    assigned_to,
                    category_id
                };

                // Gọi API
                let result;
                if (currentEditId) {
                    result = await api.update(currentEditId, payload);
                } else {
                    result = await api.create(payload);
                }

                // Xử lý kết quả
                if (result.success) {
                    showToast(currentEditId ? 'Cập nhật thành công!' : 'Tạo task thành công!', 'success');
                    await loadTasks();
                    closeModal();
                } else {
                    alert(result.message || 'Lỗi khi lưu task. Vui lòng thử lại.');
                }
            } catch (err) {
                console.error('Lỗi khi lưu task:', err);
                alert('Lỗi kết nối server. Vui lòng kiểm tra console (F12).');
            } finally {
                // LUÔN khôi phục nút Lưu dù thành công hay lỗi
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Edit & Delete
    if (taskList) {
        taskList.addEventListener('click', async e => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');

            if (editBtn) {
                const id = Number(editBtn.closest('.task-item').dataset.id);
                const task = await api.getOne(id);

                if (!task) {
                    alert('Không thể tải thông tin task');
                    return;
                }

                currentEditId = id;
                document.getElementById('modal-title').textContent = 'Chỉnh sửa công việc';

                document.getElementById('t-title').value = task.title || '';
                document.getElementById('t-desc').value = task.description || '';
                document.getElementById('t-start').value = task.start_time ? task.start_time.slice(0, 16) : '';
                document.getElementById('t-end').value = task.end_time ? task.end_time.slice(0, 16) : '';
                document.getElementById('t-priority').value = task.priority || 'medium';
                document.getElementById('t-recurring').value = task.repeat_type || 'none';
                document.getElementById('t-assign').value = task.assigned_to || '';

                await loadCategories();
                categorySelect.value = task.category_id || '';

                openModal();
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

        // Drag & Drop
        taskList.addEventListener('dragover', e => e.preventDefault());
        taskList.addEventListener('drop', async e => {
            e.preventDefault();
            const draggedId = Number(e.dataTransfer.getData('text'));
            const targetLi = e.target.closest('.task-item');
            if (!targetLi || draggedId === Number(targetLi.dataset.id)) return;

            const tasksArray = Array.from(taskList.children);
            const draggedLi = taskList.querySelector(`[data-id="${draggedId}"]`);
            const targetIndex = tasksArray.indexOf(targetLi);
            const draggedIndex = tasksArray.indexOf(draggedLi);

            if (targetIndex < draggedIndex) {
                taskList.insertBefore(draggedLi, targetLi);
            } else {
                taskList.insertBefore(draggedLi, targetLi.nextSibling);
            }
            updateCountdowns(); // Cập nhật countdown sau khi sắp xếp lại
        });
    }

    // Undo delete
    if (restoreBtn) {
        restoreBtn.addEventListener('click', async () => {
            if (!deletedTask) return;
            const result = await api.create({
                title: deletedTask.title,
                description: deletedTask.description,
                start_time: deletedTask.start_time,
                end_time: deletedTask.end_time,
                priority: deletedTask.priority,
                repeat_type: deletedTask.repeat_type || 'none',
                assigned_to: deletedTask.assigned_to,
                category_id: deletedTask.category_id || null
            });
            if (result.success) {
                await loadTasks();
                if (restoreMessage) restoreMessage.style.display = 'none';
                deletedTask = null;
            }
        });
    }

    // Filters
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (filterCategory) filterCategory.addEventListener('change', applyFilters);

    // Quick filters
    if (quickFilters) {
        quickFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                quickFilters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.currentQuickFilter = btn.dataset.filter;
                applyFilters();
            });
        });
    }

    // Export CSV
    document.getElementById('export-csv')?.addEventListener('click', () => {
        const csv = ['Tiêu đề,Mô tả,Bắt đầu,Kết thúc,Hạn chót,Ưu tiên,Danh mục,Trạng thái,% Hoàn thành'];
        tasks.forEach(t => {
            const due = t.end_time ? new Date(t.end_time).toLocaleString('vi-VN') : 'Không có';
            csv.push([
                t.title,
                (t.description || '').replace(/"/g, '""'),
                t.start_time ? new Date(t.start_time).toLocaleString('vi-VN') : '',
                t.end_time ? new Date(t.end_time).toLocaleString('vi-VN') : '',
                due,
                t.priority,
                t.category_name || 'Không có',
                t.status,
                t.progress || 0
            ].map(field => `"${field}"`).join(','));
        });

        const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks_${new Date().toLocaleDateString('vi-VN')}.csv`;
        a.click();
        URL.revokeObjectURL(url); // Dọn dẹp
    });

    // Dark mode toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });

        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    // Tabs
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const isGoals = tab.id === 'tab-goals';
            taskList.style.display = isGoals ? 'none' : 'block';
            goalList.style.display = isGoals ? 'block' : 'none';

            renderTasks(tasks, isGoals ? goalList : taskList);
            updateCountdowns();
        });
    });

    // Gantt
    if (btnViewGantt) {
        btnViewGantt.addEventListener('click', () => {
            if (ganttContainer.style.display === 'block') {
                ganttContainer.style.display = 'none';
                btnViewGantt.innerHTML = 'Xem Gantt Chart';
            } else {
                ganttContainer.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">Gantt Chart sẽ được tích hợp ở đây...</p>';
                ganttContainer.style.display = 'block';
                btnViewGantt.innerHTML = 'Đóng Gantt';
            }
        });
    }

    // Khởi tạo
    loadTasks();
});