// ===================================================================
// tasks.js - FRONTEND (CHỈ XỬ LÝ UI VÀ GỌI API)
// Backend logic nằm trong controllers/taskController.js
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // TODO: Khởi tạo các chức năng khi trang load
    // loadTasks();
    // setupEventListeners();
    console.log('Tasks page loaded - Sẵn sàng kết nối với API');
});

// ===================================================================
// CÁC HÀM GỌI API (BACKEND XỬ LÝ LOGIC)
// ===================================================================

/**
 * Lấy danh sách tasks từ server
 */
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        
        if (data.success) {
            // Hiển thị lên UI
            displayTasks(data.tasks);
        } else {
            alert('Không thể tải danh sách công việc');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

/**
 * Thêm task mới
 */
async function createTask(taskData) {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Thêm thành công!');
            loadTasks(); // Reload danh sách
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

/**
 * Cập nhật task
 */
async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật thành công!');
            loadTasks();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

/**
 * Xóa task
 */
async function deleteTask(taskId) {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa thành công!');
            loadTasks();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

/**
 * Đổi trạng thái task
 */
async function changeTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadTasks();
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

// ===================================================================
// CÁC HÀM HIỂN THỊ UI (KHÔNG CÓ LOGIC NGHIỆP VỤ)
// ===================================================================

/**
 * Hiển thị danh sách tasks lên giao diện
 */
function displayTasks(tasks) {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;
    
    // Render HTML
    taskList.innerHTML = tasks.map(task => `
        <div class="task-item">
            <h3>${task.title}</h3>
            <p>${task.description || ''}</p>
            <span>Trạng thái: ${task.status}</span>
            <span>Ưu tiên: ${task.priority}</span>
            <button onclick="editTask(${task.task_id})">Sửa</button>
            <button onclick="deleteTask(${task.task_id})">Xóa</button>
        </div>
    `).join('');
}

/**
 * Mở form để edit task
 */
async function editTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const data = await response.json();
        
        if (data.success) {
            // Fill dữ liệu vào form
            fillTaskForm(data.task);
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

/**
 * Fill dữ liệu task vào form
 */
function fillTaskForm(task) {
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-status').value = task.status;
    // ... các trường khác
}

// ===================================================================
// NOTES CHO BẠN:
// ===================================================================
// 1. File này CHỈ xử lý giao diện và gọi API
// 2. KHÔNG có logic nghiệp vụ (validation phức tạp, tính toán, database)
// 3. Logic nghiệp vụ nằm trong: controllers/taskController.js
// 4. Bạn có thể tích hợp code cũ của bạn vào đây nhưng CHỈ giữ phần UI
// 5. Mọi xử lý dữ liệu đều qua API: /api/tasks
// ===================================================================
