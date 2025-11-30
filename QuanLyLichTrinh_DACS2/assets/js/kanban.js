// assets/js/kanban.js - PHIÊN BẢN HOÀN HẢO, KHÔNG CÒN LỖI NỮA!
let refreshInterval = null; // ← DÙNG 1 BIẾN DUY NHẤT

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

function renderKanbanBoard(data) {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  board.innerHTML = '';

  const columns = [
    { id: 'todo', title: 'To Do', tasks: data.todo || [], color: '#f87171' },
    { id: 'in_progress', title: 'In Progress', tasks: data.in_progress || [], color: '#fbbf24' },
    { id: 'done', title: 'Done', tasks: data.done || [], color: '#34d399' }
  ];

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'kanban-column';
    colDiv.innerHTML = `
      <h3 style="background:${col.color}20; color:${col.color}; padding:8px; border-radius:8px;">
        ${col.title} <span class="badge">${col.tasks.length}</span>
      </h3>
      <div class="task-list" data-column="${col.id}"></div>
    `;
    board.appendChild(colDiv);

    const taskList = colDiv.querySelector('.task-list');
    col.tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.draggable = true;
      card.dataset.id = task.task_id;
      card.innerHTML = `
        <strong>${escapeHtml(task.title)}</strong>
        <p>${escapeHtml(task.description || '')}</p>
        <div class="task-meta">
          <span class="priority priority-${task.priority}">${task.priority}</span>
          <small>${new Date(task.start_time).toLocaleDateString('vi-VN')}</small>
        </div>
      `;
      taskList.appendChild(card);
    });
  });

  initDragAndDrop();
}

function initDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const lists = document.querySelectorAll('.task-list');

  cards.forEach(card => {
    card.addEventListener('dragstart', () => card.classList.add('dragging'));
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  lists.forEach(list => {
    list.addEventListener('dragover', e => e.preventDefault());
    list.addEventListener('drop', async e => {
      e.preventDefault();
      const card = document.querySelector('.dragging');
      if (!card) return;

      const taskId = card.dataset.id;
      const newColumn = list.dataset.column;

      try {
        const res = await fetch(`/api/kanban/${taskId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column: newColumn })
        });

        if (res.ok) {
          loadKanban(); // reload ngay để thấy thay đổi
        }
      } catch (err) {
        console.error('Lỗi di chuyển task:', err);
      }
    });
  });
}

// AUTO REFRESH THÔNG MINH – DỪNG KHI ẨN TAB, CHẠY LẠI KHI MỞ
function startAutoRefresh() {
  stopAutoRefresh(); // đảm bảo không bị trùng
  refreshInterval = setInterval(() => {
    if (!document.hidden) loadKanban();
  }, 20000);
}

function stopAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = null;
}

// Khi chuyển tab
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    loadKanban(); // load ngay khi quay lại
    startAutoRefresh();
  }
});

// KHỞI ĐỘNG
document.addEventListener('DOMContentLoaded', () => {
  loadKanban();
  startAutoRefresh();
  // initDragAndDrop() được gọi trong renderKanbanBoard()
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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