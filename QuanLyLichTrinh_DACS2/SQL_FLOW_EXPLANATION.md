# 📘 GIẢI THÍCH CHI TIẾT ĐƯỜNG DẪN SQL - TASKS, CALENDAR, KANBAN, REPORTS

---

## 🎯 PHẦN 1: TASKS (CÔNG VIỆC)

### 📍 Đường dẫn: Browser → Controller → Service → Pool → Database

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CLICK: Xem danh sách công việc                      │
│    GET /api/tasks?status=todo&priority=high                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ROUTE HANDLER: taskRoutes.js                             │
│    router.get('/api/tasks', taskController.getTasks)        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CONTROLLER: controllers/taskController.js                │
│    Dòng 7-40: exports.getTasks = async (req, res) => {     │
│    - Lấy userId từ session                                  │
│    - Lấy filters từ query params                            │
│    - Gọi taskService.getTasksByUser(userId, filters)       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVICE: services/taskService.js                         │
│    Dòng 18-102: async getTasksByUser(userId, filters)      │
│                                                              │
│    ✅ XỬ LÝ LOGIC:                                           │
│    - Build SQL query động (dòng 30-91)                     │
│    - Thêm WHERE clauses theo filters                        │
│    - Sort theo sortBy, sortOrder                            │
│    - Group by Kanban column nếu cần                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SQL QUERY: taskService.js, Dòng 95                       │
│                                                              │
│    const result = await pool.query(query, params);          │
│                                                              │
│    📊 QUERY CÓ DẠNG:                                         │
│    ┌──────────────────────────────────────────────────────┐ │
│    │ SELECT t.*, c.category_name                          │ │
│    │ FROM tasks t                                          │ │
│    │ LEFT JOIN categories c ON ...                        │ │
│    │ WHERE t.user_id = $1                                 │ │
│    │   AND t.status = $2           (nếu filter status)   │ │
│    │   AND t.priority = $3         (nếu filter priority) │ │
│    │   AND (t.title ILIKE ... )    (nếu search)          │ │
│    │   AND t.end_time >= $4        (nếu filter startDate)│ │
│    │   AND t.end_time <= $5        (nếu filter endDate)  │ │
│    │ ORDER BY t.created_at DESC                           │ │
│    └──────────────────────────────────────────────────────┘ │
│                                                              │
│    📤 PARAMETERS:                                            │
│    [userId, 'todo', 'high', ...]                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. DATABASE POOL: config/db.js                              │
│    const pool = new Pool({                                  │
│      host: 'localhost',                                     │
│      port: 5432,                                            │
│      database: 'QuanLyLichTrinh',                           │
│      user: 'postgres',                                      │
│      password: 'v01215335600'                               │
│    });                                                      │
│                                                              │
│    ▶ Thực thi query trên PostgreSQL                        │
│    ▶ Trả về kết quả (result.rows)                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. RETURN RESULT: taskService.js                            │
│    return tasks;           (dòng 102)                        │
│                                                              │
│    Hoặc grouped by kanban:                                  │
│    return { todo: [...], in_progress: [...], ... }        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. CONTROLLER: taskController.js, Dòng 30-35               │
│    res.json({                                               │
│      success: true,                                         │
│      tasks: tasks                                           │
│    });                                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. RESPONSE: Browser nhận JSON                              │
│    {                                                        │
│      success: true,                                         │
│      tasks: [                                               │
│        { task_id: 1, title: '...', status: 'todo', ... },  │
│        { task_id: 2, title: '...', status: 'done', ... },  │
│        ...                                                  │
│      ]                                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

### 🔴 CÁC QUERY TASKS CHÍNH

#### **Query 1: getTasks** - Lấy danh sách tasks
📍 **File**: `controllers/taskController.js`, dòng 7-40  
📍 **Service**: `services/taskService.js`, dòng 18-102  

```javascript
// CONTROLLER
exports.getTasks = async (req, res) => {
  const userId = req.session.userId;
  const filters = {
    status: req.query.status,
    priority: req.query.priority,
    search: req.query.search,
    sortBy: req.query.sortBy || 'created_at',
    sortOrder: req.query.sortOrder || 'DESC'
  };
  
  const tasks = await taskService.getTasksByUser(userId, filters);
  // ↓ Dòng 25-28: Gọi service
};

// SERVICE - BUILD DYNAMIC QUERY
async getTasksByUser(userId, filters = {}) {
  let query = `
    SELECT t.*, c.category_name
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = $1
  `;
  
  const params = [userId];
  let paramIndex = 2;
  
  // Dòng 45-48: ADD STATUS FILTER
  if (status) {
    query += ` AND t.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }
  
  // Dòng 51-54: ADD PRIORITY FILTER
  if (priority) {
    query += ` AND t.priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }
  
  // Dòng 57-60: ADD SEARCH FILTER
  if (search) {
    query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  // Dòng 89-92: SORT
  query += ` ORDER BY t.${sortField} ${sortOrder}`;
  
  // Dòng 95: EXECUTE QUERY
  const result = await pool.query(query, params);
  return result.rows;
}
```

✅ **Kết quả**: Mảng tasks với category info

---

#### **Query 2: getTaskById** - Lấy chi tiết 1 task
📍 **File**: `controllers/taskController.js`, dòng 45-77  
📍 **Service**: `services/taskService.js`, dòng 104-120  

```javascript
// CONTROLLER
exports.getTaskById = async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;
  
  const task = await taskService.getTaskById(id, userId);
  // Dòng 59: Gọi service
};

// SERVICE - SIMPLE SELECT
async getTaskById(taskId, userId) {
  const result = await pool.query(
    `SELECT t.*
     FROM tasks t
     WHERE t.task_id = $1 AND t.user_id = $2`,
    [taskId, userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Không tìm thấy task');
  }
  
  return result.rows[0];
}
```

✅ **Kết quả**: Object task chi tiết

---

#### **Query 3: createTask** - Tạo task mới
📍 **File**: `controllers/taskController.js`, dòng 81-132  
📍 **Service**: `services/taskService.js`, dòng 122-200  

```javascript
// CONTROLLER
exports.createTask = async (req, res) => {
  const userId = req.session.userId;
  
  const taskData = {
    title: req.body.title,
    description: req.body.description,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    priority: req.body.priority,
    status: 'todo'
  };
  
  const newTask = await taskService.createTask(userId, taskData);
  // Dòng 114: Gọi service
  
  // Dòng 116-122: Tạo notification
  await notificationService.createNotification({
    userId,
    type: 'task',
    title: 'Công việc mới',
    message: `Bạn đã tạo công việc "${newTask.title}"`
  });
};

// SERVICE - INSERT
async createTask(userId, taskData) {
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, description, start_time, end_time, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, taskData.title, taskData.description, ...]
  );
  
  return result.rows[0];
}
```

✅ **Kết quả**: Task mới được tạo + Notification

---

#### **Query 4: updateTask** - Cập nhật task
📍 **File**: `controllers/taskController.js`, dòng 143-202  

```javascript
exports.updateTask = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.session.userId;
  const data = req.body;
  
  // Dòng 155-160: KIỂM TRA QUYỀN SỞ HỮU
  const check = await pool.query(
    'SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2',
    [taskId, userId]
  );
  // ✅ Điều này rất quan trọng: Chỉ update task của user hiện tại
  
  // Dòng 173-185: BUILD DYNAMIC UPDATE
  const fields = [];
  const values = [];
  let index = 1;
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }
  
  // Dòng 191-192: EXECUTE QUERY
  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = $${index} RETURNING *`;
  const result = await pool.query(query, values);
  
  // Dòng 194-201: CREATE NOTIFICATION
};
```

✅ **Kết quả**: Task được cập nhật + Notification

---

#### **Query 5: confirmTaskComplete** - Xác nhận hoàn thành trong grace period
📍 **File**: `controllers/taskController.js`, dòng 393-455  

```javascript
exports.confirmTaskComplete = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.session.userId;
  
  // Dòng 435-438: SELECT TASK
  const { rows } = await pool.query(
    'SELECT end_time, grace_end_time, title FROM tasks WHERE task_id = $1 AND user_id = $2',
    [taskId, userId]
  );
  // ✅ Query này lấy time info để check grace period
  
  const task = rows[0];
  const now = new Date();
  let graceEnd = task.grace_end_time ? new Date(task.grace_end_time) : null;
  
  // Dòng 451-454: SET GRACE TIME (5 phút)
  if (!graceEnd) {
    graceEnd = new Date(task.end_time);
    graceEnd.setMinutes(graceEnd.getMinutes() + 5);
    await pool.query(
      'UPDATE tasks SET grace_end_time = $1 WHERE task_id = $2',
      [graceEnd, taskId]
    );
  }
  
  // Dòng 459-467: UPDATE DONE NẾU TRONG GRACE PERIOD
  if (now <= graceEnd) {
    await pool.query(
      `UPDATE tasks SET status = 'done', kanban_column = 'done', grace_end_time = NULL WHERE task_id = $1`,
      [taskId]
    );
    // ✅ Thành công!
  } else {
    // Dòng 474-477: UPDATE OVERDUE NẾU VƯỢT GRACE PERIOD
    await pool.query(
      `UPDATE tasks SET kanban_column = 'overdue', status = 'overdue' WHERE task_id = $1`,
      [taskId]
    );
  }
};
```

✅ **Kết quả**: Task được mark done hoặc overdue

---

#### **Query 6: reorderTasks** - Sắp xếp lại thứ tự
📍 **File**: `controllers/taskController.js`, dòng 474-501  

```javascript
exports.reorderTasks = async (req, res) => {
  const userId = req.session.userId;
  const { order } = req.body; // Mảng task_id
  
  // Dòng 491: TRANSACTION BEGIN
  const client = await pool.connect();
  await client.query('BEGIN');
  
  try {
    // Dòng 494-498: LOOP CẬP NHẬT THỨ TỰ
    for (let i = 0; i < order.length; i++) {
      await client.query(
        'UPDATE tasks SET sort_order = $1 WHERE task_id = $2 AND user_id = $3',
        [i, order[i], userId]
      );
    }
    
    // Dòng 500: COMMIT TRANSACTION
    await client.query('COMMIT');
  } catch (e) {
    // Dòng 502: ROLLBACK NẾU CÓ LỖI
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
```

✅ **Kết quả**: Thứ tự tasks được lưu in order

---

## 🎯 PHẦN 2: CALENDAR / EVENTS (LỊch)

### 📍 Đường dẫn: Browser → Controller → Service → Pool → Database

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CLICK: Xem lịch sự kiện                             │
│    GET /api/events?start_date=2026-01-01&end_date=...      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ROUTE: calendarRoutes.js / eventRoutes.js               │
│    router.get('/api/events', eventController.getEvents)    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CONTROLLER: controllers/eventController.js              │
│    Dòng 35-61: exports.getEvents = async (req, res)       │
│    - Lấy userId                                             │
│    - Lấy filters (startDate, endDate, search)             │
│    - Gọi eventService.getEventsByUser(userId, filters)    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVICE: services/eventService.js                        │
│    Build query với date range filters                       │
│    SELECT * FROM events WHERE user_id = $1                 │
│      AND start_time >= $2                                   │
│      AND end_time <= $3                                     │
│    ORDER BY start_time ASC                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. EXECUTE QUERY: await pool.query(...)                    │
│    Lấy dữ liệu từ database                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RETURN: JSON Array events                                │
│    [{                                                       │
│      event_id: 1,                                           │
│      title: 'Meeting',                                      │
│      start_time: '2026-01-10T10:00:00',                    │
│      end_time: '2026-01-10T11:00:00'                       │
│    }, ...]                                                  │
└─────────────────────────────────────────────────────────────┘
```

#### **Query 1: getEvents** - Lấy sự kiện
📍 **File**: `controllers/eventController.js`, dòng 35-61  

```javascript
exports.getEvents = async (req, res) => {
  const userId = req.session.userId;
  
  // Dòng 47-51: Extract filters từ query
  const filters = {
    startDate: req.query.start_date || req.query.startDate,
    endDate: req.query.end_date || req.query.endDate,
    search: req.query.search
  };
  
  // Dòng 53: Gọi service
  const events = await eventService.getEventsByUser(userId, filters);
  
  res.json({ success: true, data: events });
};
```

✅ **Kết quả**: Danh sách events trong khoảng thời gian

---

#### **Query 2: getEventsByDateRange** - Lấy events theo tháng
📍 **File**: `controllers/eventController.js`, dòng 63-91  

```javascript
exports.getEventsByDateRange = async (req, res) => {
  const userId = req.session.userId;
  const { year, month } = req.query;
  
  // Dòng 72-91: Gọi service với year/month
  const events = await eventService.getEventsByMonth(userId, parseInt(year), parseInt(month));
  
  // ✅ Dùng cho calendar view
  res.json({ success: true, data: events });
};
```

✅ **Kết quả**: Events của tháng cụ thể

---

#### **Query 3: Google Auto-Refresh Token**
📍 **File**: `controllers/eventController.js`, dòng 21-28  

```javascript
async function getOAuth2Client(user) {
  const oauth2Client = new OAuth2Client(...);
  
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token
  });
  
  // Dòng 24-28: Auto refresh khi token hết hạn
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      // ✅ CẬP NHẬT TOKEN TỰ ĐỘNG
      await pool.query(
        'UPDATE users SET google_access_token = $1 WHERE user_id = $2',
        [tokens.access_token, user.user_id]
      );
    }
  });
  
  return oauth2Client;
}
```

✅ **Kết quả**: Google token được refresh tự động

---

## 🎯 PHẦN 3: KANBAN (BẢN HỎA ĐỘNG)

### 📍 Đường dẫn: Browser → Kanban Controller → Service → Pool → Database

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER DRAG & DROP: Di chuyển card trong Kanban            │
│    PATCH /api/kanban/:id/move                               │
│    Body: { column: 'in_progress' }                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ROUTE: kanbanRoutes.js                                   │
│    router.patch('/api/kanban/:id/move', ...)               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CONTROLLER: controllers/kanbanController.js              │
│    exports.moveTaskToColumn()                               │
│    - Lấy task ID & column từ request                       │
│    - Gọi taskService.updateTask()                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVICE: services/taskService.js                         │
│    UPDATE tasks SET kanban_column = $1, status = $2        │
│    WHERE task_id = $3 AND user_id = $4                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. EXECUTE: await pool.query(...)                           │
│    Cập nhật kanban_column & status trong DB                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RETURN: Updated task                                     │
│    { task_id: 5, kanban_column: 'in_progress', ... }       │
└─────────────────────────────────────────────────────────────┘
```

#### **Query: moveTaskToColumn** - Di chuyển task
📍 **File**: `controllers/kanbanController.js`, dòng 31-84  

```javascript
exports.moveTaskToColumn = async (req, res) => {
  const userId = req.session.userId;
  const taskId = req.params.id;
  const { column } = req.body; // 'todo', 'in_progress', 'done', 'overdue'
  
  // Cập nhật kanban column
  const updatedTask = await taskService.updateTask(
    taskId,
    userId,
    { 
      kanban_column: column,
      status: column // Map column → status
    }
  );
  
  // Tạo notification
  await notificationService.createNotification({
    userId,
    type: 'task',
    title: 'Di chuyển công việc',
    message: `Công việc "${updatedTask.title}" đã được di chuyển`
  });
  
  res.json({ success: true, data: updatedTask });
};
```

✅ **Kết quả**: Task được di chuyển sang cột khác

---

## 🎯 PHẦN 4: REPORTS (BÁO CÁO)

### 📍 Đường dẫn: Browser → Report Controller → Service → Pool → Database

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER: Xem báo cáo task status                            │
│    GET /api/reports/tasks/status                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ROUTE: reportRoutes.js                                   │
│    router.get('/api/reports/tasks/status', ...)            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CONTROLLER: controllers/reportController.js              │
│    exports.getTaskStatusReport()                            │
│    - Gọi reportService.getTaskStatusReport(userId)         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVICE: services/reportService.js                       │
│    Dòng 8-14:                                               │
│    SELECT status, COUNT(*) as count                         │
│    FROM tasks                                               │
│    WHERE user_id = $1                                       │
│    GROUP BY status                                          │
│    ORDER BY count DESC                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. EXECUTE: await pool.query(...)                           │
│    Database GROUP & COUNT tasks                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RETURN: Report data                                      │
│    [                                                        │
│      { status: 'done', count: 5 },                          │
│      { status: 'todo', count: 3 },                          │
│      { status: 'in_progress', count: 2 }                    │
│    ]                                                        │
└─────────────────────────────────────────────────────────────┘
```

#### **Query 1: getTaskStatusReport** - Báo cáo task theo status
📍 **File**: `services/reportService.js`, dòng 8-14  

```javascript
static async getTaskStatusReport(userId) {
  // 📊 AGGREGATE QUERY - GROUP BY status
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count 
     FROM tasks 
     WHERE user_id = $1 
     GROUP BY status
     ORDER BY count DESC`,
    [userId]
  );
  // ✅ Kết quả: [
  //   { status: 'done', count: 5 },
  //   { status: 'todo', count: 3 },
  //   { status: 'in_progress', count: 2 }
  // ]
  
  return rows;
}
```

✅ **Kết quả**: Thống kê task theo trạng thái

---

#### **Query 2: getEventTypeReport** - Báo cáo event theo category
📍 **File**: `services/reportService.js`, dòng 16-32  

```javascript
static async getEventTypeReport(userId, filter = {}) {
  // 📊 AGGREGATE QUERY - GROUP BY category
  let query = `
    SELECT COALESCE(c.category_name, 'Không phân loại') AS event_type, 
           COUNT(*)::int AS count
    FROM events e
    LEFT JOIN categories c ON e.category_id = c.category_id 
    WHERE e.user_id = $1`;
  
  const params = [userId];
  
  // Dòng 28-30: Optional filters
  if (filter.month && filter.year) {
    query += ` AND EXTRACT(MONTH FROM e.created_at) = $2 
              AND EXTRACT(YEAR FROM e.created_at) = $3`;
    params.push(filter.month, filter.year);
  }
  
  query += ` GROUP BY c.category_name ORDER BY count DESC`;
  
  // ✅ Kết quả: [
  //   { event_type: 'Meeting', count: 5 },
  //   { event_type: 'Personal', count: 3 }
  // ]
  
  const { rows } = await pool.query(query, params);
  return rows;
}
```

✅ **Kết quả**: Thống kê event theo loại

---

#### **Query 3: getTasksByPeriod** - Báo cáo task theo khoảng thời gian
📍 **File**: `services/reportService.js`, dòng 34-80  

```javascript
static async getTasksByPeriod(userId, period = 'week', filter = {}) {
  let query = '';
  const params = [userId];
  
  // Dòng 46-49: WEEK REPORT
  if (period === 'week') {
    query = `
      SELECT DATE(created_at) AS day, COUNT(*)::int AS count
      FROM tasks 
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at) 
      ORDER BY day ASC`;
  }
  
  // Dòng 52-66: MONTH REPORT
  else if (period === 'month') {
    if (filter.month && filter.year) {
      query = `
        SELECT DATE(created_at) AS day, COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM created_at) = $2
          AND EXTRACT(YEAR FROM created_at) = $3
        GROUP BY DATE(created_at) 
        ORDER BY day ASC`;
      params.push(filter.month, filter.year);
    }
  }
  
  // ✅ Kết quả: [
  //   { day: '2026-01-01', count: 2 },
  //   { day: '2026-01-02', count: 5 },
  //   { day: '2026-01-03', count: 1 }
  // ]
  
  const { rows } = await pool.query(query, params);
  return rows;
}
```

✅ **Kết quả**: Thống kê task theo ngày trong tuần/tháng

---

#### **Query 4: generateReportHTML** - Tạo báo cáo HTML
📍 **File**: `services/reportService.js`, dòng 82-150  

```javascript
static async generateReportHTML(userId) {
  // Dòng 83-86: PARALLEL FETCH
  const [taskStats, eventTypes] = await Promise.all([
    this.getTaskStatusReport(userId),    // SELECT COUNT(*)
    this.getEventTypeReport(userId)      // SELECT COUNT(*)
  ]);
  
  // Dòng 88-100: BUILD HTML TABLE FOR TASKS
  let taskTable = taskStats.length > 0
    ? `<table ...>
        <tr><th>Trạng thái</th><th>Số lượng</th></tr>`
    : '<p>Chưa có công việc nào</p>';
  
  taskStats.forEach(t => {
    // Dòng 101-108: Add rows
    taskTable += `<tr><td>${statusText}</td><td>${t.count}</td></tr>`;
  });
  
  // ✅ Kết quả: HTML table với dữ liệu task
  
  // Tương tự cho event table
  // ...
  
  return htmlReport;
}
```

✅ **Kết quả**: HTML báo cáo đầy đủ (dùng cho email & PDF)

---

## 📊 TÓM TẮT ĐƯỜNG DẪN

| Tính Năng | Query Type | File | Dòng | SQL Command |
|-----------|-----------|------|------|-------------|
| **Tasks** | | | | |
| Lấy danh sách | SELECT | taskService.js | 30-95 | SELECT with WHERE/ORDER |
| Lấy chi tiết | SELECT | taskService.js | 104-120 | SELECT by ID |
| Tạo mới | INSERT | taskService.js | 122-145 | INSERT RETURNING * |
| Cập nhật | UPDATE | taskController.js | 173-192 | Dynamic UPDATE |
| Xóa | DELETE | taskService.js | 300-315 | DELETE WHERE |
| Confirm done | UPDATE | taskController.js | 435-477 | UPDATE status/grace_time |
| **Calendar** | | | | |
| Lấy events | SELECT | eventService.js | - | SELECT with date range |
| By month | SELECT | eventService.js | - | SELECT by MONTH/YEAR |
| **Kanban** | | | | |
| Di chuyển | UPDATE | taskService.js | - | UPDATE kanban_column |
| **Reports** | | | | |
| Task status | GROUP BY | reportService.js | 8-14 | GROUP BY status, COUNT |
| Event type | GROUP BY | reportService.js | 16-32 | GROUP BY category, COUNT |
| By period | GROUP BY | reportService.js | 34-80 | GROUP BY DATE, COUNT |

---

## 🔗 QUICK REFERENCE

### Cách dùng pool.query()

```javascript
// 1. Simple SELECT
const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);

// 2. Parameterized (SAFE - Chống SQL injection)
await pool.query(
  'UPDATE tasks SET status = $1 WHERE task_id = $2',
  ['done', taskId]  // Parameters passed separately
);

// 3. Dynamic Query (BUILD STRING)
let query = 'SELECT * FROM tasks WHERE user_id = $1';
const params = [userId];

if (status) {
  query += ` AND status = $${paramIndex++}`;
  params.push(status);
}

await pool.query(query, params);

// 4. Transaction
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE tasks ...');
  await client.query('UPDATE users ...');
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
}
finally {
  client.release();
}
```

---

**Tạo bởi**: GitHub Copilot  
**Ngày**: 2026-01-06  
✅ Hoàn thành mapping với giải thích chi tiết
