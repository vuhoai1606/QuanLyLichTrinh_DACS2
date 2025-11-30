// assets/js/index.js
// ===================================================================
// DASHBOARD - FINAL VERSION (2025) - ĐÃ FIX LỖI, CHUYÊN NGHIỆP
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupQuickAddForms();
    setupNotesSection();
    setupGlobalSearch();
    loadWeather();
    initTimelineChart();
    startReminderCheck();
});

// ===================================================================
// 1. LOAD TOÀN BỘ DASHBOARD
// ===================================================================
async function loadDashboardData() {
    try {
        const [tasksRes, eventsRes, statsRes, notesRes] = await Promise.all([
            fetch('/api/tasks/today'),
            fetch('/api/events/upcoming'),
            fetch('/api/stats'),
            fetch('/api/notes/recent')
        ]);

        const [tasksData, eventsData, statsData, notesData] = await Promise.all([
            tasksRes.json(),
            eventsRes.json(),
            statsRes.json(),
            notesRes.json()
        ]);

        const tasks = tasksData.success ? tasksData.tasks : [];
        const events = eventsData.success ? eventsData.events : [];

        displayTodayTasks(tasks);
        displayUpcomingEvents(events);
        displayStats(statsData.success ? statsData.stats : { done: 0, overdue: 0, total: 0 });
        displayRecentNotes(notesData.success ? notesData.notes : []);
        renderMiniCalendar(tasks, events); // show badge tasks/events
    } catch (error) {
        console.error('Lỗi load dashboard:', error);
    }
}

// ===================================================================
// 2. RENDER CÁC PHẦN UI
// ===================================================================
function displayTodayTasks(tasks) {
    const list = document.getElementById('today-tasks');
    if (!list) return;

    if (tasks.length === 0) {
        list.innerHTML = '<li class="empty">Không có công việc hôm nay</li>';
        return;
    }

    list.innerHTML = tasks.map(task => {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
        const status = isOverdue ? 'overdue' : task.status;
        const statusText = isOverdue ? 'Quá hạn' : status;

        return `
            <li class="task-item ${status}">
                <div>
                    <strong>${task.title}</strong>
                    ${task.tag ? `<span class="tag">${task.tag}</span>` : ''}
                    ${task.due_date ? `<small>Hạn: ${new Date(task.due_date).toLocaleDateString('vi-VN')}</small>` : ''}
                </div>
                <span class="status-badge">${statusText}</span>
            </li>
        `;
    }).join('');
}

function displayUpcomingEvents(events) {
    const list = document.getElementById('upcoming-events');
    if (!list) return;

    if (events.length === 0) {
        list.innerHTML = '<li>Không có sự kiện sắp tới</li>';
        return;
    }

    list.innerHTML = events.map(ev => {
        const time = new Date(ev.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `<li>${ev.title} — ${time}</li>`;
    }).join('');
}

function displayStats(stats) {
    const done = stats.done || 0;
    const overdue = stats.overdue || 0;
    const total = stats.total || 0;

    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-overdue').textContent = overdue;
    document.getElementById('stat-total').textContent = total;

    const percent = total > 0 ? (done / total) * 100 : 0;
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${percent.toFixed(0)}%`;
    progressBar.style.transition = 'width 0.5s ease-in-out';
}

function displayRecentNotes(notes) {
    const list = document.getElementById('notes-list');
    if (!list) return;

    if (notes.length === 0) {
        list.innerHTML = '<li class="note-item empty">Chưa có ghi chú nào</li>';
        return;
    }

    list.innerHTML = notes.slice(0, 6).map(note => `
        <li class="note-item" data-id="${note.note_id}">
            <div class="note-content">${escapeHtml(note.content)}</div>
            <small>${new Date(note.created_at).toLocaleDateString('vi-VN')}</small>
            <button class="note-delete" title="Xóa">×</button>
        </li>
    `).join('');

    // Gắn sự kiện xóa
    document.querySelectorAll('.note-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            deleteNote(li.dataset.id, li);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================================================
// 3. QUICK ADD FORMS
// ===================================================================
function setupQuickAddForms() {
    // Quick Task
    const taskForm = document.getElementById('quick-add');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('quick-title').value.trim();
            const due = document.getElementById('quick-due').value || null;
            if (!title) return alert('Nhập tiêu đề công việc!');

            try {
                const res = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, due_date: due, priority: 'medium' })
                });

                if (res.ok) {
                    showToast('✅ Thêm nhiệm vụ thành công');
                    taskForm.reset();
                    loadDashboardData();
                } else {
                    showToast('❌ Không thêm được nhiệm vụ', 'error');
                }
            } catch (err) {
                showToast('❌ Lỗi mạng', 'error');
            }
        });
    }

    // Quick Event
    const eventForm = document.getElementById('quick-event');
    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('quick-event-title').value.trim();
            const start = document.getElementById('quick-event-start').value;
            const end = document.getElementById('quick-event-end').value || start;
            if (!title || !start) return;

            try {
                const res = await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, start_time: start, end_time: end })
                });

                if (res.ok) {
                    showToast('✅ Thêm sự kiện thành công');
                    eventForm.reset();
                    loadDashboardData();
                } else {
                    showToast('❌ Không thêm được sự kiện', 'error');
                }
            } catch (err) {
                showToast('❌ Lỗi mạng', 'error');
            }
        });
    }
}

// ===================================================================
// 4. NOTES
// ===================================================================
function setupNotesSection() {
    const input = document.getElementById('quick-note-input');
    const btn = document.getElementById('add-note-btn');
    if (!input || !btn) return;

    const addNote = async () => {
        const content = input.value.trim();
        if (!content) return;

        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                input.value = '';
                loadDashboardData();
            } else {
                showToast('❌ Không thêm được ghi chú', 'error');
            }
        } catch (err) {
            console.error('Lỗi thêm note:', err);
        }
    };

    btn.addEventListener('click', addNote);
    input.addEventListener('keypress', e => e.key === 'Enter' && addNote());
}

async function deleteNote(noteId, element) {
    if (!confirm('Xóa ghi chú này?')) return;

    try {
        await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
        element.style.opacity = '0';
        setTimeout(() => element.remove(), 300);
    } catch (err) {
        showToast('❌ Không xóa được ghi chú', 'error');
    }
}

// ===================================================================
// 5. GLOBAL SEARCH
// ===================================================================
function setupGlobalSearch() {
    const input = document.getElementById('global-search');
    if (!input) return;

    input.addEventListener('input', async (e) => {
        const q = e.target.value.trim();
        if (q.length < 2) {
            loadDashboardData();
            return;
        }

        try {
            const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data.success) {
                document.getElementById('today-tasks').innerHTML =
                    data.results.tasks?.map(t => `<li>${t.title} (tìm)</li>`).join('') || '<li>Không tìm thấy</li>';
            }
        } catch (err) { }
    });
}

// ===================================================================
// 6. MINI CALENDAR
// ===================================================================
function renderMiniCalendar(tasks = [], events = []) {
    const container = document.getElementById('mini-calendar');
    if (!container) return;

    const today = new Date();
    let html = '<div class="mini-week">';
    for (let i = -3; i <= 3; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const active = i === 0 ? 'active-day' : '';

        const taskCount = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === d.toDateString()).length;
        const eventCount = events.filter(e => new Date(e.start_time).toDateString() === d.toDateString()).length;

        let badge = '';
        if (taskCount || eventCount) badge = `<span class="badge">${taskCount + eventCount}</span>`;

        html += `<div class="mini-day ${active}">${d.getDate()}/${d.getMonth()+1}${badge}</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ===================================================================
// 7. WEATHER
// ===================================================================
function loadWeather() {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=16.047&longitude=108.206&current_weather=true&timezone=Asia/Bangkok')
        .then(r => r.json())
        .then(data => {
            const w = data.current_weather;
            const box = document.getElementById('weather-box');
            if (box && w) {
                const updatedAt = new Date();
                box.innerHTML = `
                    <p>Nhiệt độ: <strong>${w.temperature}°C</strong></p>
                    <p>Gió: ${w.windspeed} km/h · Đà Nẵng</p>
                    <p class="weather-time">Giờ hiện tại VN: ${updatedAt.toLocaleTimeString('vi-VN')}</p>
                    <p class="weather-update">Cập nhật dữ liệu: ${updatedAt.toLocaleTimeString('vi-VN')}</p>
                `;
            }
        })
        .catch(err => console.error('Lỗi load weather:', err));
}
setInterval(loadWeather, 60 * 1000);

// ===================================================================
// 8. TIMELINE CHART
// ===================================================================
let timelineChart = null;
function initTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx || typeof Chart === 'undefined') return;

    fetch('/api/events?limit=10')
    .then(r => r.json())
    .then(data => {
        // Kiểm tra dữ liệu an toàn
        if (!data || !data.success || !Array.isArray(data.events)) {
            console.warn("Lỗi dữ liệu events:", data);
            return;
        }

        const events = data.events || [];  

        const labels = events.map(e =>
            e.title.substring(0, 20) + (e.title.length > 20 ? '...' : '')
        );

        const durations = events.map(e => {
            const start = new Date(e.start_time);
            const end = new Date(e.end_time || e.start_time);
            return (end - start) / 60000;
        });

        if (timelineChart) timelineChart.destroy();

        timelineChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Thời lượng (phút)',
                    data: durations,
                    backgroundColor: 'rgba(100,180,246,0.7)'
                }]
            },
            options: { responsive: true }
        });
    })
    .catch(err => console.error("Chart API error:", err));
}

// ===================================================================
// 9. REMINDER CHECK
// ===================================================================
function startReminderCheck() {
    setInterval(async () => {
        try {
            const res = await fetch('/api/events/upcoming?minutes=10');
            const data = await res.json();

            if (data.success && data.events.length > 0) {
                data.events.forEach(ev => {
                    if (!localStorage.getItem(`notified_${ev.event_id}`)) {
                        showToast(`⏰ Sắp tới: ${ev.title} lúc ${new Date(ev.start_time).toLocaleTimeString()}`);
                        localStorage.setItem(`notified_${ev.event_id}`, '1');
                    }
                });
            }
        } catch (err) {
            console.error("Lỗi reminder:", err);
        }
    }, 60000);
}

// ===================================================================
// 10. TOAST
// ===================================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
    setTimeout(() => toast.remove(), 3500);
}

// ===================================================================
// NOTES:
// ===================================================================
// - Backend cần /api/tasks/today, /api/events/upcoming, /api/stats, /api/search
// - Thêm tags handling nếu cần API
// ===================================================================