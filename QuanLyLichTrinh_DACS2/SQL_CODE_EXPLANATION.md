# 📖 GIẢI THÍCH CODE SQL CHI TIẾT (Dòng Theo Dòng)

> Hướng dẫn này giải thích **code hoạt động như thế nào**, từng dòng code làm gì, tại sao lại viết vậy.

---

## 1️⃣ TASKS (Công Việc) - Chi Tiết Code

### 1.1 📁 **File: `services/taskService.js`** - Dòng 1-15

```javascript
const pool = require('../config/db');

/**
 * TASK SERVICE
 * ============
 * Service xử lý nghiệp vụ liên quan đến Tasks:
 * - CRUD operations
 * - Search và filter
 * - Validation
 * - Business logic phức tạp
 */

class TaskService {
```

**Giải thích dòng code:**
- **Dòng 1**: `const pool = require('../config/db');` 
  - Import đối tượng `pool` từ file `config/db.js`
  - `pool` là **kết nối chung** tới PostgreSQL, không tạo kết nối mới cho mỗi query
  - Dùng để chạy tất cả SQL truy vấn trong service này

---

### 1.2 📁 **File: `services/taskService.js`** - Dòng 18-102 (Hàm `getTasksByUser`)

```javascript
async getTasksByUser(userId, filters = {}) {
  // 🔹 Bước 1: Destructure tham số filters
  const { 
    status,           // Ví dụ: 'done', 'todo', 'in_progress'
    priority,         // Ví dụ: 'high', 'medium', 'low'
    search,           // Ví dụ: 'học tiếng Anh'
    sortBy = 'created_at',     // Sắp xếp theo trường nào (mặc định: ngày tạo)
    sortOrder = 'DESC',        // Mặc định: sắp xếp giảm dần (mới nhất trước)
    groupByKanban = false,     // Có nhóm theo Kanban không
    startDate,        // Từ ngày bao nhiêu
    endDate           // Đến ngày bao nhiêu
  } = filters;

  // 🔹 Bước 2: Xây dựng câu SQL cơ bản (base query)
  let query = `
    SELECT 
      t.*,                        -- Lấy tất cả cột từ bảng tasks
      c.category_name,            -- Lấy tên category
      c.color AS color            -- Lấy màu category (đặt alias là 'color')
    FROM tasks t                  -- Bảng chính là tasks, alias là 't'
    LEFT JOIN categories c ON t.category_id = c.category_id  
    -- LEFT JOIN: lấy tất cả tasks, ngay cả khi không có category
    WHERE t.user_id = $1          -- Chỉ lấy tasks của user này (tham số #1)
  `;

  const params = [userId];        // Mảng tham số: params[0] = userId
  let paramIndex = 2;             // Biến đếm tham số tiếp theo ($2, $3, v.v.)
```

**Giải thích:**
- **LEFT JOIN categories**: Nếu task không có category, vẫn hiển thị task nhưng `category_name` và `color` sẽ là `NULL`
- **$1, $2, $3...**: Placeholder an toàn, ngăn chặn **SQL Injection**
  - Ví dụ: Nếu user nhập `' OR '1'='1`, nó không bị thực thi như SQL, mà chỉ là chuỗi thường
- **paramIndex**: Để biết tham số tiếp theo là `$2` (vì `$1` đã dùng cho userId)

```javascript
  // 🔹 Bước 3: Thêm filter theo từng điều kiện

  // Filter 1: Lọc theo trạng thái (status)
  if (status) {
    query += ` AND t.status = $${paramIndex}`;  // Thêm vào câu WHERE
    params.push(status);                         // Thêm giá trị vào mảng
    paramIndex++;                                // Tăng số tham số lên ($2 → $3)
  }

  // Filter 2: Lọc theo ưu tiên (priority)
  if (priority) {
    query += ` AND t.priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  // Filter 3: Tìm kiếm theo title hoặc description
  if (search) {
    // ILIKE = case-insensitive LIKE (không phân biệt hoa/thường)
    // %${search}% = chứa từ bất kì vị trí nào
    query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);  // Chỉ đẩy 1 lần, nhưng dùng $n 2 lần
    paramIndex++;
  }

  // Filter 4: Lọc theo khoảng thời gian (startDate ~ endDate)
  if (startDate) {
    query += ` AND t.end_time >= $${paramIndex}`;  // >= = lớn hơn hoặc bằng
    params.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    query += ` AND t.end_time <= $${paramIndex}`;  // <= = nhỏ hơn hoặc bằng
    params.push(endDate);
    paramIndex++;
  }

  // Filter 5: Lọc theo người được giao (assignee)
  if (filters.assignee) {
    query += ` AND t.assigned_to = $${paramIndex}`;
    params.push(filters.assignee);
    paramIndex++;
  }

  // Filter 6: Lọc theo danh mục (category)
  if (filters.categoryId) {
    query += ` AND t.category_id = $${paramIndex}`;
    params.push(filters.categoryId);
    paramIndex++;
  }

  // 🔹 Bước 4: Thêm sắp xếp (ORDER BY)
  const allowedSortFields = ['created_at', 'start_time', 'end_time', 'priority', 'title'];
  // Chỉ cho phép sắp xếp theo các trường này (an toàn, ngăn SQL Injection)
  
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  // Nếu sortBy nằm trong danh sách trắng, dùng nó; không thì dùng 'created_at'
  
  query += ` ORDER BY t.${sortField} ${sortOrder}`;
  // Thêm vào cuối câu: ORDER BY tasks.created_at DESC

  // 🔹 Bước 5: THỰC THI QUERY
  const result = await pool.query(query, params);
  // pool.query(câu SQL, [tham số])
  // Gửi query tới PostgreSQL và chờ kết quả
  // result = { rows: [...], rowCount: số dòng trả về }
  
  const tasks = result.rows;  // Lấy mảng dữ liệu: [ { task_id: 1, title: '...', ... }, ... ]

  // 🔹 Bước 6: Nếu muốn nhóm theo Kanban, xử lý ở đây
  if (groupByKanban) {
    const grouped = {
      todo: [],           // Cột "Cần làm"
      in_progress: [],    // Cột "Đang làm"
      done: [],           // Cột "Hoàn thành"
      overdue: []         // Cột "Quá hạn"
    };

    // Duyệt từng task và cho vào cột tương ứng
    tasks.forEach(task => {
      if (task.kanban_column === 'todo') grouped.todo.push(task);
      else if (task.kanban_column === 'in_progress') grouped.in_progress.push(task);
      else if (task.kanban_column === 'done') grouped.done.push(task);
      else if (task.kanban_column === 'overdue') grouped.overdue.push(task);
      else grouped.todo.push(task);  // Mặc định vào 'todo' nếu không rõ
    });

    return grouped;  // Trả về: { todo: [], in_progress: [], done: [], overdue: [] }
  }

  return tasks;  // Trả về mảng tasks bình thường nếu không nhóm
}
```

**Tại sao viết như vậy?**
- **Dynamic Query**: Chỉ thêm WHERE nào cần thiết (nếu không filter priority, thì không thêm `AND priority = ...`)
- **Parameterized**: Dùng `$1, $2, $3...` để an toàn SQL Injection
- **Flexible**: Cùng 1 hàm có thể: lọc status, lọc priority, tìm kiếm, sắp xếp, hoặc kết hợp tất cả

---

### 1.3 📁 **File: `controllers/taskController.js`** - Dòng 140-175 (Hàm `updateTask`)

```javascript
exports.updateTask = async (req, res) => {
  try {
    const userId = req.session.userId;      // Lấy user ID từ session (đã login)
    const { id: taskId } = req.params;      // Lấy task ID từ URL (/tasks/:id)
    const data = req.body;                  // Dữ liệu cập nhật từ request body (form data)

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    // 🔹 BỨC 1: KIỂM TRA QUYỀN (Security check)
    const check = await pool.query(
      'SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );
    // Query này kiểm tra:
    //   - Có task với ID này không? (task_id = $1)
    //   - Task có thuộc về user hiện tại không? (user_id = $2)
    // Nếu kết quả rỗng → user không sở hữu task này → người khác cố truy cập
    
    if (check.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task không tồn tại' 
      });
    }

    // 🔹 BƯỚC 2: LOGIC NGHIỆP VỤ
    // Khi thay đổi end_time (ngày kết thúc), xóa grace_end_time (thời gian được phép thêm)
    if (data.end_time !== undefined) {
      data.grace_end_time = null;
    }
    // Ví dụ: User thay đổi deadline từ "15/1" thành "20/1" → reset lại thời gian được phép

    // 🔹 BƯỚC 3: XÂY DỰNG QUERY ĐỘNG
    // Tại sao động? Vì user chỉ muốn update 1-2 trường, không cần update tất cả
    // Ví dụ:
    //   - Chỉ cập nhật title: UPDATE tasks SET title = $1 WHERE ...
    //   - Cập nhật title + priority: UPDATE tasks SET title = $1, priority = $2 WHERE ...
    
    const fields = [];      // Danh sách trường cần update
    const values = [];      // Danh sách giá trị tương ứng
    let index = 1;          // Biến đếm: $1, $2, $3...

    for (const [key, value] of Object.entries(data)) {
      // Object.entries(data) = [['title', 'Task mới'], ['priority', 'high'], ...]
      // key = 'title', value = 'Task mới'
      // key = 'priority', value = 'high'
      
      if (value !== undefined && value !== null) {
        // Chỉ thêm vào nếu giá trị có ý nghĩa (không undefined, không null)
        // Vì: null có thể là ý định (xóa dữ liệu), undefined là không cần update
        
        fields.push(`${key} = $${index}`);
        // Ví dụ: 'title = $1', 'priority = $2', ...
        
        values.push(value);
        // Ví dụ: ['Task mới', 'high', ...]
        
        index++;  // Tăng con số: $1 → $2 → $3...
      }
    }

    if (fields.length === 0) {
      // Nếu không có trường nào để update (data rỗng)
      return res.json({ 
        success: true, 
        message: 'Không có thay đổi' 
      });
    }

    // 🔹 BƯỚC 4: CHẠY UPDATE QUERY
    values.push(taskId);
    // Thêm taskId vào cuối values (cho WHERE clause)
    // values = ['Task mới', 'high', 123]  (123 = taskId)
    
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = $${index} RETURNING *`;
    // fields.join(', ') = 'title = $1, priority = $2'
    // Câu SQL: UPDATE tasks SET title = $1, priority = $2 WHERE task_id = $3 RETURNING *
    // RETURNING * = trả về toàn bộ row sau khi cập nhật

    const result = await pool.query(query, values);
    const updatedTask = result.rows[0];
    // result.rows = [{ task_id: 123, title: 'Task mới', priority: 'high', ... }]
    // updatedTask = row đầu tiên

    // 🔹 BƯỚC 5: TẠO NOTIFICATION
    if (data.status || data.start_time !== undefined || data.end_time !== undefined) {
      // Nếu update một trong 3 trường quan trọng này, tạo notification
      await notificationService.createNotification({
        userId,
        title: 'Nhiệm vụ được cập nhật',
        message: `Nhiệm vụ "${updatedTask.title}" đã được chỉnh sửa`,
        type: 'task'
      });
    }

    // 🔹 BƯỚC 6: TRẢ VỀ KẾT QUẢ
    res.json({ 
      success: true, 
      task: updatedTask 
    });

    // 🔹 BƯỚC 7: LOG (Debug)
    console.log('Payload update task:', data);
    // In ra data để kiểm tra (dùng cho debugging)

  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};
```

**Tại sao viết vậy?**
- **Dynamic SQL**: Không viết cứng `UPDATE tasks SET title=... priority=...` vì user có thể chỉ update title
- **Parameterized**: Tránh SQL Injection
- **Security check**: Đảm bảo user chỉ update task của chính mình
- **RETURNING ***: Trả về row mới sau update (để frontend hiển thị ngay mà không cần query lại)

---

### 1.4 📁 **File: `services/taskService.js`** - Dòng 122-145 (Hàm `createTask`)

```javascript
async createTask(userId, taskData) {
  const {
    title,
    description,
    start_time,
    end_time,
    priority = 'medium',        // Nếu không truyền, mặc định 'medium'
    status = 'todo',            // Nếu không truyền, mặc định 'todo'
    repeatType = 'none',        // Không lặp lại
    categoryId,
    tags = [],
    collaborators = [],
  } = taskData;

  // 🔹 VALIDATION 1: Kiểm tra title
  if (!title || title.trim().length === 0) {
    throw new Error('Tiêu đề task không được để trống');
    // throw = ném lỗi ra ngoài
    // Lỗi sẽ bị bắt ở controller (catch block)
  }

  if (title.length > 255) {
    throw new Error('Tiêu đề task không được vượt quá 255 ký tự');
    // Giới hạn độ dài để tránh nhập quá dài
  }

  // 🔹 VALIDATION 2: Kiểm tra thời gian
  const taskStartTime = start_time ? new Date(start_time) : new Date();
  // Nếu có start_time thì parse thành Date object, không thì dùng hiện tại
  
  const taskEndTime = end_time ? new Date(end_time) : null;
  // Nếu có end_time thì parse, không thì để null

  if (taskEndTime && taskStartTime && taskEndTime < taskStartTime) {
    throw new Error('Thời gian kết thúc không thể trước thời gian bắt đầu');
    // Đảm bảo end_time > start_time (logic có ý nghĩa)
  }

  // 🔹 VALIDATION 3: Kiểm tra priority
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority)) {
    throw new Error('Priority không hợp lệ. Chỉ chấp nhận: low, medium, high');
    // Chỉ cho phép 3 giá trị này (không cho tùy ý)
  }

  // 🔹 VALIDATION 4: Kiểm tra status
  const validStatuses = ['todo', 'in_progress', 'done', 'overdue'];
  if (!validStatuses.includes(status)) {
    throw new Error('Status không hợp lệ');
  }

  // 🔹 BƯỚC 5: INSERT TỪ DATABASE
  const result = await pool.query(
    `INSERT INTO tasks 
     (user_id, title, description, start_time, end_time, priority, status, repeat_type, kanban_column, category_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'todo', $9)
     RETURNING *`,
    [
      userId,                    // $1
      title.trim(),              // $2 (trim = xóa khoảng trắng đầu/cuối)
      description?.trim() || null, // $3 (?: = optional chaining, nếu null thì bỏ qua)
      taskStartTime,             // $4
      taskEndTime,               // $5
      priority,                  // $6
      status,                    // $7
      repeatType,                // $8
      categoryId || null         // $9 (categoryId hoặc null nếu không có)
    ]
  );

  // 🔹 BƯỚC 6: TRƯỜNG HỢPẤY
  return result.rows[0];
  // Trả về row mới được thêm từ database
  // PostgreSQL tự sinh task_id, created_at, v.v...
}
```

**Tại sao viết vậy?**
- **Validation trước khi INSERT**: Kiểm tra dữ liệu lệnh hợp lệ trước, tránh lưu sai dữ liệu
- **RETURNING ***: Trả về row mới (có task_id tự sinh từ DB)
- **Default values**: priority mặc định 'medium', status mặc định 'todo'

---

### 1.5 📁 **File: `controllers/taskController.js`** - Dòng 75-135 (Hàm `createTask` - Khởi Tạo Form Input)

```javascript
// 🔹 ĐÂY LÀ BƯỚC KHỞI TẠO - KHI USER NHẤN NÚT "THÊM CÔNG VIỆC" (Create)
exports.createTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    // Lấy user ID từ session (đã đăng nhập)

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    // 🌟 BƯỚC 1: TẠO OBJECT "taskData" - ĐÂY LÀ DỮ LIỆU TỪ FORM INPUT
    const taskData = {
      title: req.body.title,
      // Lấy tiêu đề từ form input (VD: "Học tiếng Anh")
      
      description: req.body.description || null,
      // Lấy mô tả (nếu không có thì để null)
      
      start_time: req.body.start_time || new Date().toISOString(),
      // Lấy thời gian bắt đầu, nếu không có thì dùng bây giờ (new Date())
      
      end_time: req.body.end_time || null,
      // Lấy thời gian kết thúc (có thể null nếu task không có deadline)
      
      isAllDay: req.body.is_all_day || req.body.isAllDay || false,
      // Có phải task toàn bộ ngày không? (mặc định false)
      
      repeatType: req.body.repeat_type || req.body.repeatType || 'none',
      // Lặp lại hàng ngày/hàng tuần? (mặc định 'none' = không lặp)
      
      priority: req.body.priority || 'medium',
      // Ưu tiên: low, medium, high (mặc định 'medium')
      
      status: req.body.status || 'todo',
      // Trạng thái: todo, in_progress, done, overdue (mặc định 'todo')
      
      kanbanColumn: req.body.kanban_column || req.body.kanbanColumn || 'todo',
      // Cột Kanban ban đầu là 'todo' (Cần làm)
      
      categoryId: req.body.category_id || req.body.categoryId,
      // Danh mục (optional, có thể null)
      
      tags: req.body.tags || [],
      // Các tag/label (mặc định mảng rỗng)
      
      progress: req.body.progress || 0
      // Tiến độ: 0-100% (mặc định 0 = mới tạo)
    };
    // ✅ taskData = { title: '...', description: '...', ... }

    // 🌟 BƯỚC 2: GỌI SERVICE ĐỂ CHÈN VÀO DATABASE
    // ⭐⭐⭐ ĐÂY LÀ QUERY INSERT - XEM PHẦN 1.4 TRÊN
    const newTask = await taskService.createTask(userId, taskData);
    // taskService.createTask() sẽ:
    // 1. Validation dữ liệu
    // 2. Chạy INSERT INTO tasks ... RETURNING *
    // 3. Trả về object task mới (có task_id)

    // 🌟 BƯỚC 3: TẠO NOTIFICATION CHO USER
    // (Để user biết task đã được tạo thành công)
    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Công việc mới',
      message: `Bạn đã tạo công việc "${newTask.title}"`,
      // Dùng newTask.title (dữ liệu từ DB, sau khi INSERT)
      redirectUrl: '/tasks',
      // Nếu user click notification, redirect tới trang tasks
      relatedId: newTask.task_id
      // Gắn task_id để biết notification liên quan tới task nào
    });

    // 🌟 BƯỚC 4: TRẢ VỀ RESPONSE CHO FRONTEND
    res.status(201).json({
      success: true,
      message: 'Tạo task thành công',
      data: newTask
      // Frontend sẽ nhận được newTask để hiển thị trên giao diện
    });

  } catch (error) {
    // Nếu có lỗi (validation failed, DB error, etc)
    console.error('Error creating task:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo task'
    });
  }
};
```

**Giải thích luồng "Create" từ user click đến insert DB:**

```
1️⃣ Frontend: User nhấn nút "Thêm công việc"
   ↓
2️⃣ Form hiển thị input fields:
   - Title: "Học tiếng Anh"
   - Priority: "high"
   - End time: "2025-01-15"
   ↓
3️⃣ User nhấn "Lưu"
   ↓
4️⃣ Frontend gửi POST /tasks với body = { title: "...", priority: "...", ... }
   ↓
5️⃣ Controller taskController.createTask() nhận request
   ↓
6️⃣ Tạo object taskData từ req.body
   ↓
7️⃣ Gọi taskService.createTask(userId, taskData)
   ↓
8️⃣ Service validation dữ liệu
   ↓
9️⃣ Service chạy SQL:
   INSERT INTO tasks (user_id, title, priority, ...) 
   VALUES ($1, $2, $3, ...)
   RETURNING *
   ↓
🔟 Database trả về row mới (có task_id, created_at tự động sinh)
   ↓
1️⃣1️⃣ Controller tạo notification
   ↓
1️⃣2️⃣ Controller trả về response với newTask
   ↓
1️⃣3️⃣ Frontend nhận response, cập nhật giao diện (thêm task vào danh sách)
**Lời**
Khi người dùng nhấn Create, frontend hiển thị form để nhập dữ liệu.
Sau khi nhấn Lưu, frontend gửi request lên Controller.
Controller tiếp nhận dữ liệu và chuyển cho Service xử lý logic và kiểm tra hợp lệ.
Service lưu dữ liệu vào CSDL.
Nếu lưu thành công, Controller trả response thông báo thành công,
frontend nhận response và cập nhật lại giao diện hiển thị công việc mới.
```

**Các tham số khởi tạo quan trọng:**
- `priority`: "low" | "medium" | "high" → dùng để sắp xếp/filter
- `status`: "todo" | "in_progress" | "done" | "overdue" → trạng thái task
- `kanbanColumn`: "todo" | "in_progress" | "done" | "overdue" → cột Kanban (ban đầu là 'todo')
- `progress`: 0-100 → dùng cho progress bar
- `repeatType`: "none" | "daily" | "weekly" | "monthly" → task lặp lại

---

### 1.6 📁 **File: `controllers/taskController.js`** - Dòng 285-355 (Hàm `updateTaskKanbanColumn` - Drag & Drop)

```javascript
// 🔹 HÀM DI CHUYỂN TASK TRONG KANBAN (Drag & Drop)
exports.updateTaskKanbanColumn = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    // id = task_id được drag
    
    const { kanbanColumn } = req.body;
    // kanbanColumn = cột đích ('todo', 'in_progress', 'done', 'overdue')
    // VD: user drag task từ 'todo' sang 'in_progress' → kanbanColumn = 'in_progress'

    // 🌟 BƯỚC 1: LẤY THÔNG TIN TASK CŨ (TRƯỚC KHI DI CHUYỂN)
    const oldTask = await taskService.getTaskById(id, userId);
    // oldTask.kanban_column = 'todo' (cột cũ)
    // Tại sao lấy? Để biết task ở cột nào trước đó (logic reset)
    
    let newStatus = kanbanColumn;
    let extraUpdateData = {};
    
    // 🌟 BƯỚC 2: LOGIC ĐẶC BIỆT - RESET GRACE_END_TIME
    // Nếu task ở trạng thái "overdue" (quá hạn) và user kéo lại cột "todo"
    if (oldTask.kanban_column === 'overdue' && kanbanColumn === 'todo') {
        extraUpdateData.grace_end_time = null;
        // Xóa thời gian ân hạn (5 phút) cũ
        // Vì: task quá hạn rồi, kéo lại todo = reset lại
        
        newStatus = 'todo';
        // Set status = 'todo' thay vì 'overdue'
    }

    // 🌟 BƯỚC 3: TẠO OBJECT UPDATEDATA
    const updateData = { 
      kanbanColumn: kanbanColumn,
      // Cập nhật cột Kanban
      
      status: newStatus,
      // Cập nhật status tương ứng
      
      ...extraUpdateData
      // Thêm những update đặc biệt (grace_end_time, etc)
    };
    // updateData = { kanbanColumn: 'in_progress', status: 'in_progress' }
    
    // 🌟 BƯỚC 4: CHẠY UPDATE QUERY
    // ⭐⭐⭐ ĐÂY LÀ QUERY UPDATE - XEM PHẦN 1.3 TRÊN
    const updatedTask = await taskService.updateTask(id, userId, updateData);
    // taskService.updateTask() sẽ:
    // 1. Xây dựng SQL UPDATE động
    // 2. UPDATE tasks SET kanban_column = $1, status = $2, grace_end_time = $3 WHERE ...
    // 3. Trả về row sau khi update

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    // 🌟 BƯỚC 5: TẠO NOTIFICATION
    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Di chuyển công việc',
      message: `Công việc "${updatedTask.title}" đã được di chuyển đến cột "${kanbanColumn}"`,
      redirectUrl: '/kanban',
      relatedId: updatedTask.task_id
    });
    // Notification để user biết task đã được di chuyển (log hoạt động)

    // 🌟 BƯỚC 6: TRẢ VỀ RESPONSE
    res.json({
      success: true,
      message: 'Cập nhật cột Kanban thành công',
      data: updatedTask
      // Frontend sẽ cập nhật UI (xóa task khỏi cột cũ, thêm vào cột mới)
    });

  } catch (error) {
    console.error('Error updating kanban column:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi cập nhật cột Kanban',
      error: error.message
    });
  }
};
```

**Giải thích luồng "Drag & Drop" Kanban:**

```
1️⃣ Frontend: Task ở cột "todo" (Cần làm)
   ↓
2️⃣ User kéo task bằng chuột (drag)
   ↓
3️⃣ Frontend gửi POST /tasks/:id/kanban-column
   Body: { kanbanColumn: 'in_progress' }
   (kanbanColumn = cột đích)
   ↓
4️⃣ Controller updateTaskKanbanColumn() nhận request
   ↓
5️⃣ Lấy task cũ (oldTask.kanban_column = 'todo')
   ↓
6️⃣ Xây dựng updateData:
   { kanbanColumn: 'in_progress', status: 'in_progress' }
   ↓
7️⃣ Gọi taskService.updateTask(id, userId, updateData)
   ↓
8️⃣ Service chạy SQL:
   UPDATE tasks 
   SET kanban_column = $1, status = $2
   WHERE task_id = $3 AND user_id = $4
   RETURNING *
   ↓
9️⃣ Database cập nhật row
   ↓
🔟 Controller tạo notification
   ↓
1️⃣1️⃣ Controller trả về response với updatedTask
   ↓
1️⃣2️⃣ Frontend nhận response:
   - Xóa task khỏi cột 'todo'
   - Thêm task vào cột 'in_progress'
   - Cập nhật UI realtime
   **Lời**
Ban đầu task nằm ở cột todo.
Khi người dùng kéo task sang cột khác, frontend gửi request lên Controller.
Controller tiếp nhận dữ liệu và chuyển cho Service xử lý.
Service cập nhật lại trạng thái và cột Kanban của task trong CSDL.
Sau khi cập nhật thành công, Controller trả kết quả, frontend nhận response và cập nhật lại giao diện hiển thị task ở cột mới.
```

**Logic đặc biệt (reset grace_end_time):**

```javascript
// Nếu task ở 'overdue' và user kéo sang 'todo'
if (oldTask.kanban_column === 'overdue' && kanbanColumn === 'todo') {
    extraUpdateData.grace_end_time = null;
}

// Tại sao?
// - grace_end_time = thời hạn ân hạn (thêm 5 phút nữa được)
// - Nếu task quá hạn (overdue), user được phép submit trong 5 phút (grace period)
// - Khi user kéo task lại cột 'todo', task chưa bị overdue nữa
// - → Reset grace_end_time = null (không cần ân hạn nữa)
```

**Các cột Kanban có thể:**
- `'todo'`: Cần làm (status = 'todo')
- `'in_progress'`: Đang làm (status = 'in_progress')
- `'done'`: Hoàn thành (status = 'done')
- `'overdue'`: Quá hạn (status = 'overdue')

---

## 2️⃣ CALENDAR (Lịch) - Chi Tiết Code

### 2.1 📁 **File: `controllers/eventController.js`** - Dòng 1-30 (Auto-refresh Google Token)

```javascript
const pool = require('../config/db');
const { OAuth2Client } = require('google-auth-library');

exports.getEvents = async (req, res) => {
  try {
    const userId = req.session.userId;

    // 🔹 BƯỚC 1: LẤY GOOGLE TOKENS TỪ DATABASE
    const userResult = await pool.query(
      'SELECT google_access_token, google_refresh_token, google_token_expiry FROM users WHERE user_id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.google_access_token) {
      // Nếu không có access token, user chưa kết nối Google
      return res.status(400).json({ 
        success: false, 
        message: 'Chưa kết nối Google Calendar' 
      });
    }

    const { google_access_token, google_refresh_token, google_token_expiry } = userResult.rows[0];
    // Lấy các token từ row trong database

    // 🔹 BƯỚC 2: KIỂM TRA TOKEN CÓ HẾT HẠN KHÔNG
    const now = new Date();
    const expiryTime = new Date(google_token_expiry);  // Parse ngày hết hạn

    if (now > expiryTime) {
      // Token đã hết hạn → cần refresh
      console.log('Token hết hạn, đang refresh...');

      // 🔹 BƯỚC 3: REFRESH TOKEN
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
      );

      oauth2Client.setCredentials({
        refresh_token: google_refresh_token
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      // credentials = { access_token: 'new_token...', expiry_date: ..., ... }

      // 🔹 BƯỚC 4: CẬP NHẬT TOKEN MỚI VÀO DATABASE
      await pool.query(
        'UPDATE users SET google_access_token = $1, google_token_expiry = $2 WHERE user_id = $3',
        [credentials.access_token, new Date(credentials.expiry_date), userId]
      );
      // UPDATE users
      //   SET google_access_token = 'new_token...',
      //       google_token_expiry = '2025-01-07 10:30:00'
      // WHERE user_id = 123

      // Cập nhật token trong variable để dùng tiếp
      google_access_token = credentials.access_token;
      google_token_expiry = new Date(credentials.expiry_date);
    }

    // 🔹 BƯỚC 5: LẤY EVENTS TỬ GOOGLE CALENDAR (sử dụng token mới)
    const eventService = new google.calendar('v3');
    // ... code tiếp tục ...

  } catch (err) {
    console.error('Error getting events:', err);
    res.status(500).json({ success: false, message: 'Lỗi' });
  }
};
```

**Tại sao viết vậy?**
- **Auto-refresh**: Token Google hết hạn tự động làm mới (user không cần thêm login)
- **Database update**: Lưu token mới vào DB để dùng lần sau
- **Transparent**: Frontend không biết token đã refresh (process suôn sẻ)

---

## 3️⃣ REPORTS (Báo Cáo) - Chi Tiết Code

### 3.1 📁 **File: `services/reportService.js`** - Dòng 7-36 (Hàm Báo Cáo)

```javascript
static async getTaskStatusReport(userId) {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count 
     FROM tasks 
     WHERE user_id = $1 
     GROUP BY status
     ORDER BY count DESC`,
    [userId]
  );
  // SQL này làm gì?
  // 1. SELECT status = chọn cột status
  // 2. COUNT(*) = đếm số dòng
  // 3. ::int = ép kiểu sang INTEGER (PostgreSQL syntax)
  // 4. AS count = đặt tên cột là 'count'
  // 5. WHERE user_id = $1 = chỉ lấy tasks của user này
  // 6. GROUP BY status = nhóm theo status (1 nhóm = 1 status)
  // 7. ORDER BY count DESC = sắp xếp nhiều nhất trước
  //
  // Kết quả:
  // status    | count
  // -----------+------
  // done      |   15  (15 tasks hoàn thành)
  // todo      |   8   (8 tasks chưa làm)
  // in_progress | 5   (5 tasks đang làm)
  
  return rows;
  // Trả về mảng: [
  //   { status: 'done', count: 15 },
  //   { status: 'todo', count: 8 },
  //   { status: 'in_progress', count: 5 }
  // ]
}

static async getTasksByPeriod(userId, period = 'week', filter = {}) {
  let query = '';
  const params = [userId];

  if (period === 'day') {
    // Báo cáo theo giờ trong ngày hôm nay
    query = `
      SELECT 
        EXTRACT(HOUR FROM created_at)::int AS hour,  
        // EXTRACT(HOUR FROM ...) = lấy giờ từ timestamp
        // Ví dụ: '2025-01-06 14:30:00' → 14
        
        COUNT(*)::int AS count
      FROM tasks 
      WHERE user_id = $1 
        AND DATE(created_at) = CURRENT_DATE
        // DATE(...) = chỉ lấy phần ngày (không lấy giờ)
        // CURRENT_DATE = ngày hôm nay
      GROUP BY hour 
      ORDER BY hour ASC
      // Kết quả: [{ hour: 8, count: 2 }, { hour: 9, count: 3 }, { hour: 14, count: 1 }, ...]
      // Biểu đồ: Lúc 8h làm 2 tasks, lúc 9h làm 3 tasks, etc...
    `;
  } 
  else if (period === 'week') {
    // Báo cáo 7 ngày gần nhất
    query = `
      SELECT 
        DATE(created_at) AS day,         // Lấy ngày
        COUNT(*)::int AS count
      FROM tasks 
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '6 days'
        // >= = từ 6 ngày trước (tính cả hôm nay)
      GROUP BY DATE(created_at) 
      ORDER BY day ASC
      // Kết quả: [{ day: '2025-01-01', count: 5 }, { day: '2025-01-02', count: 3 }, ...]
    `;
  } 
  else if (period === 'month') {
    // Báo cáo theo tháng
    if (filter.month && filter.year) {
      // Nếu user chỉ định tháng/năm
      query = `
        SELECT 
          DATE(created_at) AS day,
          COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM created_at) = $2
          // EXTRACT(MONTH FROM ...) = lấy tháng (1-12)
          AND EXTRACT(YEAR FROM created_at) = $3
          // EXTRACT(YEAR FROM ...) = lấy năm (2025)
        GROUP BY DATE(created_at) 
        ORDER BY day ASC
      `;
      params.push(filter.month, filter.year);
      // params = [userId, 1, 2025]  (tháng 1, năm 2025)
    } else {
      // Nếu không chỉ định, lấy tháng hiện tại
      query = `
        SELECT 
          DATE(created_at) AS day,
          COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1
          AND created_at >= date_trunc('month', CURRENT_DATE)
          // date_trunc('month', ...) = cắt ngắn về đầu tháng
          // Ví dụ: '2025-01-15 10:30:00' → '2025-01-01 00:00:00'
          
          AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
          // < = trước (đảm bảo chỉ lấy tháng này)
        GROUP BY DATE(created_at) 
        ORDER BY day ASC
      `;
    }
  } else {
    throw new Error('Invalid period');
  }

  const { rows } = await pool.query(query, params);
  return rows;
}
```

**Tại sao viết vậy?**
- **GROUP BY**: Tóm tắt dữ liệu theo nhóm (không cần SQL trong loop)
- **EXTRACT**: Lấy phần từ timestamp (giờ, ngày, tháng, năm)
- **Tính toán date**: PostgreSQL tính toán ngày tháng (không cần JavaScript)
- **Linh hoạt**: Query điều chỉnh theo period (day/week/month)

---

## 4️⃣ AUTHENTICATION (Xác Thực) - Chi Tiết Code

### 4.1 📁 **File: `middleware/authMiddleware.js`** - Dòng 1-30

```javascript
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    // 🔹 BƯỚC 1: Kiểm tra session có tồn tại không
    if (!req.session || !req.session.userId) {
      // req.session = data từ session store (PostgreSQL)
      // Nếu không có session hoặc không có userId
      return res.redirect('/login');
    }

    // 🔹 BƯỚC 2: QUERY DATABASE ĐỂ KIỂM TRA TÀI KHOẢN
    // ⚠️ CẢNH BÁO: Query này chạy trên MỌI REQUEST (có thể làm chậm!)
    const result = await pool.query(
      `SELECT user_id, username, is_banned, ban_reason FROM users WHERE user_id = $1`,
      [req.session.userId]
    );
    // Kiểm tra: 
    // 1. Tài khoản còn tồn tại không (result.rows.length > 0)
    // 2. Tài khoản có bị ban không (is_banned = true)

    if (result.rows.length === 0) {
      // Tài khoản đã bị xóa
      req.session.destroy();  // Xóa session
      return res.redirect('/login');
    }

    const user = result.rows[0];

    if (user.is_banned) {
      // Tài khoản bị ban
      req.session.destroy();  // Xóa session
      return res.status(403).json({
        success: false,
        message: `Tài khoản đã bị ban. Lý do: ${user.ban_reason || 'Không rõ'}`
      });
    }

    // 🔹 BƯỚC 3: Thêm user info vào request để dùng ở controller
    req.user = user;
    next();  // Cho phép request tiếp tục
    // next() = gọi middleware/controller tiếp theo

  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
};
```

**Tại sao viết vậy?**
- **Realtime check**: Mỗi request kiểm tra user có bị ban không (không tin session cũ)
- **Session destroy**: Xóa session nếu account bị xóa/ban (logout ngay lập tức)
- **req.user**: Ghi info user để controller dùng (không cần query lại)

---

## 5️⃣ NOTIFICATION (Thông Báo) - Chi Tiết Code

### 5.1 📁 **File: `services/notificationService.js`** - Dòng 20-90

```javascript
const pool = require('../config/db');

class NotificationService {
  // 🔹 TẠO NOTIFICATION MỚI
  static async createNotification(data) {
    const {
      userId,
      title,
      message,
      type = 'general',           // Mặc định 'general'
      redirectUrl = null,         // URL redirect khi click
      relatedId = null,          // ID của resource liên quan (task_id, event_id, etc)
      read = false               // Mặc định chưa đọc
    } = data;

    // 🔹 INSERT vào bảng notifications
    const result = await pool.query(
      `INSERT INTO notifications 
       (user_id, title, message, type, redirect_url, related_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       // NOW() = thời gian hiện tại tự động từ PostgreSQL
       RETURNING *`,
      [userId, title, message, type, redirectUrl, relatedId, read]
    );

    return result.rows[0];
  }

  // 🔹 LẤY DANH SÁCH NOTIFICATIONS
  static async getAll(userId, limit = 50) {
    // Lấy 50 notification gần nhất
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1
       ORDER BY created_at DESC
       // DESC = mới nhất trước
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  // 🔹 LẤY NOTIFICATIONS CHƯA ĐỌC
  static async getUnread(userId) {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND is_read = false
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // 🔹 ĐỀM UNREAD NOTIFICATIONS
  static async countUnread(userId) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return result.rows[0].count;
    // Trả về con số (0, 1, 5, 10, etc)
  }

  // 🔹 ĐÁNH DẤU 1 NOTIFICATION ĐÃ ĐỌC
  static async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0];
  }

  // 🔹 ĐÁNH DẤU TẤT CẢ NOTIFICATIONS ĐÃ ĐỌC
  static async markAllRead(userId) {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return true;
  }
}
```

**Tại sao viết vậy?**
- **RETURNING ***: Trả về row mới (frontend biết notification_id để dùng sau)
- **NOW()**: PostgreSQL sinh thời gian (chính xác, không phụ thuộc server)
- **count UNread**: Chỉ COUNT những notification chưa đọc (nhanh hơn load tất cả)

---

## 🎯 Tóm Tắt Cách Code Hoạt Động

### Pattern Chung

```javascript
// 1️⃣ IMPORT POOL
const pool = require('../config/db');

// 2️⃣ KIỂM TRA DỮ LIỆ (VALIDATION)
if (!data) throw new Error('...');

// 3️⃣ KIỂM TRA QUYỀN (SECURITY)
const check = await pool.query(
  'SELECT id FROM table WHERE id = $1 AND user_id = $2',
  [id, userId]
);
if (!check.rows.length) return error();

// 4️⃣ THỰC THI QUERY
const result = await pool.query(sql, [params]);

// 5️⃣ TRẢ VỀ KẾT QUẢ
return result.rows[0];
```

### SQL Injection Prevention (An Toàn)

❌ **KHÔNG** viết vậy (dễ bị hack):
```javascript
const query = `SELECT * FROM tasks WHERE title = '${search}'`;
// Nếu search = "'; DROP TABLE tasks; --"
// Sẽ chạy: SELECT * FROM tasks WHERE title = ''; DROP TABLE tasks; --'
```

✅ **PHẢI** viết vậy (an toàn):
```javascript
const query = `SELECT * FROM tasks WHERE title = $1`;
await pool.query(query, [search]);
// search chỉ là giá trị thông thường, không thực thi SQL
```

---

## ❓ Câu Hỏi Thường Gặp

**Q: Tại sao dùng `const pool = require(...)` thay vì `const client = new Pool(...)`?**
A: Vì `pool` là singleton (chỉ tạo 1 lần ở `config/db.js`), tất cả request dùng chung. Nếu tạo mới mỗi lần sẽ chậm + tốn tài nguyên.

**Q: `$1, $2, $3` là gì?**
A: Placeholder an toàn cho tham số. `$1` = tham số thứ 1 từ mảng, `$2` = thứ 2, etc.

**Q: Tại sao dùng `async/await`?**
A: Vì pool.query() là asynchronous (mất thời gian chờ database). `await` = chờ query hoàn thành mới tiếp tục.

**Q: `result.rows` là gì?**
A: Mảng các dòng trả về từ database. `result.rows[0]` = dòng đầu tiên, `result.rows.length` = số dòng.

---

**Tài liệu này giúp bạn hiểu code SQL hoạt động từng dòng một! 🎉**
