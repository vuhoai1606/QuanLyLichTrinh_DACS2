// assets/js/index.js
// DASHBOARD - PHIÊN BẢN HOÀN CHỈNH 2025 - ĐÃ DỌN SẠCH, CHỈ GIỮ NHỮNG GÌ CẦN

document.addEventListener('DOMContentLoaded', () => {
    updateWelcomeMessage();
    loadDashboardData();
    setupQuickEventForm();
    loadWeather();
    initTimelineChart();
    startReminderCheck();
});

// ===================================================================
// 1. CHÀO THEO GIỜ (XIN CHÀO BUỔI SÁNG / TỐI)
// ===================================================================
function updateWelcomeMessage() {
    const hour = new Date().getHours();
    let greeting = "Xin chào";
    if (hour < 12) greeting = "Chào buổi sáng";
    else if (hour < 18) greeting = "Chào buổi chiều";
    else greeting = "Chào buổi tối";

    const welcomeEl = document.getElementById('welcome-message');
    if (welcomeEl) {
        welcomeEl.textContent = `${greeting}`;
    }
}

// ===================================================================
// 2. LOAD TOÀN BỘ DASHBOARD
// ===================================================================
async function loadDashboardData() {
    try {
        const [tasksRes, eventsRes, statsRes] = await Promise.all([
            fetch('/api/tasks/today'),
            fetch('/api/events/upcoming'),
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
        updateAllStats(stats);  // Cập nhật cả 4 ô lớn + progress bar
        renderMiniCalendar(tasks, events);

    } catch (error) {
        console.error('Lỗi load dashboard:', error);
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
        const statusClass = isOverdue ? 'overdue' : task.status || 'todo';
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

    list.innerHTML = events.slice(0, 8).map(ev => {
        const date = formatDate(ev.start_time);
        const time = new Date(ev.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `<li><strong>${escapeHtml(ev.title)}</strong><br><small>${date} • ${time}</small></li>`;
    }).join('');
}

// ===================================================================
// 5. CẬP NHẬT TẤT CẢ THỐNG KÊ (4 Ô LỚN + PROGRESS BAR)
// ===================================================================
function updateAllStats(stats) {
    // 🌟 Đã bao gồm 'overdue' trong destructuring
    const { done = 0, overdue = 0, total = 0, in_progress = 0 } = stats;

    // Cập nhật 4 ô lớn
    document.querySelector('#stat-done').textContent = done;
    document.querySelector('#stat-overdue').textContent = overdue; // FIX: Đã sử dụng biến overdue
    document.querySelector('#stat-total').textContent = total;
    document.querySelector('#stat-progress').textContent = in_progress || 0;

    // Cập nhật progress bar
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
    }
}

// ===================================================================
// 6. FORM THÊM SỰ KIỆN NHANH (DUY NHẤT CÒN LẠI)
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
// 7. MINI CALENDAR (7 ngày hiện tại)
// ===================================================================
function renderMiniCalendar(tasks = [], events = []) {
    const container = document.getElementById('mini-calendar');
    if (!container) return;

    const today = new Date();
    let html = '<div class="mini-calendar-grid">';

    for (let i = -3; i <= 3; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const isToday = i === 0;
        const dayNum = date.getDate();
        const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' });

        const taskCount = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === date.toDateString()).length;
        const eventCount = events.filter(e => new Date(e.start_time).toDateString() === date.toDateString()).length;
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
// 7. WEATHER + ĐỒNG HỒ THỜI GIAN THỰC (CẬP NHẬT MỖI GIÂY)
// ===================================================================
let currentWeatherData = null;
let weatherUpdateInterval = null;
let clockInterval = null;

function loadWeather() {
    const box = document.getElementById('weather-box');
    if (!box) return;

    // Hiển thị loading đẹp trước khi có dữ liệu
    box.innerHTML = `
        <div class="weather-loading">
            <i class="fas fa-cloud-sun fa-2x" style="color:#fbbf24"></i>
            <p>Đang tải thời tiết...</p>
        </div>
    `;

    fetch('https://api.open-meteo.com/v1/forecast?latitude=16.047&longitude=108.206&current_weather=true&timezone=Asia/Bangkok')
        .then(r => r.json())
        .then(data => {
            if (!data.current_weather) return;

            currentWeatherData = {
                temp: data.current_weather.temperature,
                wind: data.current_weather.windspeed,
                lastUpdate: new Date()  // Thời điểm API trả dữ liệu
            };

            // Dừng interval cũ nếu có rồi thì tạo mới
            if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
            weatherUpdateInterval = setInterval(updateWeatherDisplay, 1000); // Cập nhật mỗi giây

            updateWeatherDisplay(); // Gọi lần đầu ngay
        })
        .catch(err => {
            console.error('Lỗi load weather:', err);
            box.innerHTML = `<p style="color:#ef4444; text-align:center">Không tải được thời tiết</p>`;
        });
}

// Hàm cập nhật giao diện thời tiết + đồng hồ chạy realtime
function updateWeatherDisplay() {
    const box = document.getElementById('weather-box');
    if (!box || !currentWeatherData) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    const dateStr = now.toLocaleDateString('vi-VN', { 
        weekday: 'long', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });

    // Icon theo nhiệt độ
    const icon = currentWeatherData.temp >= 32 ? 'sun' : 
                 currentWeatherData.temp >= 27 ? 'cloud-sun' : 
                 currentWeatherData.temp >= 22 ? 'cloud' : 'cloud-rain';

    box.innerHTML = `
        <div class="weather-display">
            <div class="weather-icon">
                <i class="fas fa-${icon} fa-3x"></i>
            </div>
            <div class="weather-info">
                <div class="temp-big">${currentWeatherData.temp}°C</div>
                <div class="location">Đà Nẵng</div>
                <div class="wind">Gió ${currentWeatherData.wind} km/h</div>
            </div>
        </div>
        <div class="weather-footer">
            <div class="current-time">
                <i class="far fa-clock"></i> ${timeStr}
            </div>
            <div class="update-time">
                <i class="fas fa-sync"></i> Cập nhật: ${currentWeatherData.lastUpdate.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
            </div>
            <div class="current-date">${dateStr}</div>
        </div>
    `;
}

// Tự động load khi vào trang
loadWeather();

// Cập nhật dữ liệu thời tiết mỗi 10 phút (không cần mỗi giây gọi API)
setInterval(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=16.047&longitude=108.206&current_weather=true&timezone=Asia/Bangkok')
        .then(r => r.json())
        .then(data => {
            if (data.current_weather) {
                currentWeatherData = {
                    temp: data.current_weather.temperature,
                    wind: data.current_weather.windspeed,
                    lastUpdate: new Date()
                };
            }
        })
        .catch(() => {});
}, 10 * 60 * 1000); // 10 phút/lần

// ===================================================================
// 9. TIMELINE CHART
// ===================================================================
let timelineChart = null;
function initTimelineChart() {
    const canvas = document.getElementById('timelineChart');
    if (!canvas || typeof Chart === 'undefined') return;

    fetch('/api/events?limit=12')
        .then(r => r.json())
        .then(data => {
            if (!data.success || !Array.isArray(data.events) || data.events.length === 0) {
                canvas.style.background = 'white';
                const ctx = canvas.getContext('2d');
                ctx.font = '18px Inter';
                ctx.fillStyle = '#94a3b8';
                ctx.textAlign = 'center';
                ctx.fillText('Chưa có sự kiện nào để hiển thị', canvas.width/2, canvas.height/2);
                return;
            }

            const events = data.events.slice(0, 10);
            const labels = events.map(e => 
                e.title.length > 20 ? e.title.substring(0, 20) + '...' : e.title
            );

            const durations = events.map(e => {
                const start = new Date(e.start_time);
                const end = new Date(e.end_time || e.start_time);
                return Math.max(5, Math.round((end - start) / 60000)); // ít nhất 5 phút để thấy cột
            });

            if (timelineChart) timelineChart.destroy();

            timelineChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Thời lượng (phút)',
                        data: durations,
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderColor: '#6366f1',
                        borderWidth: 2,
                        borderRadius: 10,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => `${ctx.raw} phút`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { font: { family: 'Inter' } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { 
                                font: { family: 'Inter', size: 12 },
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
        })
        .catch(err => {
            console.error('Lỗi chart:', err);
            canvas.getContext('2d').font = '18px Inter';
            canvas.getContext('2d').fillStyle = '#ef4444';
            canvas.getContext('2d').textAlign = 'center';
            canvas.getContext('2d').fillText('Lỗi tải dữ liệu', canvas.width/2, canvas.height/2);
        });
}

// ===================================================================
// 10. REMINDER + TOAST
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
                        showToast(`Sắp tới: ${ev.title} lúc ${new Date(ev.start_time).toLocaleTimeString('vi-VN')}`);
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
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
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
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ===================================================================
// NOTES:
// ===================================================================
// - Backend cần /api/tasks/today, /api/events/upcoming, /api/stats, /api/search
// - Thêm tags handling nếu cần API
// ===================================================================