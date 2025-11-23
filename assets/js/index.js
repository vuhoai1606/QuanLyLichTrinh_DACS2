// assets/js/index.js
// ===================================================================
// DASHBOARD - FINAL VERSION (2025) - ĐÃ CÓ NOTES + ĐẸP NHƯ NOTION
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupQuickAddForms();
    setupNotesSection();
    setupGlobalSearch();
    renderMiniCalendar();
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
            fetch('/api/notes/recent') // API mới: lấy 6 ghi chú gần nhất
        ]);

        const [tasksData, eventsData, statsData, notesData] = await Promise.all([
            tasksRes.json(),
            eventsRes.json(),
            statsRes.json(),
            notesRes.json()
        ]);

        displayTodayTasks(tasksData.success ? tasksData.tasks : []);
        displayUpcomingEvents(eventsData.success ? eventsData.events : []);
        displayStats(statsData.success ? statsData.stats : { done: 0, overdue: 0, total: 0 });
        displayRecentNotes(notesData.success ? notesData.notes : []);

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
    document.getElementById('stat-done').textContent = stats.done || 0;
    document.getElementById('stat-overdue').textContent = stats.overdue || 0;
    document.getElementById('stat-total').textContent = stats.total || 0;

    const percent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
    document.getElementById('progress-bar').style.width = `${percent.toFixed(0)}%`;
}

// NEW: HIỂN THỊ GHI CHÚ NHANH
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
// 3. QUICK ADD FORMS (Task + Event)
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

            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, due_date: due, priority: 'medium' })
            });

            taskForm.reset();
            loadDashboardData();
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

            await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, start_time: start, end_time: end })
            });

            eventForm.reset();
            loadDashboardData();
        });
    }
}

// ===================================================================
// 4. NOTES SECTION (Ghi chú nhanh)
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
                loadDashboardData(); // refresh notes
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
        alert('Không xóa được');
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
// 6. MINI CALENDAR + WEATHER + CHART + REMINDER
// ===================================================================
function renderMiniCalendar() {
    const container = document.getElementById('mini-calendar');
    if (!container) return;

    const today = new Date();
    let html = '<div class="mini-week">';
    for (let i = -3; i <= 3; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const active = i === 0 ? 'active-day' : '';
        html += `<div class="mini-day ${active}">${d.getDate()}/${d.getMonth()+1}</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function loadWeather() {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=16.047&longitude=108.206&current_weather=true')
        .then(r => r.json())
        .then(data => {
            const w = data.current_weather;
            const box = document.getElementById('weather-box');
            if (box) {
                box.innerHTML = `
                    <p>Nhiệt độ: <strong>${w.temperature}°C</strong></p>
                    <p>Gió: ${w.windspeed} km/h · Đà Nẵng</p>
                `;
            }
        });
}

let timelineChart = null;
function initTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx || typeof Chart === 'undefined') {
        setTimeout(initTimelineChart, 200);
        return;
    }

    fetch('/api/events?limit=10')
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;

            const labels = data.events.map(e => e.title.substring(0, 20) + (e.title.length > 20 ? '...' : ''));
            const durations = data.events.map(e => {
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
                        backgroundColor: 'rgba(100, 180, 246, 0.7)'
                    }]
                },
                options: { responsive: true }
            });
        });
}

function startReminderCheck() {
    setInterval(async () => {
        try {
            const res = await fetch('/api/events/upcoming?minutes=10');
            const data = await res.json();

            if (data.success && data.events.length > 0) {
                data.events.forEach(ev => {
                    // Kiểm tra nếu chưa thông báo
                    if (!localStorage.getItem(`notified_${ev.event_id}`)) {
                        alert(`Sắp tới: ${ev.title} lúc ${new Date(ev.start_time).toLocaleTimeString()}`);
                        localStorage.setItem(`notified_${ev.event_id}`, '1');
                    }
                });
            }
        } catch (err) {
            console.error("Lỗi khi kiểm tra reminder:", err);
        }
    }, 60000); // chạy mỗi 60s
}

// ===================================================================
// NOTES:
// ===================================================================
// - Backend cần /api/tasks/today, /api/events/upcoming, /api/stats, /api/search
// - Thêm tags handling nếu cần API
// ===================================================================