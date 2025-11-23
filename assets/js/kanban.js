// assets/js/kanban.js
// ===================================================================
// kanban.js - PHIÊN BẢN CHUẨN: CHỈ XỬ LÝ UI + GỌI API
// Không dùng localStorage, không tự sinh ID, không tự quản lý column
// ===================================================================

function $(id) { return document.getElementById(id); }

// Hàm hỗ trợ
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'
  }[s]));
}

function formatDatetimeLocal(d) {
  if (!d) return '';
  const dt = new Date(d);
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

document.addEventListener('DOMContentLoaded', () => {
    loadKanbanBoard();
    setupKanbanListeners();
    console.log('Kanban page loaded - Kết nối API thành công');
});

// ===================================================================
// GỌI API
// ===================================================================

async function loadKanbanBoard() {
    const board = $('kanban-board');
    board.innerHTML = '<div class="loading">Đang tải bảng Kanban...</div>';
    try {
        const response = await fetch('/api/kanban');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        if (data.success) {
            renderKanbanBoard(data.columns, data.tasks);
        } else {
            alert(data.message || 'Không tải được bảng Kanban');
        }
    } catch (err) {
        console.error('Lỗi load kanban:', err);
        alert('Lỗi kết nối server');
    }
}

async function addColumn(title) {
    try {
        const response = await fetch('/api/kanban/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        const data = await response.json();
        if (data.success) loadKanbanBoard();
        else alert(data.message);
    } catch (err) {
        console.error(err);
        alert('Lỗi thêm cột');
    }
}

async function updateTaskColumn(taskId, newColumnId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/kanban`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column_id: newColumnId })
        });
        const data = await response.json();
        if (!data.success) alert(data.message);
        // Không cần reload nếu backend đã trả data mới (tối ưu hơn)
    } catch (err) {
        console.error(err);
        alert('Lỗi di chuyển task');
        loadKanbanBoard(); // fallback
    }
}

async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const data = await response.json();
        if (data.success) {
            closeModal();
            loadKanbanBoard();
        } else alert(data.message);
    } catch (err) {
        console.error(err);
        alert('Lỗi cập nhật task');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Xóa task này?')) return;
    try {
        const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            closeModal();
            loadKanbanBoard();
        } else alert(data.message);
    } catch (err) {
        console.error(err);
        alert('Lỗi xóa task');
    }
}

// ===================================================================
// RENDER UI
// ===================================================================

function renderKanbanBoard(columns, tasks) {
    const board = $('kanban-board');
    if (!board) return;

    // Sắp xếp columns theo thứ tự backend trả về
    board.innerHTML = columns.map(col => `
        <div class="kanban-column" data-column="${col.column_id}">
            <h3>${escapeHtml(col.title)} <small>(${tasks.filter(t => t.column_id === col.column_id).length})</small></h3>
            <div class="task-list" data-column="${col.column_id}"></div>
            <button class="add-task-btn" data-column="${col.column_id}">+ Thêm task</button>
        </div>
    `).join('');

    // Render tasks vào từng cột
    document.querySelectorAll('.task-list').forEach(list => {
        const columnId = list.dataset.column;
        const columnTasks = tasks.filter(t => t.column_id === columnId);

        list.innerHTML = columnTasks.map(task => `
            <div class="kanban-task" data-id="${task.task_id}">
                <div class="task-title">${escapeHtml(task.title)}</div>
                ${task.due_date ? `<small>Hạn: ${new Date(task.due_date).toLocaleDateString('vi-VN')}</small>` : ''}
                <div class="task-priority priority-${task.priority || 'low'}">${task.priority || ''}</div>
            </div>
        `).join('');
    });

    // Khởi tạo Sortable cho từng cột
    document.querySelectorAll('.task-list').forEach(list => {
        new Sortable(list, {
            group: 'kanban',
            animation: 150,
            onEnd: (evt) => {
                const taskId = evt.item.dataset.id;
                const newColumnId = evt.to.dataset.column;
                if (taskId && newColumnId && evt.from.dataset.column !== newColumnId) {
                    updateTaskColumn(taskId, newColumnId);
                }
            }
        });
    });

    // Thêm task nhanh
    document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.onclick = () => openTaskModal(null, btn.dataset.column);
    });

    // Click để mở chi tiết task
    document.querySelectorAll('.kanban-task').forEach(card => {
        card.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            openTaskModal(card.dataset.id);
        };
    });
}

// ===================================================================
// MODAL TASK DETAIL
// ===================================================================

let currentTaskId = null;
let currentColumnId = null;

function openTaskModal(taskId = null, columnId = null) {
    currentTaskId = taskId;
    currentColumnId = columnId || $('kanban-board').querySelector('.kanban-column').dataset.column;

    if (taskId) {
        // Load chi tiết task
        fetch(`/api/tasks/${taskId}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const t = data.task;
                    $('task-title').value = t.title;
                    $('task-desc').value = t.description || '';
                    $('task-due').value = formatDatetimeLocal(t.due_date);
                    $('task-priority').value = t.priority || 'medium';
                    $('task-assignee').value = t.assignee || '';
                }
            });
    } else {
        // Tạo mới
        $('task-title').value = '';
        $('task-desc').value = '';
        $('task-due').value = '';
        $('task-priority').value = 'medium';
        $('task-assignee').value = '';
    }

    $('task-detail-modal').style.display = 'flex';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    currentTaskId = null;
    currentColumnId = null;
}

// ===================================================================
// EVENT LISTENERS
// ===================================================================

function setupKanbanListeners() {
    // Thêm cột
    $('add-column').addEventListener('click', () => {
        const title = prompt('Tên cột mới:');
        if (title?.trim()) addColumn(title.trim());
    });

    // Lưu board (nếu muốn batch save)
    $('save-board').addEventListener('click', () => {
        alert('Đã tự động lưu khi di chuyển!');
    });

    // Modal task
    $('save-task').addEventListener('click', () => {
        const taskData = {
            title: $('task-title').value.trim(),
            description: $('task-desc').value.trim(),
            due_date: $('task-due').value || null,
            priority: $('task-priority').value,
            assignee: $('task-assignee').value.trim(),
            column_id: currentColumnId
        };

        if (!taskData.title) return alert('Nhập tiêu đề task!');

        if (currentTaskId) {
            updateTask(currentTaskId, taskData);
        } else {
            // Tạo mới
            fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    closeModal();
                    loadKanbanBoard();
                } else alert(data.message);
            });
        }
    });

    $('delete-task').addEventListener('click', () => {
        if (currentTaskId) deleteTask(currentTaskId);
    });

    $('close-detail').addEventListener('click', closeModal);
    $('close-column').addEventListener('click', closeModal);

    // Đóng modal khi click ngoài
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    });
}

// ===================================================================
// NOTES CHO BACKEND DEVELOPER (rất quan trọng!)
// ===================================================================
// Frontend này đang sử dụng đúng các API sau:
//
// 1. GET    /api/kanban 
//      → Trả về: { success: true, columns: [...], tasks: [...] }
//      → columns: [{ column_id, title, position?... }]
//      → tasks:    [{ task_id, title, description, due_date, priority, assignee, column_id, ... }]
//
// 2. POST   /api/kanban/columns  
//      → Body: { title }
//      → Trả về: { success: true, column: { column_id, title } }
//
// 3. PATCH  /api/tasks/:id/kanban
//      → Body: { column_id }
//      → Chỉ cập nhật column_id của task khi kéo thả
//
// 4. GET    /api/tasks/:id           → Lấy chi tiết task để fill modal
// 5. POST   /api/tasks               → Tạo task mới (có kèm column_id)
// 6. PUT    /api/tasks/:id           → Cập nhật toàn bộ task
// 7. DELETE /api/tasks/:id           → Xóa task
//
// Không cần API /api/kanban/save vì đã tự động lưu từng thay đổi (real-time)
// Không cần API riêng cho edit column (hiện chưa có chức năng sửa tên cột)
//
// Nếu muốn thêm:
// - PUT    /api/kanban/columns/:id        → Sửa tên cột
// - DELETE /api/kanban/columns/:id        → Xóa cột (cẩn thận cascade)
// - PATCH  /api/kanban/reorder            → Sắp xếp lại thứ tự cột
// ===================================================================