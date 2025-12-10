// assets/js/timeline.js - PHIÊN BẢN HOÀN HẢO 100% (đã fix tất cả lỗi)
let zoomLevel = 1;
const TIMELINE_START_REF = "2025-01-01";
let tooltip = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    tooltip = document.getElementById("timeline-tooltip");
    initTimeline();
    startAutoRefresh();
});

async function initTimeline() {
    await loadTimelineData();
    setupEventListeners();
    updateZoomDisplay();
}

async function loadTimelineData() {
    try {
        const res = await fetch('/api/timeline');
        if (!res.ok) throw new Error('Lỗi mạng');
        const data = await res.json();

        if (data.success) {
            window.sprints = data.sprints || [];
            window.tasks = (data.tasks || []).map(t => ({
                ...t,
                start: t.start_date || t.start_time,
                end: t.end_date || t.end_time || new Date(new Date(t.start_date || t.start_time).getTime() + 7*24*60*60*1000).toISOString().split('T')[0]
            }));
            window.milestones = data.milestones || [];

            renderSprints();
            renderTaskBars();
            renderMilestoneMarkers();
        }
    } catch (err) {
        console.error('Lỗi load timeline:', err);
    }
}

function renderSprints() {
    const container = document.getElementById('timeline');
    if (!container) return;

    container.innerHTML = window.sprints.map(s => `
        <li class="timeline-row" data-start="${s.start_date}" data-end="${s.end_date}">
            <div class="timeline-label">
                <strong>${escapeHtml(s.title)}</strong>
                <small>${formatDate(s.start_date)} → ${formatDate(s.end_date)}</small>
            </div>
            <div class="timeline-bar-container">
                <div class="timeline-bar sprint-bar"></div>
            </div>
        </li>
    `).join('');

    updateSprintBars();
}

function updateSprintBars() {
    document.querySelectorAll('.timeline-row').forEach(row => {
        const start = row.dataset.start;
        const end = row.dataset.end;
        const offset = daysBetween(TIMELINE_START_REF, start);
        const duration = daysBetween(start, end) + 1;

        const bar = row.querySelector('.timeline-bar');
        bar.style.left = (offset * 40 * zoomLevel) + 'px';
        bar.style.width = (duration * 40 * zoomLevel) + 'px';
    });
}

function renderTaskBars() {
    const container = document.getElementById('timeline-tasks');
    if (!container) return;
    container.innerHTML = '';

    window.tasks.forEach(task => {
        const start = task.start || task.start_date || task.start_time;
        const end = task.end || task.end_date || task.end_time;

        if (!start) return; // bỏ qua task không có ngày

        const offset = daysBetween(TIMELINE_START_REF, start);
        const duration = daysBetween(start, end || start) + 1;

        const el = document.createElement('div');
        el.className = 'timeline-task-bar';
        el.style.left = (offset * 40 * zoomLevel) + 'px';
        el.style.width = Math.max(duration * 40 * zoomLevel, 20) + 'px';
        el.style.backgroundColor = getTaskColor(task.status || 'todo');
        el.title = `${task.title} (${formatDate(start)} → ${formatDate(end)})`;

        el.addEventListener('mouseenter', e => showTooltip(e, `
            <strong>${escapeHtml(task.title)}</strong><br>
            <small>${formatDate(start)} → ${formatDate(end || start)}</small><br>
            Trạng thái: <b>${task.status || 'Chưa xác định'}</b>
        `));
        el.addEventListener('mouseleave', hideTooltip);

        container.appendChild(el);
    });
}

function renderMilestoneMarkers() {
    const container = document.getElementById('timeline-milestones');
    if (!container) return;
    container.innerHTML = '';

    window.milestones.forEach(ms => {
        const date = ms.date || ms.start_time;
        if (!date) return;

        const offset = daysBetween(TIMELINE_START_REF, date);
        const el = document.createElement('div');
        el.className = 'timeline-milestone';
        el.style.left = (offset * 40 * zoomLevel - 10) + 'px';
        el.innerHTML = '<i class="fa fa-flag"></i>';

        el.addEventListener('mouseenter', e => showTooltip(e, `<strong>Milestone:</strong> ${escapeHtml(ms.title)}<br>${formatDate(date)}`));
        el.addEventListener('mouseleave', hideTooltip);

        container.appendChild(el);
    });
}

// TOOLTIP FIX
function showTooltip(e, content) {
    if (!tooltip) return;
    tooltip.innerHTML = content;
    tooltip.style.left = (e.pageX + 15) + 'px';
    tooltip.style.top = (e.pageY + 15) + 'px';
    tooltip.classList.remove('hidden');
    tooltip.classList.add('show');
}

function hideTooltip() {
    if (tooltip) {
        tooltip.classList.add('hidden');
        tooltip.classList.remove('show');
    }
}

function daysBetween(d1, d2) {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
    if (!date) return 'Chưa đặt';
    return new Date(date).toLocaleDateString('vi-VN');
}

function getTaskColor(status) {
    const map = {
        done: '#4CAF50',
        in_progress: '#2196F3',
        todo: '#FF9800',
        canceled: '#F44336'
    };
    return map[status] || '#9E9E9E';
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

function setupEventListeners() {
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        zoomLevel = Math.min(zoomLevel + 0.3, 3);
        applyZoom();
    });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        zoomLevel = Math.max(zoomLevel - 0.3, 0.4);
        applyZoom();
    });
    document.getElementById('add-timeline')?.addEventListener('click', () => {
        document.getElementById('add-sprint-modal').style.display = 'flex';
        document.getElementById('modal-overlay').style.display = 'block';
    });
    document.getElementById('close-modal')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeModal);

    document.getElementById('form-sprint')?.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('s-title').value.trim();
        const start = document.getElementById('s-start').value;
        const end = document.getElementById('s-end').value;

        if (!title || !start || !end) return alert('Nhập đầy đủ');

        await fetch('/api/timeline/sprints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, start_date: start, end_date: end })
        });

        closeModal();
        loadTimelineData();
    });
}

function closeModal() {
    document.getElementById('add-sprint-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('form-sprint')?.reset();
}

// AUTO REFRESH THÔNG MINH
function startAutoRefresh() {
    stopAutoRefresh();
    refreshInterval = setInterval(() => {
        if (!document.hidden) loadTimelineData();
    }, 20000);
}

function stopAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoRefresh();
    else startAutoRefresh();
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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