# 📊 REPORTS (Báo Cáo) - Luồng Hoạt Động & Kiến Thức Quan Trọng

> Hướng dẫn này giải thích **luồng thực thi** của hệ thống báo cáo: từ khi user bấm button → xử lý → trả về kết quả. Kèm theo là kiến thức SQL quan trọng.

---

## � **LUỒNG CHUNG CỦA HỆ THỐNG REPORTS**

### 📍 Bước 0: User Click Button Report Trên Giao Diện

```
Frontend (views/dashboard.html)
         ↓
    User click: "View Task Reports"
         ↓
    HTTP GET /api/reports/task-status
         ↓
Controller (controllers/reportController.js)
         ↓
Service (services/reportService.js)
         ↓
Database (PostgreSQL)
         ↓
Return JSON → Frontend hiển thị biểu đồ
```

---

## 📁 **File: `controllers/reportController.js`** - CONTROLLER LAYER (Nhận Request)

### 🔹 Endpoint 1: GET /api/reports/task-status

**📍 VỊ TRỊ CODE:**
- **File:** `controllers/reportController.js`
- **Dòng:** ~10-20

**LUỒNG:**
```
**thống kê task theo trạng thái của user và hiển thị báo cáo.**
1️⃣ GET /api/reports/task-status → Router nhận
2️⃣ Lấy userId từ req.session
3️⃣ Gọi reportService.getTaskStatusReport(userId)
4️⃣ Service query database
5️⃣ PostgreSQL: WHERE user_id=100, GROUP BY status, COUNT(*)
6️⃣ Trả về rows: [{status, count}, ...]
7️⃣ res.json(report) → Frontend render
**Lời**
Khi user yêu cầu xem báo cáo, frontend gọi API.
Controller lấy userId từ session và gọi Service.
Service truy vấn CSDL để thống kê số lượng task theo trạng thái của user.
Kết quả được trả về để frontend hiển thị biểu đồ.
```

**CODE:**
```javascript
// File: controllers/reportController.js - dòng ~10
router.get('/task-status', async (req, res) => {
  try {
    const userId = req.session.userId; // 👈 Lấy userId từ session
    const report = await reportService.getTaskStatusReport(userId);
    // 👆 Gọi service để query database
    
    res.json(report); // Trả về JSON
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**DỮ LIỆU TRUYỀN ĐI:**
```
Request:  GET /api/reports/task-status
Header:   Cookie: sessionId=abc123 (chứa userId=100)

Response: 
[
  { status: 'done', count: 15 },
  { status: 'in_progress', count: 8 },
  { status: 'todo', count: 5 },
  { status: 'overdue', count: 2 }
]
```

---

## 📁 **File: `services/reportService.js`** - SERVICE LAYER (Xử Lý Logic)

### 🔹 Hàm 1: getTaskStatusReport() - Đếm Tasks Theo Status

📍 **VỊ TRỊ CODE:**
- **File:** `services/reportService.js`
- **Dòng:** ~30-45

**LUỒNG THỰC THI:**

```
**THỐNG KÊ và HIỂN THỊ**
1️⃣ Service nhận userId
2️⃣ Tạo SQL query: SELECT status, COUNT(*) FROM tasks WHERE user_id=100 GROUP BY status
3️⃣ pool.query() gửi tới PostgreSQL
4️⃣ PostgreSQL xử lý:
   - WHERE: lọc chỉ user_id=100
   - GROUP BY status: gom nhóm (done, todo, in_progress, overdue)
   - COUNT(*): đếm mỗi nhóm
   - ORDER BY: sắp xếp giảm dần
5️⃣ Trả về rows: [{status:'done', count:3}, {status:'todo', count:2}, ...]
6️⃣ Return rows cho controller
**Lời**
Sau khi service xử lý và thống kê dữ liệu trong CSDL xong, sẽ trả kết quả về cho controller.
Controller tiếp nhận kết quả đó và trả về cho frontend để hiển thị lên giao diện dưới dạng biểu đồ.
```

**CODE & GIẢI THÍCH:**

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
  return rows;
}
```

**BẢNG TASKS GỐC TRONG DATABASE:**
```
┌─────────┬─────────────────┬──────────┬───────────┐
│ task_id │ user_id         │ title    │ status    │
├─────────┼─────────────────┼──────────┼───────────┤
│ 1       │ 100 (user)      │ Task 1   │ done      │
│ 2       │ 100 (user)      │ Task 2   │ done      │
│ 3       │ 100 (user)      │ Task 3   │ todo      │
│ 4       │ 100 (user)      │ Task 4   │ in_progress │
│ 5       │ 100 (user)      │ Task 5   │ todo      │
│ 6       │ 100 (user)      │ Task 6   │ done      │
│ 7       │ 100 (user)      │ Task 7   │ overdue   │
└─────────┴─────────────────┴──────────┴───────────┘
```

**📌 BƯỚC 1: WHERE user_id = $1 (LỌC USER)**
```
WHERE user_id = 100

Kết quả sau filter:
┌─────────┬──────────────────────┬───────────┐
│ task_id │ title                │ status    │
├─────────┼──────────────────────┼───────────┤
│ 1       │ Task 1               │ done      │
│ 2       │ Task 2               │ done      │
│ 3       │ Task 3               │ todo      │
│ 4       │ Task 4               │ in_progress │
│ 5       │ Task 5               │ todo      │
│ 6       │ Task 6               │ done      │
│ 7       │ Task 7               │ overdue   │
└─────────┴──────────────────────┴───────────┘
```

**📌 BƯỚC 2: GROUP BY status (NHÓM LẠI)**
```
GROUP BY status = Chia thành các nhóm theo giá trị status

Nhóm 1 - status='done':        Nhóm 2 - status='in_progress':  Nhóm 3 - status='todo':
Task 1, Task 2, Task 6         Task 4                          Task 3, Task 5

Nhóm 4 - status='overdue':
Task 7
```

**📌 BƯỚC 3: COUNT(*) (ĐẾM TRONG TỪNG NHÓM)**
```
Nhóm 'done':         COUNT(*) = 3 ✓
Nhóm 'in_progress':  COUNT(*) = 1 ✓
Nhóm 'todo':         COUNT(*) = 2 ✓
Nhóm 'overdue':      COUNT(*) = 1 ✓
```

**📌 BƯỚC 4: ORDER BY count DESC (SẮP XẾP)**
```
SẮP XẾP: done(3) → todo(2) → in_progress(1) → overdue(1)
```

**⭐ KIẾN THỨC #1: GROUP BY**
```
Nếu KHÔNG dùng GROUP BY:
SELECT status FROM tasks WHERE user_id = 100
Kết quả: 7 dòng riêng lẻ (done, done, todo, in_progress, todo, done, overdue)
❌ Không hữu ích: chỉ liệt kê

Nếu dùng GROUP BY:
SELECT status, COUNT(*) FROM tasks WHERE user_id = 100 GROUP BY status
Kết quả: 4 dòng tóm tắt (done:3, in_progress:1, todo:2, overdue:1)
✅ Hữu ích: thấy tổng quát

VÌ SAO?
1. Database tự tính COUNT ở server (nhanh)
2. Thay vì đọc 7 dòng vào JavaScript rồi loop đếm
3. Kết quả gọn gàng dùng cho biểu đồ
```

**KẾT QUẢ CUỐI CÙNG:**
```javascript
[
  { status: 'done', count: 3 },        // 3 tasks hoàn thành
  { status: 'todo', count: 2 },        // 2 tasks chưa làm
  { status: 'in_progress', count: 1 }, // 1 task đang làm
  { status: 'overdue', count: 1 }      // 1 task quá hạn
]

Frontend nhận dữ liệu này → Vẽ biểu đồ tròn/cột hiển thị tỉ lệ
```

---

### 🔹 Hàm 2: getEventTypeReport() - Đếm Events Theo Loại (Category)

📍 **VỊ TRỊ CODE:**
- **File:** `services/reportService.js`
- **Dòng:** ~50-75

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
  return rows;
}
```

**⭐ KIẾN THỨC QUAN TRỌNG #1: GROUP BY (Nhóm Dữ Liệu)**

```
GROUP BY = Gom nhóm dữ liệu theo một cột, sau đó thực hiện hàm tính toán (COUNT, SUM, AVG, etc)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BẢNG TASKS GỐC:
┌─────────┬─────────────────┬──────────┐
│ task_id │ user_id         │ status   │
├─────────┼─────────────────┼──────────┤
│ 1       │ 100 (user)      │ done     │
│ 2       │ 100 (user)      │ done     │
│ 3       │ 100 (user)      │ todo     │
│ 4       │ 100 (user)      │ in_progress │
│ 5       │ 100 (user)      │ todo     │
│ 6       │ 100 (user)      │ done     │
│ 7       │ 200 (other user)│ done     │
└─────────┴─────────────────┴──────────┘

QUERY KHÔNG DÙNG GROUP BY:
SELECT status FROM tasks WHERE user_id = 100
KẾT QUẢ: 6 dòng (từng task riêng lẻ)
┌─────────┐
│ status  │
├─────────┤
│ done    │  ← Task 1
│ done    │  ← Task 2
│ todo    │  ← Task 3
│ in_progress │ ← Task 4
│ todo    │  ← Task 5
│ done    │  ← Task 6
└─────────┘
❌ Không hữu ích vì chỉ liệt kê từng task, không có tóm tắt

QUERY CÓ DÙNG GROUP BY status:
SELECT status, COUNT(*) AS count FROM tasks WHERE user_id = 100 GROUP BY status
KẾT QUẢ: 3 dòng (tóm tắt theo từng trạng thái)
┌──────────────┬───────┐
│ status       │ count │
├──────────────┼───────┤
│ done         │   3   │  ← GROUP BY status='done': đếm được task 1,2,6 = 3 tasks ✓
│ todo         │   2   │  ← GROUP BY status='todo': đếm được task 3,5 = 2 tasks ✓
│ in_progress  │   1   │  ← GROUP BY status='in_progress': đếm được task 4 = 1 task ✓
└──────────────┴───────┘
✅ Hữu ích: Thấy tóm tắt tổng quát!

VÌ SAO DÙNG GROUP BY?
1. Tối ưu hóa: PostgreSQL tự tính COUNT trên server, không cần JavaScript loop 1000+ lần
2. Nhanh hơn: Query trực tiếp = 1 database call, thay vì đọc tất cả rồi loop
3. Gọn gàng: Code SQL 1 dòng, thay vì 10 dòng JavaScript
```

**Giải thích từng dòng SQL:**

```javascript
// 📌 SELECT status, COUNT(*)::int AS count
//    └─ Chọn cột 'status' (để hiển thị)
//    └─ COUNT(*) = đếm số dòng (COUNT xem có bao nhiêu task)
//       • * = đếm TẤT CẢ (COUNT cũng có thể COUNT(task_id), kết quả giống)
//    └─ ::int = ép kiểu casting (PostgreSQL syntax)
//       • COUNT(*) trả về type 'bigint' (số rất lớn)
//       • ::int ép thành 'integer' (số nhỏ hơn, dùng được cho JSON)

// 📌 FROM tasks
//    └─ Lấy từ bảng 'tasks'

// 📌 WHERE user_id = $1
//    └─ Filter: Chỉ lấy tasks của user hiện tại
//    └─ $1 = userId (tham số an toàn, ngăn SQL Injection)

// 📌 GROUP BY status
//    └─ Nhóm theo cột 'status'
//    └─ Mỗi giá trị status là 1 nhóm: 'todo' | 'in_progress' | 'done' | 'overdue'
//    └─ COUNT(*) sẽ tính riêng cho từng nhóm

// 📌 ORDER BY count DESC
//    └─ Sắp xếp giảm dần theo 'count'
//    └─ DESC = descending (giảm dần)
//    └─ ASC = ascending (tăng dần, là mặc định nếu không ghi)
//    └─ Kết quả: done(15) → in_progress(8) → todo(5) → overdue(2)
```

**Kết quả trả về:**
```javascript
[
  { status: 'done', count: 15 },        // 15 tasks hoàn thành
  { status: 'in_progress', count: 8 },  // 8 tasks đang làm
  { status: 'todo', count: 5 },         // 5 tasks chưa làm
  { status: 'overdue', count: 2 }       // 2 tasks quá hạn
]
```

---

## 📁 **File: `services/reportService.js`** - Dòng 21-35 (Báo Cáo Loại Sự Kiện - LEFT JOIN & COALESCE)

**LUỒNG THỰC THI & XỬ LÝ CODE:**

```
Thống kê số lượng sự kiện theo loại / danh mục của user
1️⃣ Function: getEventTypeReport(userId, filter={})
2️⃣ Xây query: SELECT COALESCE(c.category_name, 'Không phân loại') AS event_type, COUNT(*)
   FROM events e LEFT JOIN categories c ...
   WHERE e.user_id = $1
3️⃣ Kiểm tra filter: if(filter.month && filter.year) → thêm EXTRACT filter
4️⃣ Thêm cuối: GROUP BY c.category_name ORDER BY count DESC
5️⃣ PostgreSQL xử lý:
   - WHERE: lọc user_id=100
   - LEFT JOIN: nối events + categories (giữ TẤT CẢ events, kể cả NULL)
   - COALESCE: thay NULL → 'Không phân loại'
   - GROUP BY: gom nhóm theo category_name
   - COUNT: đếm mỗi nhóm
6️⃣ Trả về: [{event_type, count}, ...]
7️⃣ return rows.length > 0 ? rows : []
**Lời**
Chức năng này dùng để thống kê event theo từng loại.
Service sẽ lấy các event của user từ CSDL, xác định mỗi event thuộc category nào, kể cả event không có category thì gán là “Không phân loại”.
Sau khi thống kê xong, service trả kết quả cho controller, controller trả về cho frontend để hiển thị lên biểu đồ.
```

**CODE:**

```javascript
static async getEventTypeReport(userId, filter = {}) {
  let query = `
    SELECT 
      COALESCE(c.category_name, 'Không phân loại') AS event_type,
      COUNT(*)::int AS count
    FROM events e
    LEFT JOIN categories c ON e.category_id = c.category_id AND c.user_id = e.user_id
    WHERE e.user_id = $1`;
  
  const params = [userId];

  // 🔹 NẾU CÓ FILTER MONTH/YEAR THÌ THÊM ĐIỀU KIỆN
  if (filter.month && filter.year) {
    query += ` AND EXTRACT(MONTH FROM e.created_at) = $2 AND EXTRACT(YEAR FROM e.created_at) = $3`;
    params.push(filter.month, filter.year);
  }

  query += ` GROUP BY c.category_name ORDER BY count DESC`;

  const { rows } = await pool.query(query, params);
  return rows.length > 0 ? rows : [];
}
```

**📊 BẢNG DỮ LIỆU (TRƯỚC KHI XỬ LÝ):**

BẢNG events:
```
┌──────────┬────────────┬─────────────┐
│ event_id │ user_id    │ category_id │
├──────────┼────────────┼─────────────┤
│ 1        │ 100        │ 1 (Work)    │
│ 2        │ 100        │ 1 (Work)    │
│ 3        │ 100        │ NULL        │ ← Không có category
│ 4        │ 100        │ 2 (Personal)│
│ 5        │ 100        │ NULL        │ ← Không có category
│ 6        │ 200        │ 1 (Work)    │ ← User khác
└──────────┴────────────┴─────────────┘

BẢNG categories:
┌────────────┬──────────────────┐
│ cat_id     │ category_name    │
├────────────┼──────────────────┤
│ 1          │ Work             │
│ 2          │ Personal         │
└────────────┴──────────────────┘
```

**📌 BƯỚC 1: WHERE e.user_id = $1 (LỌC CHỈ USER NÀY)**
```
Sau filter: chỉ lấy 5 events của user 100 (bỏ event 6 của user 200)
```

**📌 BƯỚC 2: LEFT JOIN categories (NỐI VỚI CATEGORY)**

**❌ NẾU DÙNG INNER JOIN (BỎ DỮ LIỆU):**
```
INNER JOIN categories
ON events.category_id = categories.cat_id

Kết quả: Chỉ lấy events CÓ category
┌──────────┬──────────────────┐
│ event_id │ category_name    │
├──────────┼──────────────────┤
│ 1        │ Work             │
│ 2        │ Work             │
│ 4        │ Personal         │
└──────────┴──────────────────┘
❌ BỊ MẤT: Event 3, 5 (category = NULL) bị bỏ đi
→ Báo cáo không chính xác: thiếu 2 sự kiện
```

**✅ NẾU DÙNG LEFT JOIN (GIỮ TẤT CẢ):**
```
LEFT JOIN categories
ON events.category_id = categories.cat_id

Kết quả: Lấy TẤT CẢ events, kể cả category=NULL
┌──────────┬──────────────────────┐
│ event_id │ c.category_name      │
├──────────┼──────────────────────┤
│ 1        │ Work                 │
│ 2        │ Work                 │
│ 3        │ NULL ← không match   │
│ 4        │ Personal             │
│ 5        │ NULL ← không match   │
└──────────┴──────────────────────┘
✅ GIỮ TẤT CẢ: Event 3, 5 được giữ lại (category = NULL)
```

**📌 BƯỚC 3: COALESCE (THAY NULL BẰNG GIÁ TRỊ MẶC ĐỊNH)**
```
COALESCE(c.category_name, 'Không phân loại')

Chuyển đổi:
- 'Work'         → 'Work'
- 'Personal'     → 'Personal'
- NULL           → 'Không phân loại' ✓ (COALESCE xử lý)

Sau COALESCE:
┌──────────┬──────────────────────┐
│ event_id │ event_type           │
├──────────┼──────────────────────┤
│ 1        │ Work                 │
│ 2        │ Work                 │
│ 3        │ Không phân loại      │ ← COALESCE
│ 4        │ Personal             │
│ 5        │ Không phân loại      │ ← COALESCE
└──────────┴──────────────────────┘

VÌ SAO COALESCE?
- Thay NULL = xấu (khó hiểu)
- Thay = 'Không phân loại' = rõ ràng (người dùng hiểu)
```

**📌 BƯỚC 4: GROUP BY + COUNT**
```
GROUP BY event_type

Nhóm 'Work':            Nhóm 'Personal':    Nhóm 'Không phân loại':
Event 1, Event 2        Event 4            Event 3, Event 5
COUNT = 2               COUNT = 1          COUNT = 2
```

**KẾT QUẢ CUỐI CÙNG:**
```javascript
[
  { event_type: 'Work', count: 2 },
  { event_type: 'Không phân loại', count: 2 },
  { event_type: 'Personal', count: 1 }
]
```

**⭐ KIẾN THỨC #2: LEFT JOIN vs INNER JOIN**

**⭐ KIẾN THỨC #2: LEFT JOIN vs INNER JOIN**

```
Sự khác biệt:
INNER JOIN = Chỉ lấy bản ghi tồn tại ở CẢNG 2 bảng (mất dữ liệu)
LEFT JOIN = Lấy TẤT CẢ từ bảng trái + liên kết phải (giữ dữ liệu)

Ứng dụng:
- Khi bảng phải CÓ thể NULL → dùng LEFT JOIN
- Khi bảng phải PHẢI có dữ liệu → dùng INNER JOIN
```

**⭐ KIẾN THỨC #3: COALESCE (Thay NULL Bằng Giá Trị Mặc Định)**

```
COALESCE(column, default_value)
= Nếu column = NULL thì dùng default_value

Ví dụ: COALESCE(c.category_name, 'Không phân loại')
- category_name = 'Work'  → 'Work'
- category_name = 'Personal' → 'Personal'
- category_name = NULL    → 'Không phân loại' ✓

Tại sao cần?
- Không dùng → Frontend hiển thị NULL (xấu)
- Dùng COALESCE → Frontend hiển thị 'Không phân loại' (rõ ràng)
```

---

### 🔹 Hàm 3: getTasksByPeriod() - Lọc Theo Ngày/Tháng/Năm ⭐ QUAN TRỌNG

📍 **VỊ TRỊ CODE:**
- **File:** `services/reportService.js`
- **Dòng:** ~80-220

**LUỒNG CHUNG:**

```
Thống kê số lượng task theo thời gian:
1️⃣ Frontend user chọn filter:
   - period: 'day' | 'week' | 'month'
   - month & year (nếu filter thêm)
   ↓
2️⃣ Frontend gửi: GET /api/reports/tasks?period=month&month=1&year=2025
   ↓
3️⃣ Controller nhận request → gọi service với parameters
   ↓
4️⃣ Service kiểm tra period
   - Nếu 'day' → SQL: EXTRACT(HOUR) + DATE filter
   - Nếu 'week' → SQL: DATE() + INTERVAL
   - Nếu 'month' → SQL: EXTRACT(MONTH/YEAR) hoặc date_trunc
   ↓
5️⃣ PostgreSQL thực thi query phù hợp
   ↓
6️⃣ Trả về dữ liệu → Frontend hiển thị biểu đồ
**Lời**
Khi user chọn ngày, tuần hoặc tháng trên giao diện, frontend gửi request lên controller.
Controller tiếp nhận và chuyển cho service.
Service dựa vào loại thời gian được chọn để truy vấn dữ liệu theo cột thời gian trong CSDL.
Sau đó service trả kết quả cho controller, controller trả về cho frontend để hiển thị lên biểu đồ.
```

**CODE:**

```javascript
static async getTasksByPeriod(userId, period = 'week', filter = {}) {
  let query = '';
  const params = [userId];

  // 🔹 CASE 1: LỌC THEO GIỜ (HÔM NAY)

📍 **VỊ TRỊ CODE:** `services/reportService.js` - Dòng ~85-95

  if (period === 'day') {
    query = `
      SELECT 
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*)::int AS count
      FROM tasks 
      WHERE user_id = $1 
        AND DATE(created_at) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `;
  } 
  // 🔹 CASE 2: LỌC THEO NGÀY (7 NGÀY GẦN NHẤT)

📍 **VỊ TRỊ CODE:** `services/reportService.js` - Dòng ~100-110

  else if (period === 'week') {
    query = `
      SELECT 
        DATE(created_at) AS day,
        COUNT(*)::int AS count
      FROM tasks 
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;
  } 
  // 🔹 CASE 3: LỌC THEO THÁNG

📍 **VỊ TRỊ CODE:** `services/reportService.js` - Dòng ~115-160

  else if (period === 'month') {
    if (filter.month && filter.year) {
      // User chọn tháng/năm cụ thể
      query = `
        SELECT 
          DATE(created_at) AS day,
          COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM created_at) = $2
          AND EXTRACT(YEAR FROM created_at) = $3
        GROUP BY DATE(created_at) 
        ORDER BY day ASC
      `;
      params.push(filter.month, filter.year);
    } else {
      // Không chọn → mặc định tháng hiện tại
      query = `
        SELECT 
          DATE(created_at) AS day,
          COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1
          AND created_at >= date_trunc('month', CURRENT_DATE)
          AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY DATE(created_at) 
        ORDER BY day ASC
      `;
    }
  }

  const { rows } = await pool.query(query, params);
  return rows;
}
```

---

#### **📌 CASE 1: LỌC THEO GIỜ (NGÀY HÔM NAY) - XỬ LÝ CODE CHI TIẾT**

**Khi nào dùng?** User click "View hourly report" → xem hoạt động trong ngày hôm nay

**LUỒNG & XỬ LÝ CODE:**
```
1️⃣ if (period === 'day') → xây query
2️⃣ Query: SELECT EXTRACT(HOUR FROM created_at) AS hour, COUNT(*)
   FROM tasks WHERE user_id=$1 AND DATE(created_at)=CURRENT_DATE
   GROUP BY EXTRACT(HOUR) ORDER BY hour ASC
3️⃣ PostgreSQL xử lý:
   - WHERE: lọc user=100, hôm nay
   - EXTRACT(HOUR): lấy giờ từ timestamp
   - GROUP BY: gom nhóm theo giờ
   - COUNT: đếm tasks mỗi giờ
4️⃣ Kết quả: [{hour:8, count:2}, {hour:10, count:3}, ...]
Đây là truy vấn SQL dùng để xử lý thống kê task theo thời gian trong ngày.
CSDL sẽ lọc các task của user trong hôm nay, gom theo từng giờ và đếm số lượng task ở mỗi giờ.
Sau khi xử lý xong, kết quả được trả về cho backend và hiển thị lên giao diện cho người dùng.
```

**BẢNG TASKS:**
```
┌─────────┬────────────────────┬──────────┐
│ task_id │ created_at         │ hour     │
├─────────┼────────────────────┼──────────┤
│ 1       │ 2025-01-07 08:15:00 │ 8       │
│ 2       │ 2025-01-07 08:45:00 │ 8       │
│ 3       │ 2025-01-07 10:30:00 │ 10      │
│ 4       │ 2025-01-07 10:45:00 │ 10      │
│ 5       │ 2025-01-07 10:50:00 │ 10      │
│ 6       │ 2025-01-07 14:20:00 │ 14      │
│ 7       │ 2025-01-06 09:00:00 │ 9       │ ← Ngày khác (bỏ)
└─────────┴────────────────────┴──────────┘
```

**📊 THỰC THI TỪNG BƯỚC:**

**Bước 1: WHERE DATE(created_at) = CURRENT_DATE (Lọc ngày hôm nay)**
```
CURRENT_DATE = '2025-01-07'
DATE(created_at) = '2025-01-07'

Chỉ lấy: Task 1, 2, 3, 4, 5, 6 (bỏ Task 7 vì ngày 1/6)
```

**Bước 2: EXTRACT(HOUR FROM created_at) (Lấy giờ)**
```
EXTRACT(HOUR FROM '2025-01-07 08:15:00') = 8
EXTRACT(HOUR FROM '2025-01-07 10:30:00') = 10
EXTRACT(HOUR FROM '2025-01-07 14:20:00') = 14

Sau extract:
┌──────────┐
│ hour     │
├──────────┤
│ 8        │
│ 8        │
│ 10       │
│ 10       │
│ 10       │
│ 14       │
└──────────┘
```

**Bước 3: GROUP BY EXTRACT(HOUR) (Gom nhóm)**
```
Nhóm hour=8:   Task 1, Task 2
Nhóm hour=10:  Task 3, Task 4, Task 5
Nhóm hour=14:  Task 6
```

**Bước 4: COUNT(*) (Đếm)**
```
hour=8:  COUNT = 2
hour=10: COUNT = 3
hour=14: COUNT = 1
```

**KẾT QUẢ:**
```javascript
[
  { hour: 8, count: 2 },    // 2 tasks tạo lúc 8h sáng
  { hour: 10, count: 3 },   // 3 tasks tạo lúc 10h sáng
  { hour: 14, count: 1 }    // 1 task tạo lúc 2h chiều
]

Frontend vẽ biểu đồ: 8h (2) → 10h (3) → 14h (1)
```

---

#### **📌 CASE 2: LỌC THEO NGÀY (7 NGÀY GẦN NHẤT) - XỬ LÝ CODE CHI TIẾT**

**Khi nào dùng?** User click "Weekly report" → xem hoạt động tuần này

**LUỒNG & XỬ LÝ CODE:**
```
1️⃣ else if (period === 'week') → xây query
2️⃣ Query: SELECT DATE(created_at) AS day, COUNT(*)
   FROM tasks WHERE user_id=$1 AND created_at >= CURRENT_DATE - INTERVAL '6 days'
   GROUP BY DATE(created_at) ORDER BY day ASC
3️⃣ PostgreSQL xử lý:
   - CURRENT_DATE - INTERVAL '6 days' = 6 ngày trước (tính 7 ngày gần nhất)
   - WHERE: user=100, created_at >= 6 ngày trước
   - DATE(created_at): lấy phần ngày
   - GROUP BY: gom nhóm theo ngày
   - COUNT: đếm tasks mỗi ngày
4️⃣ Kết quả: [{day:'2025-01-01', count:3}, {day:'2025-01-02', count:2}, ...]
   ⚠️ Lưu ý: Ngày nào không có task thì không xuất hiện
   **Lời**
Đây là truy vấn SQL dùng để thống kê task theo từng ngày trong tuần gần nhất.
CSDL sẽ lọc các task của user trong 7 ngày gần nhất, gom theo từng ngày và đếm số lượng task của mỗi ngày.
Sau khi xử lý xong, kết quả được trả về cho backend và hiển thị lên giao diện cho người dùng.
```

**BẢNG TASKS:**
```
┌─────────┬─────────────────────────┐
│ task_id │ created_at              │
├─────────┼─────────────────────────┤
│ 1       │ 2025-01-01 09:00:00     │
│ 2       │ 2025-01-01 10:00:00     │
│ 3       │ 2025-01-01 11:00:00     │
│ 4       │ 2025-01-02 08:00:00     │
│ 5       │ 2025-01-02 09:00:00     │
│ 6       │ 2025-01-05 10:00:00     │
│ 7       │ 2025-01-07 14:00:00     │
│ 8       │ 2024-12-31 15:00:00     │ ← Năm ngoái (bỏ)
└─────────┴─────────────────────────┘
```

**📊 THỰC THI:**

**Bước 1: WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'**
```
CURRENT_DATE - INTERVAL '6 days' = 2025-01-07 - 6 = 2025-01-01

WHERE created_at >= '2025-01-01 00:00:00'

Lấy: Task 1,2,3,4,5,6,7 (bỏ Task 8 vì 31/12/2024)
```

**Bước 2: DATE(created_at) (Lấy phần ngày)**
```
DATE('2025-01-01 09:00:00') = '2025-01-01'
DATE('2025-01-02 08:00:00') = '2025-01-02'
DATE('2025-01-05 10:00:00') = '2025-01-05'
DATE('2025-01-07 14:00:00') = '2025-01-07'
```

**Bước 3: GROUP BY DATE (Gom nhóm)**
```
Nhóm 2025-01-01: Task 1, 2, 3
Nhóm 2025-01-02: Task 4, 5
Nhóm 2025-01-05: Task 6
Nhóm 2025-01-07: Task 7

(Lưu ý: 3/1 và 4/1 không có task → không xuất hiện)
```

**Bước 4: COUNT + ORDER BY ASC**
```
2025-01-01: COUNT = 3
2025-01-02: COUNT = 2
2025-01-05: COUNT = 1
2025-01-07: COUNT = 1
```

**KẾT QUẢ:**
```javascript
[
  { day: '2025-01-01', count: 3 },
  { day: '2025-01-02', count: 2 },
  { day: '2025-01-05', count: 1 },
  { day: '2025-01-07', count: 1 }
]

⚠️ LƯU Ý: Ngày 3/1 và 4/1 không có task → không xuất hiện
Frontend có thể vẽ biểu đồ với "lỗ trống" hoặc điền 0
```

---

#### **📌 CASE 3: LỌC THEO THÁNG**

**Khi nào dùng?** User click "Monthly report" hoặc chọn tháng/năm cụ thể

**🔸 TRƯỜNG HỢP 3A: User chọn tháng/năm cụ thể**

**LUỒNG:**
```
1️⃣ if (filter.month && filter.year) → user chọn 1/2025
2️⃣ Query: SELECT DATE(created_at) AS day, COUNT(*)
   FROM tasks WHERE user_id=$1 
   AND EXTRACT(MONTH FROM created_at)=$2 AND EXTRACT(YEAR FROM created_at)=$3
3️⃣ params = [100, 1, 2025]
4️⃣ PostgreSQL:
   - EXTRACT(MONTH) = 1: lọc tháng 1
   - EXTRACT(YEAR) = 2025: lọc năm 2025
   - GROUP BY ngày, COUNT
5️⃣ Kết quả: [{day:'2025-01-01', count:1}, {day:'2025-01-15', count:1}]
```

**CODE:**
```javascript
// filter.month = 1, filter.year = 2025, $2 = 1, $3 = 2025

query = `
  SELECT 
    DATE(created_at) AS day,
    COUNT(*)::int AS count
  FROM tasks 
  WHERE user_id = $1
    AND EXTRACT(MONTH FROM created_at) = $2      // = 1
    AND EXTRACT(YEAR FROM created_at) = $3       // = 2025
  GROUP BY DATE(created_at) 
  ORDER BY day ASC
`;
params.push(1, 2025);
```

**BẢNG:**
```
┌─────────┬─────────────────────────┐
│ task_id │ created_at              │
├─────────┼─────────────────────────┤
│ 1       │ 2025-01-01 09:00:00 ✓   │ ← 1/2025
│ 2       │ 2025-01-15 10:00:00 ✓   │ ← 1/2025
│ 3       │ 2025-02-01 11:00:00 ✗   │ ← 2/2025 (khác tháng)
│ 4       │ 2024-01-05 08:00:00 ✗   │ ← 1/2024 (khác năm)
└─────────┴─────────────────────────┘
```

**KẾT QUẢ:**
```javascript
[
  { day: '2025-01-01', count: 1 },
  { day: '2025-01-15', count: 1 }
]
```

**🔸 TRƯỜNG HỢP 3B: Tháng hiện tại (mặc định)**

**LUỒNG:**
```
1️⃣ else → không có filter.month/year
2️⃣ Tính: date_trunc('month', CURRENT_DATE) = đầu tháng (1/1 00:00:00)
   + INTERVAL '1 month' = đầu tháng sau (2/1 00:00:00)
3️⃣ Query: SELECT DATE(created_at) AS day, COUNT(*)
   FROM tasks WHERE user_id=$1
   AND created_at >= đầu tháng AND created_at < đầu tháng sau
4️⃣ PostgreSQL:
   - WHERE: user=100, tasks từ 1/1 00:00:00 đến 2/1 00:00:00
   - GROUP BY ngày, COUNT
5️⃣ Kết quả: tasks trong tháng hiện tại (1/2025)
**Lời**
```

**CODE:**
```javascript
query = `
  SELECT 
    DATE(created_at) AS day,
    COUNT(*)::int AS count
  FROM tasks 
  WHERE user_id = $1
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY DATE(created_at) 
  ORDER BY day ASC
`;
```

**⭐ KIẾN THỨC #4: EXTRACT (Lấy Phần Từ Timestamp)**

```
EXTRACT = Tách một thành phần cụ thể từ timestamp

EXTRACT(YEAR FROM '2025-01-15 14:30:45')     → 2025
EXTRACT(MONTH FROM '2025-01-15 14:30:45')    → 1
EXTRACT(DAY FROM '2025-01-15 14:30:45')      → 15
EXTRACT(HOUR FROM '2025-01-15 14:30:45')     → 14
EXTRACT(MINUTE FROM '2025-01-15 14:30:45')   → 30
EXTRACT(SECOND FROM '2025-01-15 14:30:45')   → 45

Ứng dụng:
- Filter theo tháng: WHERE EXTRACT(MONTH FROM date) = 1
- Filter theo năm: WHERE EXTRACT(YEAR FROM date) = 2025
- GROUP BY giờ: GROUP BY EXTRACT(HOUR FROM date)
```

**⭐ KIẾN THỨC #5: DATE vs EXTRACT vs date_trunc**

```
Timestamp: '2025-01-15 14:30:45'

DATE(...)
- Tác dụng: Lấy phần NGÀY (bỏ giờ:phút:giây)
- Kết quả: '2025-01-15'
- Ứng dụng: GROUP BY DATE(created_at) → báo cáo theo ngày

EXTRACT(unit FROM ...)
- Tác dụng: Lấy một THÀNH PHẦN cụ thể
- VD: EXTRACT(MONTH FROM ...) → 1
- VD: EXTRACT(HOUR FROM ...) → 14
- Ứng dụng: Filter, GROUP BY theo tháng/giờ

date_trunc(unit, ...)
- Tác dụng: CẮT NGẮN về ĐẦU của khoảng thời gian
- date_trunc('month', '2025-01-15 14:30:45') = '2025-01-01 00:00:00'
- date_trunc('day', '2025-01-15 14:30:45') = '2025-01-15 00:00:00'
- Ứng dụng: Lấy khoảng TOÀN BỘ (từ đầu tháng, đầu ngày, etc)

BẢNG SO SÁNH:
┌─────────────────────┬──────────────────────────┬───────────────────────┐
│ Hàm                 │ Ví dụ                    │ Kết Quả               │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ DATE                │ DATE('2025-01-15 14:30') │ '2025-01-15'          │
│ EXTRACT(MONTH)      │ EXTRACT(MONTH FROM date) │ 1                     │
│ date_trunc('month') │ date_trunc('month', date)│ '2025-01-01 00:00:00' │
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

**⭐ KIẾN THỨC #6: INTERVAL (Khoảng Thời Gian)**

```
INTERVAL = Một khoảng thời gian để cộng/trừ vào date/timestamp

Cú pháp:
date ± INTERVAL 'value unit'

Ví dụ:
CURRENT_DATE - INTERVAL '6 days'         = 6 ngày trước
CURRENT_DATE + INTERVAL '1 day'          = ngày mai
CURRENT_DATE + INTERVAL '1 month'        = tháng sau
CURRENT_DATE + INTERVAL '1 year'         = năm sau
date_trunc('month', date) + INTERVAL '1 month' = đầu tháng tiếp theo

Ứng dụng:
- Lọc 7 ngày gần nhất: WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
- Lọc từ đầu tháng: WHERE created_at >= date_trunc('month', CURRENT_DATE)
```

---

### 🔹 Hàm 4: getWeeklyProductivity() - Tính Hiệu Suất %

---

### 🔹 Hàm 4: getWeeklyProductivity() - Tính Hiệu Suất % Tuần Này

📍 **VỊ TRỊ CODE:**
- **File:** `services/reportService.js`
- **Dòng:** ~230-280

**LUỒNG CHUNG & XỬ LÝ CODE CHI TIẾT:**

```
**Đánh giá hiệu suất làm việc**
1️⃣ const now = new Date() → lấy hôm nay
2️⃣ Tính Chủ Nhật: startOfWeek = now - now.getDay() (lùi 3 ngày)
3️⃣ endOfWeek = startOfWeek + 7 ngày
4️⃣ Query 1: COUNT tasks TẠO trong tuần (created_at)
5️⃣ Query 2: COUNT tasks HOÀN THÀNH trong tuần (updated_at, status='done')
6️⃣ ratio = (completed / created) * 100
7️⃣ score = Math.round(ratio) (làm tròn, max 100%)
8️⃣ Query 3: COUNT tasks hoàn thành tuần trước
9️⃣ trend = this_week - last_week (tăng/giảm)
🔟 streak = await getCompletionStreak() (chuỗi ngày hoàn thành)
1️⃣1️⃣ return {score, trend, created, completed, streak}
```

**CODE:**

```javascript
static async getWeeklyProductivity(userId) {
  // ════════════════════════════════════════════════════════════
  // BƯỚC 1: Tính ngày đầu tuần (Chủ Nhật)
  // ════════════════════════════════════════════════════════════
  
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  // now.getDay() = 0-6 (0=Chủ Nhật, 1=Thứ 2, ..., 6=Thứ 7)
  // Ví dụ: Hôm nay là Thứ 4 (getDay()=3)
  //        now.getDate() - getDay() = ngày hiện tại - 3 = lùi 3 ngày = Chủ Nhật

  startOfWeek.setHours(0, 0, 0, 0);
  // Đặt giờ = 00:00:00 (đầu ngày Chủ Nhật)

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  // Cuối tuần = Chủ Nhật + 7 ngày = Chủ Nhật tuần tiếp theo

  // ════════════════════════════════════════════════════════════
  // BƯỚC 2 & 3: Query database (2 query song song)
  // ════════════════════════════════════════════════════════════

  // 🔹 Query 1: Đếm tasks được TẠO trong tuần này
  const { rows: created } = await pool.query(
    `SELECT COUNT(*) AS count 
     FROM tasks 
     WHERE user_id = $1 
       AND created_at >= $2 
       AND created_at < $3`,
    [userId, startOfWeek, endOfWeek]
  );

  // 🔹 Query 2: Đếm tasks đã HOÀN THÀNH trong tuần này
  const { rows: completed } = await pool.query(
    `SELECT COUNT(*) AS count 
     FROM tasks 
     WHERE user_id = $1 
       AND status = 'done'
       AND updated_at >= $2 
       AND updated_at < $3`,
    [userId, startOfWeek, endOfWeek]
  );

  // ════════════════════════════════════════════════════════════
  // BƯỚC 4: Tính tỉ lệ hoàn thành (%)
  // ════════════════════════════════════════════════════════════

  const createdCount = parseInt(created[0].count) || 0;
  const completedCount = parseInt(completed[0].count) || 0;

  const ratio = createdCount > 0 ? (completedCount / createdCount) * 100 : 100;
  // Ví dụ:
  //   Tạo 10, hoàn thành 7  → (7/10)*100 = 70%
  //   Tạo 0, hoàn thành 0   → 100% (mặc định)

  const score = Math.min(100, Math.round(ratio));
  // Math.round(70.5) = 71
  // Math.min(105, 100) = 100 (không vượt quá 100%)

  // ════════════════════════════════════════════════════════════
  // BƯỚC 5: Query tuần trước để tính TREND
  // ════════════════════════════════════════════════════════════

  const startLastWeek = new Date(startOfWeek);
  startLastWeek.setDate(startLastWeek.getDate() - 7);
  // Tuần trước = tuần này - 7 ngày

  const { rows: lastWeek } = await pool.query(
    `SELECT COUNT(*) AS count 
     FROM tasks 
     WHERE user_id = $1 
       AND status = 'done'
       AND updated_at >= $2 
       AND updated_at < $3`,
    [userId, startLastWeek, startOfWeek]
  );

  // ════════════════════════════════════════════════════════════
  // BƯỚC 6: Tính TREND (tăng/giảm)
  // ════════════════════════════════════════════════════════════

  const lastWeekCount = parseInt(lastWeek[0].count) || 0;
  const trend = completedCount - lastWeekCount;
  // Ví dụ:
  //   Tuần này: 7 tasks hoàn thành
  //   Tuần trước: 5 tasks hoàn thành
  //   Trend: 7 - 5 = +2 (tăng 2)

  // ════════════════════════════════════════════════════════════
  // BƯỚC 7: Lấy chuỗi hoàn thành
  // ════════════════════════════════════════════════════════════

  const streak = await this.getCompletionStreak(userId);

  // ════════════════════════════════════════════════════════════
  // BƯỚC 8: Trả về kết quả
  // ════════════════════════════════════════════════════════════

  return { score, trend, created: createdCount, completed: completedCount, streak };
}
```

**📊 BẢNG TASKS MẪU:**

```
Hôm nay: Thứ 4, ngày 8/1/2025
Tuần này: Chủ Nhật 5/1 - Thứ 7 11/1

┌─────────┬─────────────────────────┬─────────────────┐
│ task_id │ created_at              │ updated_at      │ status│
├─────────┼─────────────────────────┼─────────────────┤
│ 1       │ 2025-01-05 09:00:00 ✓   │ 2025-01-05 ...  │ done  │
│ 2       │ 2025-01-05 10:00:00 ✓   │ 2025-01-08 ...  │ done  │
│ 3       │ 2025-01-06 09:00:00 ✓   │ (chưa cập nhật) │ todo  │
│ 4       │ 2025-01-06 10:00:00 ✓   │ 2025-01-07 ...  │ done  │
│ 5       │ 2025-01-07 09:00:00 ✓   │ 2025-01-08 ...  │ done  │
│ 6       │ 2025-01-08 09:00:00 ✓   │ 2025-01-08 ...  │ done  │
│ 7       │ 2024-12-31 10:00:00 ✗   │ ...             │ todo  │ (tuần trước)
└─────────┴─────────────────────────┴─────────────────┘
```

**📌 BƯỚC 1: Tính tuần**

```
Hôm nay = 2025-01-08 (Thứ 4)
now.getDay() = 3 (Thứ 4 là ngày thứ 3 nếu tính từ 0)
now.getDate() - getDay() = 8 - 3 = 5

startOfWeek = 2025-01-05 (Chủ Nhật)
endOfWeek = 2025-01-05 + 7 = 2025-01-12
```

**📌 BƯỚC 2: Đếm tasks TẠO**

```
WHERE user_id = 100 
  AND created_at >= '2025-01-05 00:00:00'
  AND created_at < '2025-01-12 00:00:00'

Tasks tạo trong tuần: 1, 2, 3, 4, 5, 6 (bỏ task 7 vì 31/12/2024)
Count = 6 ✓
```

**📌 BƯỚC 3: Đếm tasks HOÀN THÀNH**

```
WHERE user_id = 100
  AND status = 'done'
  AND updated_at >= '2025-01-05 00:00:00'
  AND updated_at < '2025-01-12 00:00:00'

Tasks hoàn thành: 1, 2, 4, 5, 6 (task 3 là todo, task 7 ngoài tuần)
Count = 5 ✓

⚠️ LƯU Ý: Dùng updated_at chứ không phải created_at
Vì: Task 2 tạo 5/1 nhưng hoàn thành 8/1 → phải dùng updated_at
```

**📌 BƯỚC 4: Tính tỉ lệ**

```
createdCount = 6
completedCount = 5

Tỉ lệ = (5 / 6) * 100 = 83.33%
Score = Math.round(83.33) = 83
```

**📌 BƯỚC 5: Query tuần trước**

```
startLastWeek = 2025-01-05 - 7 = 2024-12-29 (Chủ Nhật trước)

WHERE user_id = 100
  AND status = 'done'
  AND updated_at >= '2024-12-29 00:00:00'
  AND updated_at < '2025-01-05 00:00:00'

(Giả sử tuần trước hoàn thành 3 tasks)
lastWeekCount = 3
```

**📌 BƯỚC 6: Tính trend**

```
Trend = completedCount - lastWeekCount
      = 5 - 3
      = +2 (tăng 2 tasks so với tuần trước) ✓
```

**KẾT QUẢ CUỐI CÙNG:**
```javascript
{
  score: 83,              // 83% hoàn thành
  trend: 2,               // +2 tasks so với tuần trước
  created: 6,             // Tạo 6 tasks
  completed: 5,           // Hoàn thành 5 tasks
  streak: 3               // Chuỗi 3 ngày liên tiếp hoàn thành
}
```

---

### 🔹 Hàm 5: getCompletionStreak() - Tính Chuỗi Ngày Hoàn Thành

📍 **VỊ TRỊ CODE:**
- **File:** `services/reportService.js`
- **Dòng:** ~290-330

**LUỒNG & XỬ LÝ CODE CHI TIẾT:**

```
1️⃣ Query: SELECT DISTINCT DATE(updated_at) FROM tasks
   WHERE user_id=$1 AND status='done' ORDER BY date DESC LIMIT 30
   → DISTINCT: loại bỏ dates trùng
   → Kết quả: [2025-01-08, 2025-01-07, 2025-01-06, 2025-01-05, 2025-01-04, 2025-01-02, 2025-01-01]
   → LƯU Ý: 1/3 không có (là LỖ)

2️⃣ if (rows.length === 0) return 0 → nếu không hoàn thành gì

3️⃣ const today = new Date() + setHours(0,0,0,0) → 2025-01-08 00:00:00

4️⃣ Loop: for(let i=0; i<rows.length; i++)
   i=0: expected = 2025-01-08, taskDate = 2025-01-08 ✓ streak++ (streak=1)
   i=1: expected = 2025-01-07, taskDate = 2025-01-07 ✓ streak++ (streak=2)
   i=2: expected = 2025-01-06, taskDate = 2025-01-06 ✓ streak++ (streak=3)
   i=3: expected = 2025-01-05, taskDate = 2025-01-05 ✓ streak++ (streak=4)
   i=4: expected = 2025-01-04, taskDate = 2025-01-04 ✓ streak++ (streak=5)
   i=5: expected = 2025-01-03, taskDate = 2025-01-02 ✗ LỖ → break

5️⃣ return streak = 5 (5 ngày liên tiếp)
```

**CODE:**

```javascript
static async getCompletionStreak(userId) {
  // Query: Lấy ngày hoàn thành (loại bỏ trùng)
  const { rows } = await pool.query(
    `SELECT DISTINCT DATE(updated_at) AS date
     FROM tasks 
     WHERE user_id = $1 AND status = 'done'
     ORDER BY date DESC
     LIMIT 30`,
    [userId]
  );

  if (rows.length === 0) return 0; // Không hoàn thành gì → streak = 0

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // today = 2025-01-08 00:00:00

  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    // i=0: expected = hôm nay
    // i=1: expected = hôm qua
    // i=2: expected = 2 ngày trước

    const taskDate = new Date(rows[i].date);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === expected.getTime()) {
      // Ngày trùng khớp → chuỗi tiếp tục
      streak++;
    } else if (taskDate < expected) {
      // Ngày nhỏ hơn expected → có lỗ → ngắt chuỗi
      break;
    }
  }

  return streak;
}
```

**📊 BẢNG HOÀN THÀNH:**

```
Query trả về (SELECT DISTINCT DATE(updated_at)):
┌──────────────┐
│ date         │
├──────────────┤
│ 2025-01-08   │ ← Hôm nay (i=0)
│ 2025-01-07   │ ← Hôm qua (i=1)
│ 2025-01-06   │ ← 2 ngày trước (i=2)
│ 2025-01-05   │ ← 3 ngày trước (i=3)
│ 2025-01-04   │ ← 4 ngày trước (i=4)
│ 2025-01-02   │ ← Cách 6 ngày (i=5) - LỖ!
│ 2025-01-01   │
└──────────────┘
```

**📌 THỰC THI LOOP:**

```
today = 2025-01-08

i=0:
  expected = 2025-01-08 (hôm nay)
  taskDate = 2025-01-08 (từ database)
  taskDate === expected ✓ → streak++ (streak=1)

i=1:
  expected = 2025-01-07 (hôm qua)
  taskDate = 2025-01-07 (từ database)
  taskDate === expected ✓ → streak++ (streak=2)

i=2:
  expected = 2025-01-06 (2 ngày trước)
  taskDate = 2025-01-06 (từ database)
  taskDate === expected ✓ → streak++ (streak=3)

i=3:
  expected = 2025-01-05 (3 ngày trước)
  taskDate = 2025-01-05 (từ database)
  taskDate === expected ✓ → streak++ (streak=4)

i=4:
  expected = 2025-01-04 (4 ngày trước)
  taskDate = 2025-01-04 (từ database)
  taskDate === expected ✓ → streak++ (streak=5)

i=5:
  expected = 2025-01-03 (5 ngày trước)
  taskDate = 2025-01-02 (từ database) ← LỖ!
  taskDate < expected ✓ → BREAK (ngắt chuỗi)

Kết quả: streak = 5 ngày liên tiếp
```

**⭐ KIẾN THỨC #7: DISTINCT (Loại Bỏ Bản Ghi Trùng)**

```
DISTINCT = Chỉ giữ 1 bản ghi duy nhất (loại bỏ duplicate)

Dữ liệu gốc (5 tasks hoàn thành cùng ngày):
┌──────────────────────┐
│ updated_at           │
├──────────────────────┤
│ 2025-01-08 10:30:00  │
│ 2025-01-08 12:45:00  │ ← Trùng (cùng ngày)
│ 2025-01-08 15:20:00  │ ← Trùng (cùng ngày)
│ 2025-01-07 09:00:00  │
│ 2025-01-07 16:30:00  │ ← Trùng (cùng ngày)
└──────────────────────┘

SELECT DATE(updated_at):
2025-01-08
2025-01-08  ← Trùng
2025-01-08  ← Trùng
2025-01-07
2025-01-07  ← Trùng
(5 dòng - không hữu ích)

SELECT DISTINCT DATE(updated_at):
2025-01-08
2025-01-07
(2 dòng - chỉ ngày duy nhất)

VÌ SAO?
- Tính streak: chỉ cần biết NGÀY có hoàn thành, không cần bao nhiêu tasks
- Nếu không dùng DISTINCT → loop sẽ đếm 3 lần ngày 8/1, sai streak
- Dùng DISTINCT → 1 ngày = 1 dòng = streak chính xác
```

---

### 🔹 Hàm 6: generateReportHTML() - Tạo HTML & Promise.all

📍 **VỊ TRỊ CODE:**
- **File:** `services/reportService.js`
- **Dòng:** ~340-380

**LUỒNG:**

```
1️⃣ Khởi tạo HTML header
2️⃣ Promise.all: Chạy 2 queries SONG SONG (taskStats + eventTypes)
   - Sequential: 200ms (Query1 + Query2)
   - Promise.all: 100ms (Query1 || Query2)
3️⃣ Destructuring: [taskStats, eventTypes] = results
4️⃣ Loop 1: Xây dựng HTML table từ taskStats (status, count)
5️⃣ Loop 2: Xây dựng HTML table từ eventTypes (event_type, count)
6️⃣ Return HTML string hoàn chỉnh
```

**CODE:**

```javascript
static async generateReportHTML(userId) {
  let html = `
    <h1>Báo Cáo Công Việc</h1>
    <p>Ngày tạo: ${new Date().toLocaleString('vi-VN')}</p>
  `;

  // ════════════════════════════════════════════════════════════
  // Promise.all: Chạy 2 queries SONG SONG
  // ════════════════════════════════════════════════════════════

  const [taskStats, eventTypes] = await Promise.all([
    this.getTaskStatusReport(userId),      // Query 1: ~100ms
    this.getEventTypeReport(userId)        // Query 2: ~100ms
  ]);
  // Tổng: ~100ms (song parallel)
  // Vs: 200ms (sequential/tuần tự)

  html += '<h2>Trạng Thái Công Việc</h2><table>';
  taskStats.forEach(row => {
    html += `<tr><td>${row.status}</td><td>${row.count}</td></tr>`;
  });
  html += '</table>';

  html += '<h2>Loại Sự Kiện</h2><table>';
  eventTypes.forEach(row => {
    html += `<tr><td>${row.event_type}</td><td>${row.count}</td></tr>`;
  });
  html += '</table>';

  return html;
}
```

**⭐ KIẾN THỨC #8: Promise.all**

```
Promise.all = Chạy NHIỀU async operations SONG SONG

❌ TUẦN TỰ: Query 1 (100ms) → Query 2 (100ms) = 200ms tổng
✅ SONG SONG: Query 1 & Query 2 cùng lúc = 100ms tổng (giảm 50%)

KHI NÀO DÙNG?
✅ Queries độc lập (không phụ thuộc nhau)
❌ Queries phụ thuộc (Query 2 cần kết quả Query 1)
```

---

## 📊 Tóm Tắt Toàn Bộ Luồng REPORTS

### 🔄 Luồng: User Click → Backend → Database → Response

```
Frontend: User click → GET /api/reports/task-status
                        ↓
Controller: Nhận request, lấy userId, gọi service
                        ↓
Service: Xây SQL query, gọi pool.query()
                        ↓
Database: Thực thi SQL, GROUP BY/COUNT/EXTRACT/etc
                        ↓
Service: Parse kết quả, trả về data
                        ↓
Controller: res.json(data)
                        ↓
Frontend: Hiển thị biểu đồ/table
```

---

## 📊 Tóm Tắt Các Hàm Reports

| # | Hàm | Tác Dụng | SQL Chính | Trả Về |
|---|-----|---------|----------|--------|
| 1 | `getTaskStatusReport()` | Đếm tasks theo status | GROUP BY status | `[{status, count}]` |
| 2 | `getEventTypeReport()` | Đếm events theo category | LEFT JOIN + COALESCE | `[{event_type, count}]` |
| 3 | `getTasksByPeriod()` | Báo cáo ngày/tháng/năm | EXTRACT + DATE + INTERVAL | `[{day/hour, count}]` |
| 4 | `getWeeklyProductivity()` | Tính hiệu suất tuần (%) | COUNT (2 queries) | `{score, trend, completed, streak}` |
| 5 | `getCompletionStreak()` | Chuỗi ngày hoàn thành | DISTINCT DATE | `streak (số)` |
| 6 | `generateReportHTML()` | Tạo HTML report | Promise.all | `htmlString` |

---

## 🎯 Kiến Thức SQL & JavaScript - Dùng Ở Đâu?

| # | Kiến Thức | Ví Dụ | Dùng Ở Hàm Nào | Tác Dụng |
|---|-----------|-------|----------------|---------|
| 1 | **GROUP BY** | `GROUP BY status` | Hàm 1, 2, 3 | Gom nhóm + đếm tổng |
| 2 | **COUNT()** | `COUNT(*)` | Hàm 1, 2, 3, 4 | Đếm số bản ghi |
| 3 | **COALESCE()** | `COALESCE(cat, 'N/A')` | Hàm 2 | Thay NULL bằng giá trị mặc định |
| 4 | **LEFT JOIN** | `LEFT JOIN categories` | Hàm 2 | Lấy tất cả + liên kết |
| 5 | **EXTRACT()** | `EXTRACT(MONTH FROM date)` | Hàm 1, 3 | Lấy tháng/giờ/năm từ date |
| 6 | **DATE()** | `DATE(timestamp)` | Hàm 3, 5 | Lấy phần ngày |
| 7 | **date_trunc()** | `date_trunc('month', date)` | Hàm 3 | Cắt ngắn về đầu tháng |
| 8 | **INTERVAL** | `CURRENT_DATE - INTERVAL '6 days'` | Hàm 3, 4 | Cộng/trừ thời gian |
| 9 | **DISTINCT** | `DISTINCT DATE(date)` | Hàm 5 | Loại bỏ trùng lặp |
| 10 | **Promise.all** | `await Promise.all([...])` | Hàm 6 | Chạy async song song |

---

## 🧠 Tóm Tắt Quy Trình Học Tập

**Để hiểu sâu REPORTS, cần hiểu:**

1. ✅ **Luồng Thực Thi** (Flow): User click → Server → Database → Response
2. ✅ **Từng Hàm** (Functions): Bước 1 xảy ra gì, Step 2 xảy ra gì...
3. ✅ **SQL Concepts**: GROUP BY, JOIN, EXTRACT, INTERVAL, etc.
4. ✅ **JavaScript**: Promise, async/await, calculations
5. ✅ **Database**: Dữ liệu chảy qua bảng, transform, return

---

**Tài liệu này giải thích REPORTS theo LUỒNG THỰC THI! 🚀**
**Nếu muốn hiểu thêm chi tiết, hãy hỏi về từng hàm cụ thể! 💡**
