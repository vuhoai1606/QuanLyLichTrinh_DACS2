// assets/js/export-import.js
// ===================================================================
// export-import.js - FRONTEND (CHỈ XỬ LÝ UI + GỌI API)
// Tất cả logic xử lý file, báo cáo, chia sẻ → nằm ở backend
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Load header (giữ lại vì trang này vẫn dùng header)
  fetch('header.ejs')
    .then(res => res.text())
    .then(html => {
      document.getElementById('header-placeholder')?.insertAdjacentHTML('beforeend', html);
    })
    .catch(err => console.error('Header load error:', err));

  setupEventListeners();
  console.log('Export-Import page loaded - Ready to connect with API');
});

// ===================================================================
// SETUP TẤT CẢ EVENT LISTENERS
// ===================================================================
function setupEventListeners() {
  // Export
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  document.getElementById('btn-export-ical').addEventListener('click', exportICal);
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);

  // Import
  document.getElementById('btn-import').addEventListener('click', importCSV);

  // Báo cáo & chia sẻ
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-email').addEventListener('click', sendReportByEmail);
  document.getElementById('btn-backup').addEventListener('click', backupAllData);

  // Report & Analytics
  document.getElementById('btn-report').addEventListener('click', generateMonthlyReport);
  document.getElementById('btn-analytics').addEventListener('click', getTaskAnalytics);

  // Modal chia sẻ
  document.getElementById('share-plan').addEventListener('click', () => {
    document.getElementById('share-modal').classList.remove('hidden');
  });
  document.getElementById('close-share').addEventListener('click', closeShareModal);
  document.getElementById('btn-share-submit').addEventListener('click', sharePlan);
}

// ===================================================================
// CÁC HÀM GỌI API
// ===================================================================

// 1. Export CSV
async function exportCSV() {
  try {
    const res = await fetch('/api/export/csv');
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    downloadBlob(blob, `tasks_${new Date().toISOString().slice(0,10)}.csv`);
    showSuccess('Export CSV thành công!');
  } catch (err) {
    showError('Export CSV thất bại: ' + err.message);
  }
}

// 2. Export iCal
async function exportICal() {
  try {
    const res = await fetch('/api/export/ical');
    if (!res.ok) throw new Error('Export iCal failed');
    const blob = await res.blob();
    downloadBlob(blob, 'events.ics');
    showSuccess('Export iCal thành công!');
  } catch (err) {
    showError('Export iCal thất bại');
  }
}

// 3. Export PDF
async function exportPDF() {
  try {
    const res = await fetch('/api/export/pdf');
    if (!res.ok) throw new Error('Export PDF failed');
    const blob = await res.blob();
    downloadBlob(blob, `report_${new Date().toISOString().slice(0,10)}.pdf`);
    showSuccess('Export PDF thành công!');
  } catch (err) {
    showError('Export PDF thất bại');
  }
}

// 4. Import CSV
async function importCSV() {
  const fileInput = document.getElementById('file-import');
  if (!fileInput.files?.[0]) return showError('Vui lòng chọn file CSV!');

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/import/csv', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      showSuccess(`Import thành công! Đã thêm ${data.imported || 0} task`);
      fileInput.value = '';
    } else {
      showError(data.message || 'Import thất bại');
    }
  } catch (err) {
    showError('Lỗi khi import: ' + err.message);
  }
}

// 5. Gửi báo cáo qua email
async function sendReportByEmail() {
  const email = document.getElementById('email-recipient')?.value.trim();
  if (!email) return showError('Vui lòng nhập email người nhận!');

  try {
    const res = await fetch('/api/report/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      showSuccess('Đã gửi báo cáo thành công!');
    } else {
      showError(data.message || 'Gửi email thất bại');
    }
  } catch (err) {
    showError('Lỗi gửi email');
  }
}

// 6. Sao lưu toàn bộ dữ liệu
async function backupAllData() {
  try {
    const res = await fetch('/api/backup/full');
    if (!res.ok) throw new Error('Backup failed');
    const blob = await res.blob();
    downloadBlob(blob, `backup_full_${new Date().toISOString().slice(0,10)}.zip`);
    showSuccess('Sao lưu toàn bộ thành công!');
  } catch (err) {
    showError('Sao lưu thất bại');
  }
}

// 7. Báo cáo tháng
async function generateMonthlyReport() {
  try {
    const res = await fetch('/api/report/monthly');
    const data = await res.json();
    if (data.success) {
      displayReport(data.report);
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('Lấy báo cáo tháng thất bại');
  }
}

// 8. Analytics task
async function getTaskAnalytics() {
  try {
    const res = await fetch('/api/analytics/tasks');
    const data = await res.json();
    if (data.success) {
      displayReport(data.analytics);
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError('Lấy analytics thất bại');
  }
}

// 9. Chia sẻ kế hoạch
async function sharePlan() {
  const input = document.querySelector('#share-modal input');
  const target = input.value.trim();
  if (!target) return showError('Vui lòng nhập email hoặc link!');

  try {
    const res = await fetch('/api/share/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target })
    });
    const data = await res.json();

    if (data.success) {
      showSuccess('Chia sẻ thành công!');
      closeShareModal();
      input.value = '';
    } else {
      showError(data.message || 'Chia sẻ thất bại');
    }
  } catch (err) {
    showError('Lỗi chia sẻ');
  }
}

// ===================================================================
// HÀM HỖ TRỢ UI
// ===================================================================

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function displayReport(content) {
  const output = document.getElementById('report-output');
  if (typeof content === 'object') {
    output.innerHTML = '<pre>' + JSON.stringify(content, null, 2) + '</pre>';
  } else {
    output.innerHTML = content;
  }
}

function closeShareModal() {
  document.getElementById('share-modal').classList.add('hidden');
}

function showSuccess(msg) {
  alert('Success: ' + msg); // Có thể thay bằng toast đẹp hơn sau
}

function showError(msg) {
  alert('Error: ' + msg);
}

// // ===================================================================
// // NOTES CHO BACKEND DEVELOPER (rất quan trọng!)
// // ===================================================================
// // Dựa trên cấu trúc hiện tại của bạn, các route sau PHẢI được implement:

// // 1. Export dữ liệu
// GET    /api/export/csv          → Trả về file CSV tất cả tasks + events của user
// GET    /api/export/ical         → Trả về file .ics (iCalendar) tất cả events
// GET    /api/export/pdf          → Trả về file PDF báo cáo tổng hợp (dùng puppeteer hoặc pdfkit)

// // 2. Import dữ liệu
// POST   /api/import/csv          → Nhận FormData (file), parse CSV → tạo tasks/events
//        (nên validate header: title, description, due_date, priority, status, start_time, end_time, ...)

// // 3. Báo cáo & Email
// POST   /api/report/email        → Nhận { email }, generate PDF báo cáo → gửi mail (nodemailer + handlebars)
// GET    /api/report/monthly      → Trả về JSON báo cáo tháng hiện tại (stats tasks/events)
// GET    /api/analytics/tasks     → Trả về JSON analytics: done/overdue/by-priority/by-category...

// // 4. Backup & Share
// GET    /api/backup/full         → Tạo file .zip chứa toàn bộ dữ liệu user (tasks, events, notes, ...) → stream về
// POST   /api/share/plan          → Nhận { target: email | link }, tạo link chia sẻ tạm thời (có expire) hoặc gửi email

// // 5. Các route hỗ trợ khác (nếu muốn mở rộng sau)
// // GET    /api/export/json         → Export toàn bộ dữ liệu dạng JSON
// // POST   /api/import/json         → Import từ JSON
// // POST   /api/share/event/:id     → Chia sẻ riêng 1 event/task

// // YÊU CẦU CHUNG CHO BACKEND:
// // - Tất cả route trên phải có middleware requireAuth (trừ share link public nếu có)
// // - Response format chuẩn: { success: true, data?... } hoặc { success: false, message: '...' }
// // - Xử lý lỗi 401, 403, 500 đầy đủ
// // - Log mọi request export/import (security)
// // - Giới hạn kích thước file upload (multer limit)
// // - Rate limit cho /api/report/email và /api/share/*
// // ===================================================================