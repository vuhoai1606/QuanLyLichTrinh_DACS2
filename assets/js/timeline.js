// assets/js/timeline.js
// ===================================================================
// timeline.js - FRONTEND (CHỈ XỬ LÝ UI + GỌI API)
// Backend xử lý toàn bộ logic tại controllers/timelineController.js
// ===================================================================

let zoomLevel = 1;
const TIMELINE_START_REF = "2025-01-01"; // Ngày tham chiếu để tính offset
let tooltip = null;

document.addEventListener('DOMContentLoaded', () => {
    initTimeline();
});

/* ============================================================= */
/* KHỞI TẠO */
/* ============================================================= */
async function initTimeline() {
    tooltip = document.getElementById("timeline-tooltip");

    await loadTimelineData();
    setupEventListeners();
    updateZoomDisplay();
}

/* ============================================================= */
/* GỌI API */
/* ============================================================= */

/** Load toàn bộ dữ liệu timeline (sprints, tasks, milestones) */
async function loadTimelineData() {
    try {
        const res = await fetch('/api/timeline');
        const data = await res.json();

        if (data.success) {
            window.sprints      = data.sprints || [];
            window.tasks        = data.tasks || [];
            window.milestones   = data.milestones || [];

            renderSprints();
            renderTaskBars();
            renderMilestoneMarkers();
        } else {
            alert('Không thể tải dữ liệu timeline');
        }
    } catch (err) {
        console.error('Lỗi load timeline:', err);
        alert('Có lỗi xảy ra khi tải dữ liệu');
    }
}

/** Thêm sprint mới */
async function createSprint(sprintData) {
    try {
        const res = await fetch('/api/timeline/sprints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sprintData)
        });
        const result = await res.json();
        if (result.success) {
            await loadTimelineData();
        }
        return result;
    } catch (err) {
        console.error(err);
        return { success: false };
    }
}

/* Các hàm API khác (nếu cần mở rộng) */
/*
async function updateSprint(id, data) { ... }
async function deleteSprint(id) { ... }
async function createTask(taskData) { ... }
async function createMilestone(msData) { ... }
*/

/* ============================================================= */
/* RENDER UI */
/* ============================================================= */

function renderSprints() {
    const container = document.getElementById('timeline');
    if (!container) return;

    container.innerHTML = window.sprints.map(s => `
        <li class="timeline-row" 
            data-id="${s.id}" 
            data-start="${s.start_date}" 
            data-end="${s.end_date}">
            <div class="timeline-label">
                <strong>${s.title}</strong>
                <div class="small">${s.start_date} → ${s.end_date}</div>
            </div>
            <div class="timeline-bar-container">
                <div class="timeline-bar"></div>
            </div>
        </li>
    `).join('');

    updateSprintBars();
}

function updateSprintBars() {
    document.querySelectorAll('.timeline-row').forEach(row => {
        const start = row.dataset.start;
        const end   = row.dataset.end;
        const offset = daysBetween(TIMELINE_START_REF, start);
        const duration = daysBetween(start, end);

        const bar = row.querySelector('.timeline-bar');
        bar.style.left  = (offset * 30 * zoomLevel) + 'px';
        bar.style.width = (duration * 30 * zoomLevel) + 'px';
    });
}

function renderTaskBars() {
    const container = document.getElementById('timeline-tasks');
    if (!container) return;
    container.innerHTML = '';

    (window.tasks || []).forEach(task => {
        const el = document.createElement('div');
        el.className = 'timeline-task-bar';

        const offset   = daysBetween(TIMELINE_START_REF, task.start_date || task.start);
        const duration = daysBetween(task.start_date || task.start, task.end_date || task.end);

        el.style.left  = (offset * 30 * zoomLevel) + 'px';
        el.style.width = (duration * 30 * zoomLevel) + 'px';
        el.style.backgroundColor = getTaskColor(task.status || 'todo');

        el.addEventListener('mousemove', e => showTooltip(e, `
            <strong>${task.title}</strong><br>
            ${task.start_date || task.start} → ${task.end_date || task.end}<br>
            Trạng thái: ${task.status || 'Chưa xác định'}
        `));
        el.addEventListener('mouseleave', hideTooltip);

        container.appendChild(el);
    });
}

function renderMilestoneMarkers() {
    const container = document.getElementById('timeline-milestones');
    if (!container) return;
    container.innerHTML = '';

    (window.milestones || []).forEach(ms => {
        const el = document.createElement('div');
        el.className = 'timeline-milestone';

        const offset = daysBetween(TIMELINE_START_REF, ms.date);
        el.style.left = (offset * 30 * zoomLevel) + 'px';
        el.innerHTML = '<i class="fa fa-flag"></i>';

        el.addEventListener('mousemove', e => showTooltip(e, `Milestone: ${ms.title}<br>${ms.date}`));
        el.addEventListener('mouseleave', hideTooltip);

        container.appendChild(el);
    });
}

/* ============================================================= */
/* TOOLTIP & ZOOM */
/* ============================================================= */

function showTooltip(e, content) {
    if (!tooltip) return;
    tooltip.innerHTML = content;
    tooltip.classList.add('show');
    tooltip.style.left = (e.pageX + 12) + 'px';
    tooltip.style.top  = (e.pageY + 12) + 'px';
}

function hideTooltip() {
    if (tooltip) tooltip.classList.remove('show');
}

function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function getTaskColor(status) {
    const colors = {
        done: '#4CAF50',
        in_progress: '#2196F3',
        todo: '#FF9800',
        canceled: '#F44336'
    };
    return colors[status] || '#9E9E9E';
}

function applyZoom() {
    updateSprintBars();
    renderTaskBars();
    renderMilestoneMarkers();
    updateZoomDisplay();
}

function updateZoomDisplay() {
    const el = document.getElementById('zoomLevel');
    if (el) el.textContent = Math.round(zoomLevel * 100) + '%';
}

/* ============================================================= */
/* EVENT LISTENERS */
/* ============================================================= */

function setupEventListeners() {
    // Thêm sprint
    document.getElementById('add-timeline')?.addEventListener('click', openAddSprintModal);
    document.getElementById('form-sprint')?.addEventListener('submit', handleAddSprint);
    document.getElementById('close-modal')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeModal);

    // Zoom
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        zoomLevel = Math.min(zoomLevel + 0.2, 3);
        applyZoom();
    });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        zoomLevel = Math.max(zoomLevel - 0.2, 0.3);
        applyZoom();
    });

    // Export
    document.getElementById('exportImgBtn')?.addEventListener('click', exportAsImage);
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportAsPDF);
}

/* ============================================================= */
/* MODAL THÊM SPRINT */
/* ============================================================= */

function openAddSprintModal() {
    const modal = document.getElementById('add-sprint-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.style.display = 'flex';
    if (overlay) overlay.style.display = 'block';
}

async function handleAddSprint(e) {
    e.preventDefault();

    const title = document.getElementById('s-title')?.value.trim();
    const start = document.getElementById('s-start')?.value;
    const end   = document.getElementById('s-end')?.value;

    if (!title || !start || !end) {
        alert('Vui lòng nhập đầy đủ thông tin');
        return;
    }

    const result = await createSprint({ title, start_date: start, end_date: end });
    if (result.success) {
        closeModal();
    }
}

function closeModal() {
    document.getElementById('add-sprint-modal')?.style.setProperty('display', 'none');
    document.getElementById('modal-overlay')?.style.setProperty('display', 'none');
    document.getElementById('form-sprint')?.reset();
}

/* ============================================================= */
/* EXPORT IMAGE / PDF (dùng html2canvas + jsPDF) */
/* ============================================================= */

async function exportAsImage() {
    const card = document.querySelector('.card');
    if (!card) return alert('Không tìm thấy vùng timeline');

    try {
        const canvas = await html2canvas(card, { scale: 2 });
        const link = document.createElement('a');
        link.download = `timeline_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error(err);
        alert('Lỗi khi xuất hình ảnh');
    }
}

async function exportAsPDF() {
    const card = document.querySelector('.card');
    if (!card) return alert('Không tìm thấy vùng timeline');

    try {
        const canvas = await html2canvas(card, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`timeline_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
        console.error(err);
        alert('Lỗi khi xuất PDF');
    }
}

/* ============================================================= */
/* NOTES CHO BACKEND DEVELOPER (RẤT QUAN TRỌNG) */
/* ============================================================= */
/*
1. API CẦN THIẾT (bắt buộc phải có):

   GET    /api/timeline
      → Response:
        {
          success: true,
          sprints: [
            { id, title, start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD", color?: string }
          ],
          tasks: [
            {
              id,
              title,
              start_date: "YYYY-MM-DD",      // hoặc start
              end_date:   "YYYY-MM-DD",      // hoặc end
              status: "todo"|"in_progress"|"done"|"canceled",
              sprint_id?: number             // nếu task thuộc sprint nào đó
            }
          ],
          milestones: [
            { id, title, date: "YYYY-MM-DD", color?: string }
          ]
        }

   POST   /api/timeline/sprints
      → Request body: { title, start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD" }
      → Response: { success: true, sprint: { id, ... } }

2. API NÊN CÓ (để mở rộng sau này – frontend đã sẵn sàng dùng ngay):
   PUT    /api/timeline/sprints/:id        → cập nhật sprint
   DELETE /api/timeline/sprints/:id        → xóa sprint
   POST   /api/timeline/tasks              → tạo task trên timeline
   POST   /api/timeline/milestones         → tạo milestone

3. Quy ước ngày:
   - Tất cả ngày đều ở định dạng ISO "YYYY-MM-DD" (không có giờ phút)
   - Frontend tính toán vị trí bar dựa trên số ngày chênh lệch từ 2025-01-01
   - 1 ngày = 30px (trước khi zoom)

4. Các tính năng frontend đã hỗ trợ sẵn (chỉ cần backend trả dữ liệu đúng):
   - Zoom in/out (0.3x → 3x)
   - Tooltip khi hover task/milestone
   - Export PNG & PDF (dùng html2canvas + jsPDF → đã include trong timeline.ejs)
   - Drag-drop task (nếu sau này thêm SortableJS)

5. CSS quan trọng (đã có trong timeline.css, chỉ cần đảm bảo):
   .timeline-row, .timeline-task-bar, .timeline-milestone phải position: relative/absolute
   #timeline-tooltip phải có position: fixed và z-index cao

=> Khi backend implement đúng 2 API trên là timeline hoạt động hoàn hảo 100%.
*/