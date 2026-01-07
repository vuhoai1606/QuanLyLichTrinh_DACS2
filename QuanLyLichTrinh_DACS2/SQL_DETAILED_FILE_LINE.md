# 📍 CHỈ RÕ FILE VÀ DÒNG - SQL CONNECTIONS TRONG TASKS, CALENDAR, KANBAN, REPORTS

---

## 🎯 TASKS (CÔNG VIỆC)

### ✅ **1️⃣ IMPORT POOL**

**📁 File**: `controllers/taskController.js`  
**📍 Dòng**: **4**

```javascript
const pool = require('../config/db');
```

**Giải thích**: Import connection pool từ `config/db.js`

---

### ✅ **2️⃣ GET TASKS (Lấy danh sách)**

#### **A. Controller xử lý request**

**📁 File**: `controllers/taskController.js`  
**📍 Dòng**: **7-40**

```javascript
// Dòng 7: Bắt đầu function
exports.getTasks = async (req, res) => {
  try {
    // Dòng 9: Lấy userId từ session
    const userId = req.session.userId;
    
    // Dòng 19-24: Lấy filters từ query params
    const filters = {
      status: req.query.status,        // ?status=todo
      priority: req.query.priority,    // ?priority=high
      search: req.query.search,        // ?search=keyword
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    // Dòng 26: ⭐ GỌI SERVICE
    const tasks = await taskService.getTasksByUser(userId, filters);

    // Dòng 28-31: Return JSON response
    res.json({
      success: true,
      tasks: tasks
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi lấy danh sách tasks',
      error: error.message 
    });
  }
};
```

**🔑 Key Points:**
- Dòng 9: Lấy `userId` từ session
- Dòng 19-24: Lấy filters từ URL query parameters
- Dòng 26: Gọi `taskService.getTasksByUser()` - SERVICE TẠO QUERY

---

#### **B. Service build SQL query**

**📁 File**: `services/taskService.js`  
**📍 Dòng**: **18-102**

```javascript
// Dòng 18: Bắt đầu async function
async getTasksByUser(userId, filters = {}) {
  
  // Dòng 19-25: Destructure filters
  const { 
    status, 
    priority, 
    search, 
    sortBy = 'created_at', 
    sortOrder = 'DESC'
  } = filters;

  // Dòng 27-35: ⭐ BASE QUERY
  let query = `
    SELECT 
      t.*,
      c.category_name,
      c.color AS color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = $1
  `;

  // Dòng 37-39: Initialize params
  const params = [userId];
  let paramIndex = 2;

  // ────────────────────────────────────────
  // Dòng 42-48: ⭐ ADD STATUS FILTER
  // ────────────────────────────────────────
  if (status) {
    query += ` AND t.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // ────────────────────────────────────────
  // Dòng 51-54: ⭐ ADD PRIORITY FILTER
  // ────────────────────────────────────────
  if (priority) {
    query += ` AND t.priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  // ────────────────────────────────────────
  // Dòng 57-60: ⭐ ADD SEARCH FILTER
  // ────────────────────────────────────────
  if (search) {
    query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // ────────────────────────────────────────
  // Dòng 63-71: ⭐ ADD DATE RANGE FILTERS
  // ────────────────────────────────────────
  if (startDate) {
    query += ` AND t.end_time >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    query += ` AND t.end_time <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  // ────────────────────────────────────────
  // Dòng 74-80: ⭐ ADD ASSIGNEE & CATEGORY FILTERS
  // ────────────────────────────────────────
  if (filters.assignee) {
    query += ` AND t.assigned_to = $${paramIndex}`;
    params.push(filters.assignee);
    paramIndex++;
  }
  if (filters.categoryId) {
    query += ` AND t.category_id = $${paramIndex}`;
    params.push(filters.categoryId);
    paramIndex++;
  }

  // ────────────────────────────────────────
  // Dòng 83-91: ⭐ ADD SORTING
  // ────────────────────────────────────────
  const allowedSortFields = ['created_at', 'start_time', 'end_time', 'priority', 'title'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  query += ` ORDER BY t.${sortField} ${sortOrder}`;

  // ────────────────────────────────────────
  // Dòng 95: ⭐⭐⭐ EXECUTE QUERY ⭐⭐⭐
  // ────────────────────────────────────────
  const result = await pool.query(query, params);
  const tasks = result.rows;

  // ────────────────────────────────────────
  // Dòng 98-102: Group by Kanban (nếu cần)
  // ────────────────────────────────────────
  if (groupByKanban) {
    const grouped = {
      todo: [],
      in_progress: [],
      done: [],
      overdue: []
    };
    tasks.forEach(task => {
      if (task.kanban_column === 'todo') grouped.todo.push(task);
      // ... phần còn lại
    });
    return grouped;
  }

  return tasks;
}
```

**📊 SQL Query được tạo:**
```sql
SELECT t.*, c.category_name, c.color
FROM tasks t
LEFT JOIN categories c ON t.category_id = c.category_id
WHERE t.user_id = $1
  AND t.status = $2          (if filters.status)
  AND t.priority = $3        (if filters.priority)
  AND (t.title ILIKE $4 OR t.description ILIKE $5)  (if filters.search)
  AND t.end_time >= $6       (if filters.startDate)
  AND t.end_time <= $7       (if filters.endDate)
  AND t.assigned_to = $8     (if filters.assignee)
  AND t.category_id = $9     (if filters.categoryId)
ORDER BY t.created_at DESC
```

**🔑 Key Line**: **Dòng 95** - `const result = await pool.query(query, params);`

---

### ✅ **3️⃣ GET TASK BY ID (Lấy chi tiết)**

**📁 File**: `controllers/taskController.js`  
**📍 Dòng**: **45-77**

```javascript
// Dòng 45: Bắt đầu function
exports.getTaskById = async (req, res) => {
  try {
    // Dòng 47: Lấy userId
    const userId = req.session.userId;
    // Dòng 48: Lấy task ID từ URL params (/api/tasks/:id)
    const { id } = req.params;

    // ... validation code ...

    // Dòng 59: ⭐ GỌI SERVICE
    const task = await taskService.getTaskById(id, userId);

    // Dòng 61-67: Return response
    res.json({
      success: true,
      task: task
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};
```

#### **Service**

**📁 File**: `services/taskService.js`  
**📍 Dòng**: **104-120**

```javascript
// Dòng 104: Bắt đầu async function
async getTaskById(taskId, userId) {
  
  // ────────────────────────────────────────
  // Dòng 105-108: ⭐⭐⭐ SELECT QUERY ⭐⭐⭐
  // ────────────────────────────────────────
  const result = await pool.query(
    `SELECT t.*
     FROM tasks t
     WHERE t.task_id = $1 AND t.user_id = $2`,
    [taskId, userId]
  );

  // Dòng 110-112: Check nếu không tìm thấy
  if (result.rows.length === 0) {
    throw new Error('Không tìm thấy task hoặc bạn không có quyền truy cập');
  }

  // Dòng 114: Return task
  return result.rows[0];
}
```

**📊 SQL Query:**
```sql
SELECT t.*
FROM tasks t
WHERE t.task_id = $1 AND t.user_id = $2
```

**🔑 Key Line**: **Dòng 105** - `const result = await pool.query(...)`

---

### ✅ **4️⃣ CREATE TASK (Tạo công việc mới)**

**📁 File**: `controllers/taskController.js`  
**📍 Dòng**: **81-132**

```javascript
// Dòng 81: Bắt đầu function
exports.createTask = async (req, res) => {
  try {
    // Dòng 84: Lấy userId
    const userId = req.session.userId;

    // Dòng 90-99: Lấy data từ request body
    const taskData = {
      title: req.body.title,
      description: req.body.description || null,
      start_time: req.body.start_time || new Date().toISOString(),
      end_time: req.body.end_time || null,
      priority: req.body.priority || 'medium',
      status: req.body.status || 'todo',
      kanbanColumn: req.body.kanban_column || 'todo',
      categoryId: req.body.category_id,
      tags: req.body.tags || [],
      progress: req.body.progress || 0
    };

    // Dòng 113: ⭐ GỌI SERVICE TẠO TASK
    const newTask = await taskService.createTask(userId, taskData);

    // Dòng 116-122: ⭐ TẠO NOTIFICATION
    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Công việc mới',
      message: `Bạn đã tạo công việc "${newTask.title}"`,
      redirectUrl: '/tasks',
      relatedId: newTask.task_id
    });

    // Dòng 124-128: Return response
    res.status(201).json({
      success: true,
      message: 'Tạo task thành công',
      data: newTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo task'
    });
  }
};
```

#### **Service**

**📁 File**: `services/taskService.js`  
**📍 Dòng**: **122-145**

```javascript
// Dòng 122: Bắt đầu async function
async createTask(userId, taskData) {
  
  const {
    title,
    description,
    start_time,
    end_time,
    priority = 'medium',
    status = 'todo',
    categoryId
  } = taskData;

  // ────────────────────────────────────────
  // Dòng ~180: ⭐⭐⭐ INSERT QUERY ⭐⭐⭐
  // ────────────────────────────────────────
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, description, start_time, end_time, priority, status, category_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, title, description, start_time, end_time, priority, status, categoryId]
  );

  return result.rows[0];
}
```

**📊 SQL Query:**
```sql
INSERT INTO tasks (user_id, title, description, start_time, end_time, priority, status, category_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *
```

**🔑 Key Line**: INSERT query (khoảng dòng 180)

---

### ✅ **5️⃣ UPDATE TASK (Cập nhật công việc)**

**📁 File**: `controllers/taskController.js`  
**📍 Dòng**: **143-202**

```javascript
// Dòng 143: Bắt đầu function
exports.updateTask = async (req, res) => {
  try {
    // Dòng 145: Lấy task ID từ URL params
    const taskId = req.params.id;
    // Dòng 146: Lấy userId
    const userId = req.session.userId;
    // Dòng 147: Lấy data cần update
    const data = req.body;

    // ────────────────────────────────────────
    // Dòng 155-160: ⭐ KIỂM TRA QUYỀN SỞ HỮU
    // ────────────────────────────────────────
    const check = await pool.query(
      'SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );
    // 🛡️ An toàn - Chỉ update task của user hiện tại
    
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task không tồn tại' });
    }

    // Dòng 165-166: Reset grace_end_time nếu thay đổi end_time
    if (data.end_time !== undefined) {
      data.grace_end_time = null;
    }

    // ────────────────────────────────────────
    // Dòng 170-185: ⭐⭐⭐ BUILD DYNAMIC QUERY ⭐⭐⭐
    // ────────────────────────────────────────
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      // Dòng 176: 🛡️ Bỏ qua null/undefined
      if (value !== undefined && value !== null) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) {
      return res.json({ success: true, message: 'Không có thay đổi' });
    }

    // Dòng 189: Thêm taskId vào params
    values.push(taskId);
    
    // ────────────────────────────────────────
    // Dòng 191: ⭐⭐⭐ EXECUTE DYNAMIC UPDATE ⭐⭐⭐
    // ────────────────────────────────────────
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = $${index} RETURNING *`;
    const result = await pool.query(query, values);
    const updatedTask = result.rows[0];

    // Dòng 194-201: ⭐ TẠO NOTIFICATION
    if (data.status || data.start_time !== undefined || data.end_time !== undefined) {
      await notificationService.createNotification({
        userId,
        title: 'Nhiệm vụ được cập nhật',
        message: `Nhiệm vụ "${updatedTask.title}" đã được chỉnh sửa`,
        type: 'task'
      });
    }

    res.json({ success: true, task: updatedTask });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
```

**📊 SQL Query Example (nếu update title và status):**
```sql
UPDATE tasks 
SET title = $1, status = $2 
WHERE task_id = $3 
RETURNING *
```

**🔑 Key Lines:**
- **Dòng 155-160**: Kiểm tra quyền sở hữu
- **Dòng 170-185**: Build dynamic query
- **Dòng 191**: Execute query

---

### ✅ **6️⃣ CONFIRM TASK COMPLETE (Xác nhận hoàn thành)**

**📁 File**: `controllers/taskController.js`  
**📍 Dòng**: **393-455**

```javascript
// Dòng 393: Bắt đầu function
exports.confirmTaskComplete = async (req, res) => {
  try {
    // Dòng 395: Lấy task ID
    const taskId = req.params.id;
    // Dòng 396: Lấy userId
    const userId = req.session.userId;

    // ────────────────────────────────────────
    // Dòng 399-402: ⭐ SELECT TASK INFO
    // ────────────────────────────────────────
    const { rows } = await pool.query(
      'SELECT end_time, grace_end_time, title FROM tasks WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (rows.length === 0) return res.status(404).json({ success: false });

    const task = rows[0];
    const now = new Date();
    let graceEnd = task.grace_end_time ? new Date(task.grace_end_time) : null;

    if (!task.end_time) return res.status(400).json({ success: false });

    // ────────────────────────────────────────
    // Dòng 417-422: ⭐ SET GRACE TIME (5 phút)
    // ────────────────────────────────────────
    if (!graceEnd) {
      graceEnd = new Date(task.end_time);
      graceEnd.setMinutes(graceEnd.getMinutes() + 5);
      await pool.query(
        'UPDATE tasks SET grace_end_time = $1 WHERE task_id = $2',
        [graceEnd, taskId]
      );
    }

    // ────────────────────────────────────────
    // Dòng 426-435: ⭐ UPDATE TO DONE (trong grace period)
    // ────────────────────────────────────────
    if (now <= graceEnd) {
      await pool.query(
        `UPDATE tasks 
         SET status = 'done', kanban_column = 'done', grace_end_time = NULL 
         WHERE task_id = $1`,
        [taskId]
      );

      await notificationService.createNotification({
        userId,
        title: 'Hoàn thành đúng hạn!',
        message: `Nhiệm vụ "${task.title}" đã được xác nhận hoàn thành`,
        type: 'task'
      });
      res.json({ success: true, action: 'confirm_ok' });
    } 
    // ────────────────────────────────────────
    // Dòng 438-446: ⭐ UPDATE TO OVERDUE (vượt grace period)
    // ────────────────────────────────────────
    else {
      await pool.query(
        `UPDATE tasks SET kanban_column = 'overdue', status = 'overdue' WHERE task_id = $1`,
        [taskId]
      );
      await notificationService.createNotification({
        userId,
        title: 'Trễ hạn!',
        message: `Nhiệm vụ "${task.title}" đã bị quá thời gian ân hạn.`,
        type: 'task'
      });
      res.json({ success: false, message: 'Quá thời gian ân hạn', action: 'overdue_auto' });
    }
  } catch (err) {
    console.error('Lỗi confirm complete:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
```

**🔑 Key Lines:**
- **Dòng 399-402**: SELECT task info
- **Dòng 417-422**: SET grace time (UPDATE)
- **Dòng 426-435**: UPDATE TO DONE
- **Dòng 438-446**: UPDATE TO OVERDUE

---

### ✅ **7️⃣ REORDER TASKS (Sắp xếp lại thứ tự)**

**📁 File**: `controllers/taskController.js`  
**📍 Dòng**: **474-510**

```javascript
// Dòng 474: Bắt đầu function
exports.reorderTasks = async (req, res) => {
  try {
    // Dòng 476: Lấy userId
    const userId = req.session.userId;
    // Dòng 477: Lấy mảng task IDs
    const { order } = req.body; // [taskId1, taskId2, taskId3]

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'Order phải là mảng' });
    }

    // ────────────────────────────────────────
    // Dòng 484: ⭐ GET CLIENT FROM POOL
    // ────────────────────────────────────────
    const client = await pool.connect();
    try {
      // Dòng 486: ⭐ BEGIN TRANSACTION
      await client.query('BEGIN');
      
      // ────────────────────────────────────────
      // Dòng 487-491: ⭐ LOOP UPDATE
      // ────────────────────────────────────────
      for (let i = 0; i < order.length; i++) {
        await client.query(
          'UPDATE tasks SET sort_order = $1 WHERE task_id = $2 AND user_id = $3',
          [i, order[i], userId]
        );
      }

      // Dòng 493: ⭐ COMMIT TRANSACTION
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      // Dòng 495: ⭐ ROLLBACK NẾU CÓ LỖI
      await client.query('ROLLBACK');
      throw e;
    } finally {
      // Dòng 497: ⭐ RELEASE CLIENT
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
```

**🔑 Key Lines:**
- **Dòng 484**: `const client = await pool.connect();` - Lấy connection
- **Dòng 486**: `await client.query('BEGIN');` - Bắt đầu transaction
- **Dòng 488-491**: Loop update sort_order
- **Dòng 493**: `await client.query('COMMIT');` - Commit transaction
- **Dòng 495**: `await client.query('ROLLBACK');` - Rollback nếu lỗi

**💡 Transaction Pattern:**
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple queries
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
} finally {
  client.release();
}
```

---

## 🎯 CALENDAR / EVENTS (Lịch Sự Kiện)

### ✅ **1️⃣ IMPORT POOL**

**📁 File**: `controllers/eventController.js`  
**📍 Dòng**: **5**

```javascript
const pool = require('../config/db');
```

---

### ✅ **2️⃣ AUTO REFRESH GOOGLE TOKEN**

**📁 File**: `controllers/eventController.js`  
**📍 Dòng**: **10-32**

```javascript
// Dòng 10: Bắt đầu async function
async function getOAuth2Client(user) {
  // Dòng 11-14: Tạo OAuth2 client
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Dòng 16-19: Set credentials
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token
  });

  // ────────────────────────────────────────
  // Dòng 21-28: ⭐⭐⭐ AUTO REFRESH TOKEN ⭐⭐⭐
  // ────────────────────────────────────────
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      // 🔄 CẬP NHẬT TOKEN TỰ ĐỘNG KHI HẾT HẠN
      await pool.query(
        'UPDATE users SET google_access_token = $1 WHERE user_id = $2',
        [tokens.access_token, user.user_id]
      );
    }
  });

  return oauth2Client;
}
```

**📊 SQL Query:**
```sql
UPDATE users 
SET google_access_token = $1 
WHERE user_id = $2
```

**🔑 Key Line**: **Dòng 24-27** - AUTO UPDATE TOKEN

---

### ✅ **3️⃣ GET EVENTS**

**📁 File**: `controllers/eventController.js`  
**📍 Dòng**: **35-61**

```javascript
// Dòng 35: Bắt đầu function
exports.getEvents = async (req, res) => {
  try {
    // Dòng 37: Lấy userId
    const userId = req.session.userId;

    // Dòng 44-51: Lấy filters từ query params
    const filters = {
      startDate: req.query.start_date || req.query.startDate,
      endDate: req.query.end_date || req.query.endDate,
      search: req.query.search
    };

    // Dòng 53: ⭐ GỌI SERVICE
    const events = await eventService.getEventsByUser(userId, filters);

    // Dòng 55-58: Return response
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi lấy danh sách events',
      error: error.message 
    });
  }
};
```

**📊 Service sẽ build query tương tự TaskService**

---

### ✅ **4️⃣ GET EVENTS BY DATE RANGE (Cho Calendar)**

**📁 File**: `controllers/eventController.js`  
**📍 Dòng**: **63-91**

```javascript
// Dòng 63: Bắt đầu function
exports.getEventsByDateRange = async (req, res) => {
  try {
    // Dòng 65: Lấy userId
    const userId = req.session.userId;
    // Dòng 66: Lấy year & month từ query
    const { year, month } = req.query;

    // ... validation ...

    // Dòng 76-79: ⭐ GỌI SERVICE VỚI YEAR/MONTH
    const events = await eventService.getEventsByMonth(
      userId, 
      parseInt(year), 
      parseInt(month)
    );

    // Dòng 81-84: Return response
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error getting events by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy events theo tháng',
      error: error.message
    });
  }
};
```

---

## 🎯 KANBAN (Bảng Hỏa Động)

### ✅ **1️⃣ MOVE TASK TO COLUMN**

**📁 File**: `controllers/kanbanController.js`  
**📍 Dòng**: **31-84**

```javascript
// Dòng 31: Bắt đầu function
exports.moveTaskToColumn = async (req, res) => {
  try {
    // Dòng 33: Lấy userId
    const userId = req.session.userId;
    // Dòng 34: Lấy task ID
    const taskId = req.params.id;
    // Dòng 35: Lấy column từ request body
    const { column } = req.body; // 'todo', 'in_progress', 'done', 'overdue'

    // Dòng 37-45: ⭐ GỌI SERVICE UPDATE TASK
    const updatedTask = await taskService.updateTask(
      taskId,
      userId,
      { 
        kanban_column: column,
        status: column
      }
    );

    // Dòng 47-54: ⭐ TẠO NOTIFICATION
    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Di chuyển công việc',
      message: `Công việc "${updatedTask.title}" đã được di chuyển đến cột "${column}"`
    });

    // Dòng 56-60: Return response
    res.json({
      success: true,
      message: 'Cập nhật cột Kanban thành công',
      data: updatedTask
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

**📊 SQL Query (từ taskService.updateTask):**
```sql
UPDATE tasks 
SET kanban_column = $1, status = $2 
WHERE task_id = $3 AND user_id = $4
```

**🔑 Key Lines:**
- **Dòng 37-45**: Call service update
- **Dòng 47-54**: Create notification

---

## 🎯 REPORTS (Báo Cáo)

### ✅ **1️⃣ IMPORT POOL**

**📁 File**: `services/reportService.js`  
**📍 Dòng**: **3**

```javascript
const pool = require('../config/db');
```

---

### ✅ **2️⃣ GET TASK STATUS REPORT**

**📁 File**: `services/reportService.js`  
**📍 Dòng**: **8-14**

```javascript
// Dòng 8: Bắt đầu static async function
static async getTaskStatusReport(userId) {
  
  // ────────────────────────────────────────
  // Dòng 9-14: ⭐⭐⭐ GROUP BY QUERY ⭐⭐⭐
  // ────────────────────────────────────────
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count 
     FROM tasks 
     WHERE user_id = $1 
     GROUP BY status
     ORDER BY count DESC`,
    [userId]
  );
  
  return rows;
}
```

**📊 SQL Query:**
```sql
SELECT status, COUNT(*)::int AS count 
FROM tasks 
WHERE user_id = $1 
GROUP BY status
ORDER BY count DESC
```

**📤 Kết quả:**
```json
[
  { status: 'done', count: 5 },
  { status: 'todo', count: 3 },
  { status: 'in_progress', count: 2 }
]
```

**🔑 Key Line**: **Dòng 9-14** - Aggregate query with GROUP BY

---

### ✅ **3️⃣ GET EVENT TYPE REPORT**

**📁 File**: `services/reportService.js`  
**📍 Dòng**: **16-32**

```javascript
// Dòng 16: Bắt đầu static async function
static async getEventTypeReport(userId, filter = {}) {
  
  // ────────────────────────────────────────
  // Dòng 17-26: ⭐ BUILD QUERY
  // ────────────────────────────────────────
  let query = `
    SELECT COALESCE(c.category_name, 'Không phân loại') AS event_type, COUNT(*)::int AS count
    FROM events e
    LEFT JOIN categories c ON e.category_id = c.category_id AND c.user_id = e.user_id
    WHERE e.user_id = $1`;
  
  const params = [userId];

  // ────────────────────────────────────────
  // Dòng 28-30: ⭐ ADD MONTH/YEAR FILTER
  // ────────────────────────────────────────
  if (filter.month && filter.year) {
    query += ` AND EXTRACT(MONTH FROM e.created_at) = $2 AND EXTRACT(YEAR FROM e.created_at) = $3`;
    params.push(filter.month, filter.year);
  }

  // Dòng 32: Add GROUP BY
  query += ` GROUP BY c.category_name ORDER BY count DESC`;

  // ────────────────────────────────────────
  // Dòng 35: ⭐ EXECUTE QUERY
  // ────────────────────────────────────────
  const { rows } = await pool.query(query, params);
  return rows.length > 0 ? rows : [];
}
```

**🔑 Key Lines:**
- **Dòng 17-26**: Build base query with LEFT JOIN
- **Dòng 28-30**: Add optional filters
- **Dòng 35**: Execute query

---

### ✅ **4️⃣ GET TASKS BY PERIOD**

**📁 File**: `services/reportService.js`  
**📍 Dòng**: **34-80**

```javascript
// Dòng 34: Bắt đầu static async function
static async getTasksByPeriod(userId, period = 'week', filter = {}) {
  let query = '';
  const params = [userId];

  // ────────────────────────────────────────
  // Dòng 44-49: ⭐ WEEK REPORT
  // ────────────────────────────────────────
  if (period === 'week') {
    query = `
      SELECT DATE(created_at) AS day, COUNT(*)::int AS count
      FROM tasks 
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at) 
      ORDER BY day ASC`;
  } 
  
  // ────────────────────────────────────────
  // Dòng 51-66: ⭐ MONTH REPORT
  // ────────────────────────────────────────
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
    } else {
      query = `
        SELECT DATE(created_at) AS day, COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1
          AND created_at >= date_trunc('month', CURRENT_DATE)
          AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY DATE(created_at) 
        ORDER BY day ASC`;
    }
  }

  // ────────────────────────────────────────
  // Dòng 80: ⭐ EXECUTE QUERY
  // ────────────────────────────────────────
  const { rows } = await pool.query(query, params);
  return rows;
}
```

**🔑 Key Lines:**
- **Dòng 44-49**: WEEK query (last 7 days)
- **Dòng 51-66**: MONTH query (with optional month/year filter)
- **Dòng 80**: Execute query

---

### ✅ **5️⃣ GENERATE REPORT HTML**

**📁 File**: `services/reportService.js`  
**📍 Dòng**: **82-150**

```javascript
// Dòng 82: Bắt đầu static async function
static async generateReportHTML(userId) {
  
  // ────────────────────────────────────────
  // Dòng 83-86: ⭐ PARALLEL FETCH
  // ────────────────────────────────────────
  const [taskStats, eventTypes] = await Promise.all([
    this.getTaskStatusReport(userId),    // ← Gọi query GROUP BY tasks
    this.getEventTypeReport(userId)      // ← Gọi query GROUP BY events
  ]);

  // Dòng 88-100: BUILD HTML TASK TABLE
  let taskTable = taskStats.length > 0
    ? `<table ...>
        <tr><th>Trạng thái</th><th>Số lượng</th></tr>`
    : '<p>Chưa có công việc nào</p>';

  // Dòng 101-108: LOOP ADD ROWS
  taskStats.forEach(t => {
    taskTable += `<tr><td>${statusText}</td><td>${t.count}</td></tr>`;
  });

  // ... tương tự cho event table ...

  // 📄 Return HTML report (dùng cho email, xem web, PDF)
  return htmlReport;
}
```

**🔑 Key Lines:**
- **Dòng 83-86**: `Promise.all()` - Fetch 2 reports song song
- **Dòng 101-108**: Loop để build HTML rows

---

## 📊 QUICK REFERENCE - TẤT CẢ SQL QUERIES

| Tính Năng | File | Dòng | Query Type | SQL Command |
|-----------|------|------|-----------|-------------|
| **TASKS** |
| getTasks | taskController.js | 26 | SELECT | Dynamic SELECT with filters |
| getTaskById | taskService.js | 105 | SELECT | SELECT WHERE task_id = $1 |
| createTask | taskService.js | ~180 | INSERT | INSERT INTO tasks RETURNING * |
| updateTask | taskController.js | 155-191 | UPDATE | Dynamic UPDATE |
| confirmTaskComplete | taskController.js | 399, 417, 426, 438 | SELECT + UPDATE | SELECT + UPDATE grace_end_time |
| reorderTasks | taskController.js | 484-493 | TRANSACTION | BEGIN → UPDATE × n → COMMIT |
| **CALENDAR** |
| Auto Refresh Token | eventController.js | 24-27 | UPDATE | UPDATE users SET google_access_token |
| getEvents | eventController.js | 53 | SELECT | SELECT * FROM events with filters |
| getEventsByDateRange | eventController.js | 76 | SELECT | SELECT by MONTH/YEAR |
| **KANBAN** |
| moveTaskToColumn | kanbanController.js | 37-45 | UPDATE | UPDATE kanban_column via service |
| **REPORTS** |
| Task Status Report | reportService.js | 9 | GROUP BY | GROUP BY status, COUNT(*) |
| Event Type Report | reportService.js | 17-35 | GROUP BY | GROUP BY category_name, COUNT(*) |
| Tasks By Period | reportService.js | 44-80 | GROUP BY | GROUP BY DATE(created_at), COUNT(*) |

---

**Tạo bởi**: GitHub Copilot  
**Ngày**: 2026-01-06  
✅ Chi tiết file, dòng, và giải thích SQL statements
