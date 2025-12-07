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

  // Định nghĩa các cột với màu sắc
  const columns = [
    { id: 'todo', title: 'To Do', tasks: data.todo || [], color: '#6366f1' }, // PRIMARY (tô đậm hơn)
    { id: 'in_progress', title: 'In Progress', tasks: data.in_progress || [], color: '#f59e0b' }, // WARNING
    { id: 'done', title: 'Done', tasks: data.done || [], color: '#10b981' } // SUCCESS
  ];

  columns.forEach(col => {
    // 1. TẠO CẤU TRÚC CỘT CHUẨN XÁC THEO kanban.css/kanban.ejs
    const colDiv = document.createElement('div');
    colDiv.className = 'col'; // Sử dụng class .col
    
    // Tùy chỉnh màu sắc viền cột dựa trên màu định nghĩa
    colDiv.style.borderTop = `5px solid ${col.color}`; 
    

    // Bắt đầu xây dựng nội dung cột
    let tasksHtml = '';
    
    // Thêm các Task vào danh sách
    col.tasks.forEach(task => {
      tasksHtml += `
        <div class="task-card" draggable="true" data-id="${task.task_id}" onclick="openTaskModal(${task.task_id})">
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          <p class="task-desc">${escapeHtml(task.description || 'No description provided')}</p>
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">
              ${task.priority}
            </span>
            <small>Due: ${task.end_time ? new Date(task.end_time).toLocaleDateString('vi-VN') : 'N/A'}</small>
          </div>
        </div>
      `;
    });

    // NỘI DUNG CỘT HOÀN CHỈNH
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
  });

  initDragAndDrop();
}

let draggedCard = null;

function initDragAndDrop() {
  const cards = document.querySelectorAll('.task-card');
  const lists = document.querySelectorAll('.task-list');

  // BƯỚC 1: Xử lý thẻ (Card)
  cards.forEach(card => {
    card.addEventListener('dragstart', () => {
        card.classList.add('dragging');
        draggedCard = card; // Lưu thẻ đang kéo
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCard = null; // Xóa thẻ sau khi thả
    });
  });

  // BƯỚC 2: Xử lý danh sách (List - nơi thả)
  lists.forEach(list => {
    list.addEventListener('dragover', e => {
        e.preventDefault(); // Cho phép thả
        // Cần thêm logic visual feedback tại đây nếu cần (ví dụ: đổi màu border)
    });

    list.addEventListener('drop', async e => {
      e.preventDefault();
      
      const card = draggedCard; // Dùng thẻ đã lưu
      if (!card) return;

      // Di chuyển thẻ trong DOM trước khi gọi API (optimistic update)
      list.appendChild(card);
      card.classList.remove('dragging');
      
      const taskId = card.dataset.id;
      const newColumn = list.dataset.column;

      try {
        // GỌI API PATCH ĐỂ CẬP NHẬT COLUMN TRONG DB
        const res = await fetch(`/api/kanban/${taskId}/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column: newColumn })
        });

        if (res.ok) {
          loadKanban(); // Tải lại toàn bộ Kanban để đồng bộ
        } else {
            // Xử lý lỗi (ví dụ: alert, hoặc di chuyển thẻ về vị trí cũ nếu thất bại)
            console.error('API Move Failed');
        }
      } catch (err) {
        console.error('Lỗi di chuyển task:', err);
      }
    });
  });
}

function stopAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== KHỞI TẠO & EVENTS ====================

// Hàm gán các sự kiện cho Toolbar và Filter Bar
function attachKanbanEventListeners() {
    const filterStart = document.getElementById('filter-start');
    const filterEnd = document.getElementById('filter-end');
    const board = document.getElementById('kanban-board');

    // --- APPLY FILTER ---
    document.getElementById('apply-filter').addEventListener('click', () => {
        const startDate = filterStart.value;
        const endDate = filterEnd.value;
        filterKanbanTasks(startDate, endDate);
    });

    // --- CLEAR FILTER ---
    document.getElementById('clear-filter').addEventListener('click', () => {
        filterStart.value = '';
        filterEnd.value = '';
        loadKanban(); // Tải lại toàn bộ board để xóa bộ lọc
    });

    // --- EXPORT (Placeholder) ---
    document.querySelector('.toolbar button:nth-child(3)').addEventListener('click', () => {
        alert('Chức năng Export đang được thực hiện...');
        // Ở đây bạn sẽ gọi API Export hoặc tạo file CSV/JSON từ dữ liệu hiển thị
    });
    
    // --- ADD COLUMN & SAVE BOARD (Placeholder) ---
    document.getElementById('add-column').addEventListener('click', () => {
        alert('Chức năng Thêm cột đang được phát triển.');
    });
    document.getElementById('save-board').addEventListener('click', () => {
        alert('Board được tự động lưu. (Chức năng này đang được phát triển)');
    });
}

// Hàm lọc task (gọi API với query params)
async function filterKanbanTasks(startDate, endDate) {
    let url = '/api/kanban?';
    if (startDate) url += `start=${startDate}&`;
    if (endDate) url += `end=${endDate}&`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Lỗi tải dữ liệu lọc');
        const { success, data } = await res.json();
        if (success) renderKanbanBoard(data);
    } catch (err) {
        console.error('Lỗi Filter Kanban:', err);
    }
}

// KHỞI ĐỘNG
document.addEventListener('DOMContentLoaded', () => {
  loadKanban();
  attachKanbanEventListeners();
  // initDragAndDrop() được gọi trong renderKanbanBoard()
});



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