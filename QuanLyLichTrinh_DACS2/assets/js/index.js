// assets/js/index.js
// DASHBOARD - PHIÊN BẢN HOÀN CHỈNH 2025

document.addEventListener('DOMContentLoaded', () => {
    updateWelcomeMessage();
    loadDashboardData();
    setupQuickEventForm();
    loadWeather();
    initTimelineChart();
    startReminderCheck();
});

// ===================================================================
// 1. CHÀO THEO GIỜ
// ===================================================================
function updateWelcomeMessage() {
    const hour = new Date().getHours();
    let greeting = "Xin chào";
    if (hour < 12) greeting = "Chào buổi sáng";
    else if (hour < 18) greeting = "Chào buổi chiều";
    else greeting = "Chào buổi tối";

    const welcomeEl = document.getElementById('welcome-message');
    if (welcomeEl) welcomeEl.textContent = `${greeting} 👋`;
}

// ===================================================================
// 2. LOAD TOÀN BỘ DASHBOARD
// ===================================================================
async function loadDashboardData() {
    try {
        const [tasksRes, eventsRes, statsRes] = await Promise.all([
            fetch('/api/tasks/today'),
            fetch('/api/events/upcoming?limit=8'),
            fetch('/api/stats')
        ]);

        const [tasksData, eventsData, statsData] = await Promise.all([
            tasksRes.json(),
            eventsRes.json(),
            statsRes.json()
        ]);

        const tasks = tasksData.success ? tasksData.tasks : [];
        const events = eventsData.success ? eventsData.events : [];
        const stats = statsData.success ? statsData.stats : { done: 0, overdue: 0, total: 0, in_progress: 0 };

        displayTodayTasks(tasks);
        displayUpcomingEvents(events);
        updateAllStats(stats);
        renderMiniCalendar(tasks, events);

    } catch (error) {
        console.error('Lỗi load dashboard:', error);
        console.log('Stats API response:', statsData); // Thêm dòng này
        showToast('Lỗi kết nối server', 'error');
    }
}

// ===================================================================
// 3. HIỂN THỊ CÔNG VIỆC HÔM NAY
// ===================================================================
function displayTodayTasks(tasks) {
    const list = document.getElementById('today-tasks');
    if (!list) return;

    if (tasks.length === 0) {
        list.innerHTML = '<li class="empty-state">Không có công việc nào hôm nay – tuyệt vời!</li>';
        return;
    }

    list.innerHTML = tasks.map(task => {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
        const statusClass = isOverdue ? 'overdue' : task.status;
        const statusText = isOverdue ? 'Quá hạn' : 
                          task.status === 'done' ? 'Hoàn thành' : 
                          task.status === 'in_progress' ? 'Đang làm' : 'Chưa làm';

        return `
            <li class="task-item ${statusClass}">
                <div class="task-info">
                    <strong>${escapeHtml(task.title)}</strong>
                    ${task.due_date ? `<small>Hạn: ${formatDate(task.due_date)}</small>` : ''}
                </div>
                <span class="status-badge">${statusText}</span>
            </li>
        `;
    }).join('');
}

// ===================================================================
// 4. SỰ KIỆN SẮP TỚI
// ===================================================================
function displayUpcomingEvents(events) {
    const list = document.getElementById('upcoming-events');
    if (!list) return;

    if (events.length === 0) {
        list.innerHTML = '<li class="empty-state">Không có sự kiện sắp tới</li>';
        return;
    }

    list.innerHTML = events.map(ev => {
        const date = formatDate(ev.start_time);
        const time = new Date(ev.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `<li><strong>${escapeHtml(ev.title)}</strong><br><small>${date} • ${time}</small></li>`;
    }).join('');
}

// ===================================================================
// 5. CẬP NHẬT TẤT CẢ THỐNG KÊ (SỬA LỖI OVERDUE + PROGRESS BAR)
// ===================================================================
function updateAllStats(stats) {
    const done = stats.done || 0;
    const overdue = stats.overdue || 0;
    const total = stats.total || 0;
    const in_progress = stats.in_progress || 0;

    // Cập nhật 4 ô lớn (giữ nguyên)
    const updateBig = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    updateBig('stat-done', done);
    updateBig('stat-overdue', overdue);
    updateBig('stat-total', total);
    updateBig('stat-progress', in_progress);

    // CẬP NHẬT THÊM CHO PHẦN NHỎ BÊN PHẢI
    const updateSmall = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    updateSmall('small-stat-done', done);
    updateSmall('small-stat-overdue', overdue);
    updateSmall('small-stat-total', total);

    // Progress bar
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
        progressBar.style.backgroundColor = percent >= 80 ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444';
    }
}

// ===================================================================
// 6. FORM THÊM SỰ KIỆN NHANH (THÊM VALIDATION)
// ===================================================================
function setupQuickEventForm() {
    const form = document.getElementById('quick-event');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('quick-event-title').value.trim();
        const start = document.getElementById('quick-event-start').value;
        const end = document.getElementById('quick-event-end').value || start;

        if (!title || !start) {
            showToast('Vui lòng nhập tên và thời gian bắt đầu', 'error');
            return;
        }

        if (end < start) {
            showToast('Thời gian kết thúc phải sau thời gian bắt đầu', 'error');
            return;
        }

        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, start_time: start, end_time: end })
            });

            if (res.ok) {
                showToast('Thêm sự kiện thành công');
                form.reset();
                loadDashboardData();
            } else {
                showToast('Không thêm được sự kiện', 'error');
            }
        } catch (err) {
            showToast('Lỗi mạng', 'error');
        }
    });
}

// ===================================================================
// 7. MINI CALENDAR
// ===================================================================
function renderMiniCalendar(tasks = [], events = []) {
    const container = document.getElementById('mini-calendar');
    if (!container) return;

    const today = new Date();
    let html = '<div class="mini-calendar-grid">';

    for (let i = -3; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const isToday = i === 0;
        const dayNum = date.getDate();
        const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' });

        const taskCount = tasks.filter(t => {
            if (!t.due_date) return false;
            const due = new Date(t.due_date);
            return due.toDateString() === date.toDateString();
        }).length;

        const eventCount = events.filter(e => {
            const start = new Date(e.start_time);
            return start.toDateString() === date.toDateString();
        }).length;

        const totalCount = taskCount + eventCount;
        const badge = totalCount > 0 ? `<span class="mini-badge">${totalCount}</span>` : '';

        html += `
            <div class="mini-day ${isToday ? 'today' : ''}">
                <div class="day-name">${weekday}</div>
                <div class="day-num">${dayNum}${badge}</div>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ===================================================================
// 8. WEATHER + ĐỒNG HỒ (SỬA LỖI + ĐẸP HƠN)
// ===================================================================
let currentWeatherData = null;
let weatherUpdateInterval = null;

function loadWeather() {
    const box = document.getElementById('weather-box');
    if (!box) return;

    box.innerHTML = `<div class="weather-loading"><i class="fas fa-spinner fa-spin"></i><p>Đang tải...</p></div>`;

    fetch('https://api.open-meteo.com/v1/forecast?latitude=16.047&longitude=108.206&current_weather=true&timezone=Asia/Bangkok')
        .then(r => r.json())
        .then(data => {
            if (!data.current_weather) throw new Error('No weather data');

            currentWeatherData = {
                temp: Math.round(data.current_weather.temperature),
                wind: Math.round(data.current_weather.windspeed),
                lastUpdate: new Date()
            };

            if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
            weatherUpdateInterval = setInterval(updateWeatherDisplay, 1000);
            updateWeatherDisplay();
        })
        .catch(err => {
            console.error('Lỗi weather:', err);
            box.innerHTML = `<p style="color:#ef4444">Không tải được thời tiết</p>`;
        });
}

function updateWeatherDisplay() {
    const box = document.getElementById('weather-box');
    if (!box || !currentWeatherData) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    const icon = currentWeatherData.temp >= 32 ? 'sun' : 
                 currentWeatherData.temp >= 27 ? 'cloud-sun' : 
                 currentWeatherData.temp >= 22 ? 'cloud' : 'cloud-rain';

    box.innerHTML = `
        <div class="weather-display">
            <div class="weather-icon"><i class="fas fa-${icon} fa-3x"></i></div>
            <div class="weather-info">
                <div class="temp-big">${currentWeatherData.temp}°C</div>
                <div class="location">Đà Nẵng</div>
                <div class="wind">Gió ${currentWeatherData.wind} km/h</div>
            </div>
        </div>
        <div class="weather-footer">
            <div class="current-time"><i class="far fa-clock"></i> ${timeStr}</div>
            <div class="current-date">${dateStr}</div>
        </div>
    `;
}

// Cập nhật API mỗi 10 phút
setInterval(loadWeather, 10 * 60 * 1000);

// ===================================================================
// 9. TIMELINE CHART (SỬA API ĐÚNG)
// ===================================================================
let timelineChart = null;
function initTimelineChart() {
    const canvas = document.getElementById('timelineChart');
    if (!canvas || typeof Chart === 'undefined') return;

    fetch('/api/events/upcoming?limit=12')
        .then(r => r.json())
        .then(data => {
            if (!data.success || data.events.length === 0) {
                showEmptyChart(canvas, 'Chưa có sự kiện nào');
                return;
            }

            const events = data.events;
            const labels = events.map(e => e.title.length > 20 ? e.title.substring(0,20)+'...' : e.title);
            const durations = events.map(e => {
                const start = new Date(e.start_time);
                const end = new Date(e.end_time || e.start_time);
                return Math.max(10, Math.round((end - start) / 60000));
            });

            if (timelineChart) timelineChart.destroy();

            timelineChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Thời lượng (phút)',
                        data: durations,
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderColor: '#6366f1',
                        borderWidth: 2,
                        borderRadius: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true },
                        x: { ticks: { maxRotation: 45, minRotation: 45 } }
                    }
                }
            });
        })
        .catch(err => {
            console.error('Lỗi timeline:', err);
            showEmptyChart(canvas, 'Lỗi tải dữ liệu');
        });
}

function showEmptyChart(canvas, message) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '18px Inter';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

// ===================================================================
// 10. REMINDER CHECK (THÊM ROUTE NẾU CẦN)
// ===================================================================
function startReminderCheck() {
    setInterval(async () => {
        try {
            const res = await fetch('/api/events/upcoming?minutes=15');
            const data = await res.json();
            if (data.success && data.events?.length > 0) {
                data.events.forEach(ev => {
                    const key = `reminded_${ev.event_id}`;
                    if (!localStorage.getItem(key)) {
                        showToast(`Sắp tới: ${ev.title} lúc ${new Date(ev.start_time).toLocaleTimeString('vi-VN')}`, 'info');
                        localStorage.setItem(key, '1');
                    }
                });
            }
        } catch (err) { }
    }, 60000);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ===================================================================
// UTILS
// ===================================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}