# 📚 TÀI LIỆU TÁI CẤU TRÚC DỰ ÁN

## ✅ Đã hoàn thành

### 1. **Fix lỗi package.json**

- ✅ Thêm `$schema` với URL đúng: `https://json.schemastore.org/package.json`
- ✅ Không còn lỗi "ENOTFOUND www.schemastore.org"

### 2. **Tái cấu trúc theo mô hình MVC chuẩn**

#### 📂 **Backend (Logic nghiệp vụ)**

```
controllers/
├── authController.js      ✅ Xử lý đăng nhập/đăng ký
├── taskController.js      ✅ MỚI - Xử lý CRUD tasks
└── eventController.js     ✅ MỚI - Xử lý CRUD events

routes/
├── authRoutes.js          ✅ API routes cho auth
├── taskRoutes.js          ✅ MỚI - API routes cho tasks
├── eventRoutes.js         ✅ MỚI - API routes cho events
└── index.js               ✅ Page routes

models/
└── User.js                ✅ User model với bcrypt
```

#### 🎨 **Frontend (Chỉ UI + gọi API)**

```
assets/js/
├── tasks.js               📝 GIỮ NGUYÊN (code cũ)
├── tasks.js.backup        💾 BACKUP
├── tasks-new.js           ✅ MỚI - Template chuẩn
├── calendar.js            📝 GIỮ NGUYÊN (code cũ)
├── calendar.js.backup     💾 BACKUP
├── calendar-new.js        ✅ MỚI - Template chuẩn
└── ... (các file khác giữ nguyên)
```

---

## 🎯 Kiến trúc mới

### **Luồng hoạt động**

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐      ┌──────────┐
│  Frontend   │─────▶│   API Route  │─────▶│   Controller   │─────▶│   Model  │
│ (assets/js) │      │ (routes/)    │      │ (controllers/) │      │ (models/)│
│             │◀─────│              │◀─────│                │◀─────│          │
└─────────────┘ JSON └──────────────┘ Data └────────────────┘ Data └──────────┘
     UI only          URL mapping       Business logic        Database
```

### **Ví dụ cụ thể: Thêm task**

```javascript
// 1. Frontend (assets/js/tasks-new.js) - CHỈ xử lý UI
async function createTask(taskData) {
  const response = await fetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  });
  // Nhận kết quả và hiển thị
}

// 2. Route (routes/taskRoutes.js) - Mapping URL
router.post("/api/tasks", taskController.createTask);

// 3. Controller (controllers/taskController.js) - XỬ LÝ LOGIC
exports.createTask = async (req, res) => {
  // Validation
  // Gọi database
  // Trả về JSON
};
```

---

## 📋 API Endpoints đã tạo

### **Tasks API**

| Method | Endpoint                | Chức năng           |
| ------ | ----------------------- | ------------------- |
| GET    | `/api/tasks`            | Lấy danh sách tasks |
| GET    | `/api/tasks/:id`        | Lấy chi tiết 1 task |
| POST   | `/api/tasks`            | Tạo task mới        |
| PUT    | `/api/tasks/:id`        | Cập nhật task       |
| DELETE | `/api/tasks/:id`        | Xóa task            |
| PATCH  | `/api/tasks/:id/status` | Đổi trạng thái      |
| PATCH  | `/api/tasks/:id/kanban` | Đổi cột Kanban      |

### **Events API**

| Method | Endpoint            | Chức năng            |
| ------ | ------------------- | -------------------- |
| GET    | `/api/events`       | Lấy danh sách events |
| GET    | `/api/events/range` | Lấy events theo ngày |
| GET    | `/api/events/:id`   | Lấy chi tiết 1 event |
| POST   | `/api/events`       | Tạo event mới        |
| PUT    | `/api/events/:id`   | Cập nhật event       |
| DELETE | `/api/events/:id`   | Xóa event            |

---

## 🔄 Hướng dẫn chuyển đổi code cũ

### **Bước 1: Hiểu cấu trúc**

**❌ Cũ (SAI):**

```javascript
// assets/js/tasks.js
let tasks = []; // Lưu trong localStorage

function createTask() {
  tasks.push(newTask);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  displayTasks();
}
// ↑ Logic nghiệp vụ trong Frontend!
```

**✅ Mới (ĐÚNG):**

```javascript
// assets/js/tasks-new.js - FRONTEND
async function createTask(taskData) {
  await fetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  });
  // ↑ Chỉ gọi API
}

// controllers/taskController.js - BACKEND
exports.createTask = async (req, res) => {
  // Validation
  // Insert vào database
  // Trả về JSON
};
// ↑ Logic nghiệp vụ trong Backend!
```

### **Bước 2: Chuyển đổi từng chức năng**

#### **Ví dụ: Load tasks**

**Code cũ:**

```javascript
function loadTasks() {
  tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  displayTasks(tasks);
}
```

**Code mới:**

```javascript
async function loadTasks() {
  const response = await fetch("/api/tasks");
  const data = await response.json();
  displayTasks(data.tasks);
}
```

#### **Ví dụ: Xóa task**

**Code cũ:**

```javascript
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  displayTasks();
}
```

**Code mới:**

```javascript
async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  loadTasks(); // Reload từ server
}
```

---

## 🚀 Cách sử dụng

### **Test API bằng Postman/Thunder Client**

```bash
# 1. Lấy danh sách tasks
GET http://localhost:8888/api/tasks

# 2. Thêm task mới
POST http://localhost:8888/api/tasks
Content-Type: application/json

{
  "title": "Test task",
  "description": "Mô tả",
  "start_time": "2025-11-21T10:00:00",
  "priority": "high",
  "status": "pending"
}

# 3. Cập nhật task
PUT http://localhost:8888/api/tasks/1
Content-Type: application/json

{
  "title": "Updated title"
}

# 4. Xóa task
DELETE http://localhost:8888/api/tasks/1
```

### **Tích hợp vào Frontend**

```html
<!-- views/tasks.ejs -->
<script src="/js/tasks-new.js"></script>
```

---

## 📝 TODO - Những gì bạn cần làm tiếp

### 1. **Chỉnh sửa views/tasks.ejs**

```html
<!-- Thêm các element cần thiết -->
<div id="task-list"></div>
<button id="btn-add-task">Thêm task</button>
```

### 2. **Hoàn thiện tasks-new.js**

- Copy phần UI từ `tasks.js.backup`
- Chỉ giữ code hiển thị, không giữ logic
- Thay localStorage bằng API calls

### 3. **Hoàn thiện calendar-new.js**

- Copy phần UI từ `calendar.js.backup`
- Thay localStorage bằng API calls

### 4. **Test từng chức năng**

- Đăng nhập → Vào trang tasks
- Test thêm/sửa/xóa task
- Kiểm tra database có lưu đúng không

---

## 🎓 Kiến thức cần nắm

### **1. Frontend vs Backend**

- **Frontend**: Chạy trong browser, xử lý UI
- **Backend**: Chạy trên server, xử lý logic + database

### **2. API là gì?**

- **API**: Cầu nối giữa Frontend và Backend
- **Endpoint**: URL như `/api/tasks`
- **Method**: GET, POST, PUT, DELETE
- **JSON**: Format dữ liệu trao đổi

### **3. Tại sao phải tách?**

- ✅ Code sạch, dễ bảo trì
- ✅ Bảo mật tốt hơn
- ✅ Có thể làm mobile app sau
- ✅ Nhiều người làm cùng lúc

---

## ❓ Câu hỏi thường gặp

### **Q: Có cần xóa code cũ không?**

A: KHÔNG! Code cũ đã được backup trong `.backup`. Giữ lại để tham khảo.

### **Q: File nào là Frontend, file nào là Backend?**

A:

- **Frontend**: `assets/js/*.js`, `views/*.ejs`
- **Backend**: `controllers/*.js`, `routes/*.js`, `models/*.js`

### **Q: `/api/` có phải là thư mục không?**

A: KHÔNG! Đó chỉ là prefix trong URL. Không có thư mục `api/`.

### **Q: Tôi nên chỉnh file nào trước?**

A:

1. Xem `tasks-new.js` và `calendar-new.js` để hiểu cấu trúc
2. Copy code UI từ file `.backup`
3. Thay localStorage bằng fetch API
4. Test từng chức năng

---

## 📞 Hỗ trợ

Nếu gặp lỗi:

1. Kiểm tra terminal xem có lỗi không
2. Kiểm tra Console trong browser (F12)
3. Kiểm tra API có trả về đúng không (dùng Postman)

---

🎉 **Chúc bạn code vui!**
