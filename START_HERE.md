# 📚 HƯỚNG DẪN SỬ DỤNG DỰ ÁN - ĐỌC FILE NÀO TRƯỚC?

## 🎯 BẮT ĐẦU TỪ ĐÂU?

### 🚀 Nếu bạn muốn **chạy ngay** (5 phút)

→ Đọc file: **`QUICK_START.md`**

### 📖 Nếu bạn muốn **hiểu Google OAuth** (10 phút)

→ Đọc file: **`GOOGLE_OAUTH_SIMPLE.md`** (giải thích đơn giản)
→ Hoặc: **`GOOGLE_OAUTH_GUIDE.md`** (chi tiết từng bước)

### 📧 Nếu bạn muốn **cấu hình Email** (5 phút)

→ Đọc file: **`EMAIL_SETUP_GUIDE.md`**

### 📊 Nếu bạn muốn **xem tổng quan dự án** (15 phút)

→ Đọc file: **`COMPLETE_SUMMARY.md`**

---

## 📂 DANH SÁCH TẤT CẢ CÁC FILE

| File                       | Mục đích                                           | Thời gian đọc | Độ khó          |
| -------------------------- | -------------------------------------------------- | ------------- | --------------- |
| **QUICK_START.md**         | Khởi động nhanh, commands cơ bản                   | 5 phút        | ⭐ Dễ           |
| **GOOGLE_OAUTH_SIMPLE.md** | Giải thích Google OAuth bằng ví dụ đời thường      | 10 phút       | ⭐ Dễ           |
| **GOOGLE_OAUTH_GUIDE.md**  | Hướng dẫn chi tiết từng bước cấu hình Google OAuth | 20 phút       | ⭐⭐ Trung bình |
| **EMAIL_SETUP_GUIDE.md**   | Hướng dẫn cấu hình Gmail SMTP để gửi OTP           | 10 phút       | ⭐ Dễ           |
| **COMPLETE_SUMMARY.md**    | Tổng quan toàn bộ dự án, tính năng, kiến trúc      | 15 phút       | ⭐⭐ Trung bình |
| **WHAT_TO_DO_NEXT.md**     | Checklist công việc cần làm                        | 5 phút        | ⭐ Dễ           |
| **README.md**              | Tài liệu gốc của dự án                             | 20 phút       | ⭐⭐⭐ Chi tiết |

---

## 🎓 LỘ TRÌNH HỌC CHO SINH VIÊN

### Ngày 1: Setup cơ bản (1 giờ)

1. ✅ Đọc `QUICK_START.md`
2. ✅ Chạy `npm install`
3. ✅ Chạy `npm run setup`
4. ✅ Chạy `npm run dev`
5. ✅ Test đăng nhập với tài khoản mẫu

### Ngày 2: Hiểu Google OAuth (2 giờ)

1. ✅ Đọc `GOOGLE_OAUTH_SIMPLE.md` (hiểu khái niệm)
2. ✅ Đọc `GOOGLE_OAUTH_GUIDE.md` (làm theo từng bước)
3. ✅ Tạo Google Cloud Project
4. ✅ Lấy Client ID và Secret
5. ✅ Test Google Sign-In

### Ngày 3: Cấu hình Email (1 giờ)

1. ✅ Đọc `EMAIL_SETUP_GUIDE.md`
2. ✅ Tạo Gmail App Password
3. ✅ Cập nhật `.env`
4. ✅ Test gửi email OTP

### Ngày 4: Hiểu toàn bộ dự án (2 giờ)

1. ✅ Đọc `COMPLETE_SUMMARY.md`
2. ✅ Xem cấu trúc thư mục
3. ✅ Đọc code trong `services/`
4. ✅ Đọc code trong `controllers/`
5. ✅ Hiểu flow xử lý request

### Ngày 5: Test tất cả tính năng (1 giờ)

1. ✅ Test đăng ký với OTP
2. ✅ Test đăng nhập Google
3. ✅ Test CRUD tasks
4. ✅ Test calendar events
5. ✅ Test Kanban board

---

## 🎯 LỘ TRÌNH CHO GIẢNG VIÊN/REVIEWER

### Kiểm tra nhanh (15 phút)

1. ✅ Đọc `COMPLETE_SUMMARY.md` - Xem tổng quan
2. ✅ Chạy `npm run setup` - Setup database
3. ✅ Chạy `npm run dev` - Khởi động server
4. ✅ Test login với `admin/admin123`
5. ✅ Xem code trong `services/` và `controllers/`

### Đánh giá chi tiết (30 phút)

1. ✅ Kiểm tra kiến trúc MVC + Services
2. ✅ Kiểm tra database schema (migration files)
3. ✅ Kiểm tra security (password hashing, OTP, captcha)
4. ✅ Kiểm tra documentation quality
5. ✅ Test tất cả tính năng

---

## 📖 THEO THỨ TỰ ĐỌC KHUYÊN DÙNG

### Cho người mới bắt đầu:

```
1. QUICK_START.md              ← Chạy được server
2. GOOGLE_OAUTH_SIMPLE.md      ← Hiểu OAuth
3. EMAIL_SETUP_GUIDE.md        ← Cấu hình email
4. COMPLETE_SUMMARY.md         ← Hiểu tổng quan
```

### Cho người đã có kinh nghiệm:

```
1. COMPLETE_SUMMARY.md         ← Xem tổng quan
2. GOOGLE_OAUTH_GUIDE.md       ← Setup OAuth
3. CODE trong services/        ← Đọc code
4. Test features               ← Thử nghiệm
```

### Cho người chỉ muốn setup nhanh:

```
1. QUICK_START.md              ← Commands cần thiết
2. .env                        ← Cấu hình
3. npm run dev                 ← Chạy luôn
```

---

## 🔍 TÌM THÔNG TIN NHANH

### "Làm sao để chạy server?"

→ `QUICK_START.md` - Phần "Bắt đầu ngay"

### "Google OAuth là gì?"

→ `GOOGLE_OAUTH_SIMPLE.md` - Phần "Google OAuth là gì?"

### "Làm sao lấy Client ID?"

→ `GOOGLE_OAUTH_GUIDE.md` - Phần "Bước 3: Tạo OAuth 2.0 Credentials"

### "Làm sao gửi email?"

→ `EMAIL_SETUP_GUIDE.md` - Phần "Bước 1: Tạo App Password"

### "Dự án này có gì?"

→ `COMPLETE_SUMMARY.md` - Phần "Tính năng hoàn thành"

### "Lỗi này fix thế nào?"

→ Mỗi file đều có phần "Troubleshooting"

---

## 🎨 BIỂU TƯỢNG TRONG TÀI LIỆU

- ✅ = Đã hoàn thành
- ⚠️ = Cần chú ý
- ❌ = Không nên làm
- 📘 = File tài liệu
- 🔧 = Cấu hình
- 🐛 = Lỗi / Troubleshooting
- 💡 = Tips / Lời khuyên
- ⭐ = Quan trọng

---

## 📞 CẦN TRỢ GIÚP?

### Bước 1: Tìm trong tài liệu

- Đọc phần "Troubleshooting" trong file tương ứng
- Đọc phần "Câu hỏi thường gặp"

### Bước 2: Kiểm tra Console Log

- Mở DevTools (F12)
- Xem Console tab
- Đọc error message

### Bước 3: Google error message

- Copy error message
- Google: "node.js [error message]"
- Hoặc: "[error message] stackoverflow"

### Bước 4: Hỏi người khác

- Stack Overflow (tiếng Anh)
- Diễn đàn lập trình Việt Nam
- Nhóm Facebook về Node.js
- Giảng viên / Bạn bè

---

## 🎉 CHECKLIST HOÀN THÀNH

### Setup cơ bản

- [ ] Đã đọc `QUICK_START.md`
- [ ] Chạy được `npm install`
- [ ] Chạy được `npm run setup`
- [ ] Chạy được `npm run dev`
- [ ] Test login thành công

### Cấu hình nâng cao

- [ ] Đã đọc `EMAIL_SETUP_GUIDE.md`
- [ ] Đã cấu hình Gmail SMTP
- [ ] Test gửi email thành công
- [ ] Đã đọc `GOOGLE_OAUTH_GUIDE.md`
- [ ] Đã tạo Google Client ID
- [ ] Test Google Sign-In thành công

### Hiểu dự án

- [ ] Đã đọc `COMPLETE_SUMMARY.md`
- [ ] Hiểu kiến trúc MVC + Services
- [ ] Đọc code trong `services/`
- [ ] Đọc code trong `controllers/`
- [ ] Hiểu flow xử lý request

### Test tính năng

- [ ] Test đăng ký với OTP
- [ ] Test đăng nhập thông thường
- [ ] Test Google OAuth
- [ ] Test CRUD tasks
- [ ] Test calendar events

---

## 🚀 BẮT ĐẦU NGAY!

**Nếu bạn đã sẵn sàng:**

```bash
# Bước 1: Cài dependencies
npm install

# Bước 2: Setup database
npm run setup

# Bước 3: Chạy server
npm run dev

# Bước 4: Mở browser
http://localhost:8888
```

**Tài khoản test:**

- Username: `admin` / Password: `admin123`
- Username: `user1` / Password: `user123`

**Chúc bạn thành công! 🎉**

---

**File này tạo bởi:** GitHub Copilot  
**Ngày:** 24/11/2025  
**Mục đích:** Giúp người dùng định hướng đọc tài liệu
