// ===================================================================
// calendar.js – PHIÊN BẢN HOÀN CHỈNH, SẠCH ĐẸP NHẤT (12/2025)
// ===================================================================

//Khai báo trạng thái ngày
let currentMonth = new Date();
let selectedEvent = null;
let allCalendarItems = [];

// ====================== NAVIGATION ======================

//Hàm điều hướng cho thời gian lùi lại
function prevPeriod() {
    const viewMode = document.getElementById('viewMode').value;
    if (viewMode === 'month') {
        currentMonth.setMonth(currentMonth.getMonth() - 1); // Điều chỉnh tháng
    } else if (viewMode === 'week' || viewMode === 'day') {
        currentMonth.setDate(currentMonth.getDate() - (viewMode === 'week' ? 7 : 1)); // Điều chỉnh ngày
    } else if (viewMode === 'year') {
        currentMonth.setFullYear(currentMonth.getFullYear() - 1); // Điều chỉnh năm
    }
    window.loadCalendarData(); // Tải lại dữ liệu
}

//Hàm điều hướng cho thời gian tiến lên
function nextPeriod() {
    const viewMode = document.getElementById('viewMode').value;
    if (viewMode === 'month') {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
    } else if (viewMode === 'week' || viewMode === 'day') {
        currentMonth.setDate(currentMonth.getDate() + (viewMode === 'week' ? 7 : 1));
    } else if (viewMode === 'year') {
        currentMonth.setFullYear(currentMonth.getFullYear() + 1);
    }
    window.loadCalendarData();
}

// Chuyển về ngày hôm nay
function today() {
    currentMonth = new Date(); // Reset về ngày thực tế
    window.loadCalendarData();
}

// Thay đổi chế độ xem (month, week, day, year)
function changeView() {
    currentMonth = new Date(); 
    window.loadCalendarData();
}

// ====================== DOM LISTENERS ======================
function attachEventListeners() {
    document.querySelectorAll('#event-categories input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', window.filterAndDisplayEvents);
    });

    const searchInput = document.getElementById('search');
    if (searchInput) searchInput.oninput = e => window.filterAndDisplayEvents(e.target.value);

    const groupSelect = document.getElementById('group-calendar');
    if (groupSelect) groupSelect.onchange = loadEvents;

    document.getElementById('share-calendar').onclick = openShareModal;
    document.getElementById('delete-event').onclick = deleteSelectedEvent;
    document.querySelector('.create-btn').onclick = openCreateModal;

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeEventModal();
        });
    });
}

// ====================== MAIN ======================
window.loadCalendarData = function () {
    const viewMode = document.getElementById('viewMode').value;
    const wrapper = document.getElementById('calendar-wrapper');
    if (wrapper) {
        wrapper.className = '';
        wrapper.classList.add(`${viewMode}-view`);
    }

    if (viewMode === 'month') renderCalendar();
    else if (viewMode === 'week') renderWeekView();
    else if (viewMode === 'day') renderDayView();
    else if (viewMode === 'year') renderYearView();

    loadUpcomingEvents();
    loadTimeInsights();
};

document.addEventListener('DOMContentLoaded', () => {
    window.loadCalendarData();
    attachEventListeners();
    updateCurrentTimeLine();
    setInterval(updateCurrentTimeLine, 60000);
});

// ====================== LOAD DATA ======================
//Gọi API trong load events
async function loadEvents() {
    try {
        const viewMode = document.getElementById('viewMode').value;
        let startDate, endDate;

        if (viewMode === 'month') {
            const y = currentMonth.getFullYear();
            const m = currentMonth.getMonth();
            startDate = new Date(y, m, 1).toISOString();
            endDate = new Date(y, m + 1, 0, 23, 59, 59).toISOString(); 
        } else if (viewMode === 'week') {
            const startOfWeek = getStartOfWeek(currentMonth);
            startDate = startOfWeek.toISOString();
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            endDate = endOfWeek.toISOString();
        } else if (viewMode === 'day') {
            const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
            startDate = d.toISOString();
            const tomorrow = new Date(d);
            tomorrow.setDate(d.getDate() + 1);
            endDate = tomorrow.toISOString();
        } else {
            return;
        }

        //tính toán startDate, endDate
        const group = document.getElementById('group-calendar').value;
        const res = await fetch(`/api/calendar/items?start=${startDate}&end=${endDate}&group=${group}`);

        if (!res.ok) throw new Error('Failed to load events');

        const { success, data } = await res.json();
        if (!success) return;

        // Chuẩn hóa dữ liệu từ API và lưu vào biến toàn cục
        window.allCalendarItems = data.map(item => ({
            ...item,
            type: item.type === 'task' ? 'task' : 'event',
            category: item.calendar_type || item.category || (item.type === 'task' ? 'Work' : 'Personal')
        }));

        window.filterAndDisplayEvents();

    } catch (err) {
        console.error('Load events error:', err);
    }
}

// ====================== FILTER & DISPLAY ======================
window.filterAndDisplayEvents = function (searchQuery = null) {
    const viewMode = document.getElementById('viewMode').value;
    const checkedBoxes = document.querySelectorAll('#event-categories input[type="checkbox"]:checked');
    const activeCategories = Array.from(checkedBoxes).map(cb => cb.value);
    const keyword = (searchQuery ?? document.getElementById('search').value).toLowerCase();

    const filtered = allCalendarItems.filter(item => {
        const cat = item.category || (item.type === 'task' ? 'Work' : 'Personal');
        if (!activeCategories.includes(cat)) return false;

        if (keyword) {
            const inTitle = item.title?.toLowerCase().includes(keyword);
            const inDesc = item.description?.toLowerCase().includes(keyword);
            if (!inTitle && !inDesc) return false;
        }
        return true;
    });

    if (viewMode === 'month') displayEventsOnMonthView(filtered);
    else if (viewMode === 'week' || viewMode === 'day') displayEventsOnWeekDayView(filtered);
    // Year view không hiển thị event
};

// ====================== RENDER VIEWS ======================
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    document.getElementById('month-year').textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let startDay = new Date(year, month, 1).getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.getElementById('calendar');
    grid.className = 'calendar-grid';
    grid.innerHTML = '';

    for (let i = 0; i < startDay; i++) grid.innerHTML += '<div class="day empty"></div>';

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const todayISO = new Date().toISOString().slice(0,10);
        const isToday = dateStr === todayISO;

        grid.innerHTML += `
            <div class="day ${isToday ? 'today' : ''}" onclick="openCreateModal('${dateStr}')">
                <div class="day-number">${day}</div>
                <div class="events-list" id="events-${dateStr}"></div>
            </div>`;
    }
    loadEvents();
}

function displayEventsOnMonthView(events) {
    document.querySelectorAll('.events-list').forEach(el => el.innerHTML = '');

    events.forEach(ev => {
        if (!ev.start) return;
        const date = ev.start.split('T')[0];
        const box = document.getElementById(`events-${date}`);
        if (!box) return;

        const color = ev.type === 'task'
            ? (ev.priority === 'high' ? '#ef4444' : ev.priority === 'medium' ? '#f59e0b' : '#10b981')
            : ev.color || '#4285f4';

        const eventEl = document.createElement('div');
        eventEl.className = 'event';
        eventEl.style.background = color;
        eventEl.textContent = ev.title;
        eventEl.onclick = e => {
            e.stopPropagation();
            selectEvent(ev.event_id || ev.task_id, ev);
        };
        box.appendChild(eventEl);
    });
}

function renderWeekView() {
    const calendarBody = document.getElementById("calendar");
    calendarBody.className = "week-view";
    calendarBody.innerHTML = '';

    const startOfWeek = getStartOfWeek(currentMonth);

    const header = `
        <div class="week-header">
            <div></div>
            ${Array.from({length:7}, (_,i) => {
                const d = new Date(startOfWeek);
                d.setDate(d.getDate() + i);
                const isToday = isSameDate(d, new Date());
                const dayName = d.toLocaleDateString('en-US', {weekday:'short'});
                const dayNum = d.getDate();
                return `
                    <div style="${isToday ? 'color:var(--primary-dark)' : ''}">
                        <div>${dayName}</div>
                        <div style="font-size:18px;margin-top:4px;font-weight:${isToday?'700':''};color:${isToday?'var(--primary-dark)':''}">${dayNum}</div>
                    </div>`;
            }).join('')}
        </div>`;

    let grid = '<div class="week-grid">';
    for (let h=0; h<24; h++) {
        grid += `<div class="hour-label">${String(h).padStart(2,'0')}:00</div>`;
        for (let d=0; d<7; d++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + d);
            const dateStr = date.toISOString().split('T')[0];
            grid += `<div class="week-cell" id="cell-${dateStr}-${h}"></div>`;
        }
    }
    grid += '</div>';

    calendarBody.innerHTML = header + grid;

    if (!document.querySelector('.current-time-indicator')) {
        const line = document.createElement('div');
        line.className = 'current-time-indicator';
        document.querySelector('.week-grid')?.appendChild(line);
    }
    updateCurrentTimeLine();
    loadEvents();
}

function renderDayView() {
    const calendarBody = document.getElementById("calendar");
    calendarBody.className = "day-view";
    calendarBody.innerHTML = '';

    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
    const dateStr = date.toISOString().split('T')[0];
    const display = date.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});

    const header = `<div class="day-header"><div style="padding-left:16px;font-size:24px;font-weight:700;color:var(--primary-dark)">${display}</div></div>`;
    let grid = '<div class="day-grid">';
    for (let h=0; h<24; h++) {
        grid += `<div class="hour-label">${String(h).padStart(2,'0')}:00</div>`;
        grid += `<div class="day-cell" id="cell-${dateStr}-${h}"></div>`;
    }
    grid += '</div>';

    calendarBody.innerHTML = header + grid;

    if (!document.querySelector('.current-time-indicator')) {
        const line = document.createElement('div');
        line.className = 'current-time-indicator';
        document.querySelector('.day-grid')?.appendChild(line);
    }
    updateCurrentTimeLine();
    loadEvents();
}

function renderYearView() {
    const grid = document.getElementById('calendar');
    grid.className = 'year-view';
    grid.innerHTML = '';

    const year = currentMonth = currentMonth.getFullYear();
    const today = new Date();

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    for (let m=0; m<12; m++) {
        const first = new Date(year, m, 1);
        const days = new Date(year, m+1, 0).getDate();
        let startDay = first.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1;

        let html = `<div class="ym-title">${months[m]} ${year}</div><div class="ym-grid">`;
        "MTWTFSS".split('').forEach((d,i) => {
            const color = i < 5 ? 'var(--primary-color)' : 'var(--secondary-color)';
            html += `<div class="ym-day" style="font-weight:700;color:${color}">${d}</div>`;
        });

        for (let i=0; i<startDay; i++) html += '<div class="ym-day empty"></div>';
        for (let d=1; d<=days; d++) {
            const date = new Date(year, m, d);
            const isToday = isSameDate(date, today);
            html += `<div class="ym-day ${isToday ? 'today' : ''}">${d}</div>`;
        }
        html += '</div>';
        grid.innerHTML += `<div class="year-month">${html}</div>`;
    }
}

function displayEventsOnWeekDayView(events) {
    events.forEach(ev => {
        if (!ev.start) return;
        const start = new Date(ev.start);
        const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 3600000);
        const dateStr = start.toISOString().split('T')[0];
        const hour = start.getHours();

        const cell = document.getElementById(`cell-${dateStr}-${hour}`);
        if (!cell) return;

        const color = ev.type === 'task'
            ? (ev.priority === 'high' ? '#ef4444' : ev.priority === 'medium' ? '#f59e0b' : '#10b981')
            : ev.color || '#4285f4';

        const durationMin = (end - start) / 60000;
        const height = durationMin >= 60 ? `${(durationMin/60)*60}px` : '';

        const el = document.createElement('div');
        el.className = 'event';
        el.style.cssText = `background:${color};${height?`min-height:${height};`:''}position:absolute;width:95%;z-index:10`;
        el.innerHTML = `${ev.title}<small>${start.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</small>`;
        el.onclick = e => { e.stopPropagation(); selectEvent(ev.event_id || ev.task_id, ev); };
        cell.appendChild(el);
    });
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    d.setDate(diff);
    d.setHours(0,0,0,0);
    return d;
}

function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// ====================== MODAL & CRUD ======================
// 
function openCreateModal(dateStr = '', eventData = null) {
    let preset = (typeof dateStr === 'string' && dateStr) ? dateStr : '';

    selectedEvent = eventData ? (eventData.event_id || eventData.task_id || eventData.id) : null;

    document.getElementById('modalTitle').textContent = eventData ? 'Edit Event' : 'Create New Event';
    document.getElementById('eventType').value = eventData?.type || 'event';
    document.getElementById('eventCalendar').value = eventData?.calendar_type || 'Personal';
    document.getElementById('eventTitle').value = eventData?.title || '';
    document.getElementById('eventDesc').value = eventData?.description || '';

    const startVal = eventData?.start ? eventData.start.slice(0,16) : (preset ? `${preset}T09:00` : '');
    document.getElementById('eventStart').value = startVal;
    document.getElementById('eventEnd').value = eventData?.end ? eventData.end.slice(0,16) : '';

    document.getElementById('eventModal').style.display = 'flex';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    selectedEvent = null;
}

function selectEvent(id, data) {
    selectedEvent = id;
    openCreateModal('', data);
}

//Lưu thông tin khi người dùng tạo mới sự kiện
async function saveEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const desc = document.getElementById('eventDesc').value.trim();
    const start = document.getElementById('eventStart').value;
    const end = document.getElementById('eventEnd').value || null;
    const type = document.getElementById('eventType').value;
    const calendar = document.getElementById('eventCalendar').value;
    const color = document.querySelector(`#eventCalendar option[value="${calendar}"]`)?.dataset.color || '#4285f4';

    if (!title || !start) return alert('Title and start time required');

    const payload = {
        title, description: desc || null,
        start_time: `${start}:00`,
        end_time: end ? `${end}:00` : null,
        is_all_day: false,
        color,
        type,
        calendar_type: calendar
    };

    try {
        let url = '/api/events';
        let method = 'POST';
        if (selectedEvent && !selectedEvent.startsWith('t-')) {
            url += `/${selectedEvent}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Save failed');

        // Refresh data
        loadEvents();
        loadUpcomingEvents();
        loadTimeInsights();
        closeEventModal();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function deleteSelectedEvent() {
    if (!selectedEvent || !confirm('Delete this event?')) return;
    if (selectedEvent.startsWith('t-')) return alert('Delete tasks in Tasks page');

    try {
        await fetch(`/api/events/${selectedEvent}`, { method: 'DELETE' });
        loadEvents();
        loadUpcomingEvents();
        closeEventModal();
    } catch (err) {
        alert('Delete failed');
    }
}

// ====================== SHARE MODAL ======================
function openShareModal() {
    document.getElementById('shareLink').value = 'Generating link...';
    document.getElementById('shareEmail').value = '';
    document.getElementById('shareModal').style.display = 'flex';
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

// Gọi API tạo link chia sẻ
async function generateShareLink() {
    const input = document.getElementById('shareLink');
    input.value = 'Generating...';
    try {
        const res = await fetch('/api/calendar/share-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calendar_id: 'current_user_calendar', permissions: 'view' })
        });
        const json = await res.json();
        if (json.success && json.shareUrl) {
            input.value = json.shareUrl;
            input.select();
            // Sao chép vào clipboard
            navigator.clipboard.writeText(json.shareUrl);
            alert('Link copied!');
        } else throw new Error('Failed');
    } catch (err) {
        input.value = 'Error';
        alert('Failed to generate link');
    }
}

async function sendShareInvite() {
    const email = document.getElementById('shareEmail').value.trim();
    if (!email) return alert('Enter email');
    try {
        const res = await fetch('/api/calendar/share-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calendar_id: 'current_user_calendar', invite_email: email, permissions: 'edit' })
        });
        const json = await res.json();
        if (json.success) {
            alert(`Invite sent to ${email}`);
            closeShareModal();
        } else throw new Error(json.message);
    } catch (err) {
        alert('Send failed');
    }
}

// ====================== UTILS ======================
function formatDateTime(iso) {
    return new Date(iso).toLocaleString('en-US', {weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
}

// Cập nhật dòng thời gian hiện tại trong week/day view
function updateCurrentTimeLine() {
    const mode = document.getElementById('viewMode').value;
    if (!['week','day'].includes(mode)) {
        document.querySelectorAll('.current-time-indicator').forEach(el => el.remove());
        return;
    }

    let line = document.querySelector('.current-time-indicator');
    if (!line) {
        line = document.createElement('div');
        line.className = 'current-time-indicator';
        document.querySelector(`.${mode}-grid`)?.appendChild(line);
    }

    // Tính vị trí dòng thời gian
    const now = new Date();
    const isTodayInView = (mode === 'day') 
        ? isSameDate(currentMonth, now)
        : getStartOfWeek(currentMonth) <= now && now < new Date(getStartOfWeek(currentMonth).getTime() + 7*24*60*60*1000);

    if (mode === 'day' && !isTodayInView) {
        line.style.display = 'none';
        return;
    }

    line.style.display = 'block';
    const percent = (now.getHours()*60 + now.getMinutes()) / 1440 * 100; // Tính phần trăm trong ngày
    line.style.top = `${percent}%`;

    if (mode === 'week') {
        const dayIndex = (now.getDay() + 6) % 7; // Monday = 0
        const startWeek = getStartOfWeek(currentMonth); // Lấy ngày bắt đầu tuần
        const currentDay = Math.floor((now - startWeek) / 86400000); // Tính ngày hiện tại trong tuần
        const colWidth = (document.querySelector('.week-grid').clientWidth - 70) / 7; // Trừ phần label giờ
        line.style.left = `${70 + currentDay * colWidth}px`; // Cộng phần label giờ
        line.style.width = `${colWidth}px`; // Chỉ rộng bằng một cột
    } else {
        line.style.left = '70px'; // Bắt đầu sau phần label giờ
        line.style.width = `${document.querySelector('.day-grid').clientWidth - 70}px`; // Chiếm toàn bộ phần còn lại
    }
}

// ====================== UPCOMING EVENTS & INSIGHTS ======================
// Tải danh sách sự kiện sắp tới
async function loadUpcomingEvents() {
    try {
        const res = await fetch('/api/events/upcoming'); 
        const { success, events = [] } = await res.json();
        const ul = document.getElementById('upcomingList'); // Ul danh sách
        ul.innerHTML = events.length === 0 // Hiển thị nếu không có sự kiện
            ? '<li>No upcoming events</li>' // Cập nhật danh sách sự kiện
            : events.map(e => `<li onclick="selectEvent('${e.event_id}')"><strong>${e.title}</strong><br><small>${formatDateTime(e.start_time)}</small></li>`).join(''); // Tạo các mục danh sách
    } catch (e) {}
}

// Tải thông tin tổng quan thời gian
async function loadTimeInsights() {
    const el = document.getElementById('timeInsightsContent'); // Phần hiển thị thông tin
    if (!el) return;
    el.innerHTML = 'Loading...'; // Hiển thị trạng thái tải
    try {
        const res = await fetch('/api/calendar/insights');
        const { success, insights } = await res.json(); // Phân tích phản hồi
        if (success && insights) {
            el.innerHTML = `
                <p>This week <strong>${insights.weekly_meetings_hours || 0}</strong> meeting hours</p>
                <p>Tomorrow <strong>${insights.tomorrow_free_hours || 0}</strong> free hours</p>
            `;
        } else el.innerHTML = '<p>No data</p>'; 
    } catch (e) { el.innerHTML = '<p>Load failed</p>'; }
}