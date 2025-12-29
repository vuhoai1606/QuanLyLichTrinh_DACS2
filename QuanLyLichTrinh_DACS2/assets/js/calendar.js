// ===================================================================
// calendar.js – PHIÊN BẢN HOÀN CHỈNH, SẠCH ĐẸP NHẤT (12/2025) + RECURRING EVENTS
// ===================================================================

let currentMonth = new Date();
let selectedEvent = null;
let allCalendarItems = [];

// ====================== NAVIGATION ======================
function prevPeriod() {
    const viewMode = document.getElementById('viewMode').value;
    if (viewMode === 'month') currentMonth.setMonth(currentMonth.getMonth() - 1);
    else if (viewMode === 'week' || viewMode === 'day') currentMonth.setDate(currentMonth.getDate() - (viewMode === 'week' ? 7 : 1));
    else if (viewMode === 'year') currentMonth.setFullYear(currentMonth.getFullYear() - 1);
    window.loadCalendarData();
}

function nextPeriod() {
    const viewMode = document.getElementById('viewMode').value;
    if (viewMode === 'month') currentMonth.setMonth(currentMonth.getMonth() + 1);
    else if (viewMode === 'week' || viewMode === 'day') currentMonth.setDate(currentMonth.getDate() + (viewMode === 'week' ? 7 : 1));
    else if (viewMode === 'year') currentMonth.setFullYear(currentMonth.getFullYear() + 1);
    window.loadCalendarData();
}

function today() {
    currentMonth = new Date();
    window.loadCalendarData();
}

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
    if (searchInput) searchInput.oninput = () => window.filterAndDisplayEvents();

    const groupSelect = document.getElementById('group-calendar');
    if (groupSelect) groupSelect.onchange = loadEvents;

    document.getElementById('share-calendar')?.addEventListener('click', openShareModal);
    document.getElementById('delete-event')?.addEventListener('click', deleteSelectedEvent);
    document.querySelector('.create-btn')?.addEventListener('click', openCreateModal);

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeEventModal();
        });
    });
}

// ====================== MAIN ======================
window.loadCalendarData = function () {
    const viewMode = document.getElementById('viewMode')?.value || 'month';
    const wrapper = document.getElementById('calendar-wrapper');
    if (wrapper) {
        wrapper.className = '';
        wrapper.classList.add(`${viewMode}-view`);
    }

    if (viewMode === 'month') renderCalendar();
    else if (viewMode === 'week') renderWeekView();
    else if (viewMode === 'day') renderDayView();
    else if (viewMode === 'year') renderYearView();

    loadEvents();
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
async function loadEvents() {
    try {
        const viewMode = document.getElementById('viewMode')?.value || 'month';
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

        const group = document.getElementById('group-calendar')?.value || 'personal';
        const res = await fetch(`/api/calendar/items?start=${startDate}&end=${endDate}&group=${group}`);

        if (!res.ok) throw new Error('Failed to load events');

        const { success, data } = await res.json();
        if (!success || !Array.isArray(data)) return;

        window.allCalendarItems = data.map(item => ({
            ...item,
            type: item.type === 'task' ? 'task' : 'event',
            category: item.calendar_type || item.category || (item.type === 'task' ? 'Work' : 'Personal')
        }));

        console.log(`📅 Loaded ${allCalendarItems.length} items (${allCalendarItems.filter(i => i.type === 'task').length} tasks)`);

        if (viewMode === 'month') {
            renderCalendar();
        }

        window.filterAndDisplayEvents();

    } catch (err) {
        console.error('Load events error:', err);
    }
}

// ====================== FILTER & DISPLAY ======================
window.filterAndDisplayEvents = function () {
    const viewMode = document.getElementById('viewMode')?.value || 'month';

    if (viewMode === 'week' || viewMode === 'day') {
        const checkedBoxes = document.querySelectorAll('#event-categories input[type="checkbox"]:checked');
        const activeCategories = Array.from(checkedBoxes).map(cb => cb.value);

        const searchInput = document.getElementById('search');
        const keyword = (searchInput?.value || '').trim().toLowerCase();

        const filtered = allCalendarItems.filter(item => {
            const cat = item.category || (item.type === 'task' ? 'Work' : 'Personal');
            if (activeCategories.length > 0 && !activeCategories.includes(cat)) return false;

            if (keyword) {
                const inTitle = item.title?.toLowerCase().includes(keyword) || false;
                const inDesc = item.description?.toLowerCase().includes(keyword) || false;
                if (!inTitle && !inDesc) return false;
            }
            return true;
        });

        displayEventsOnWeekDayView(filtered);
    }
};

// ====================== RENDER VIEWS ======================
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthYearEl = document.getElementById('month-year');
    if (monthYearEl) {
        monthYearEl.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    let startDay = new Date(year, month, 1).getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.getElementById('calendar');
    if (!grid) return;
    grid.className = 'calendar-grid';
    grid.innerHTML = '';

    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === '2025-12-29';

        const dayDiv = document.createElement('div');
        dayDiv.className = `day ${isToday ? 'today special-today' : ''}`;
        dayDiv.onclick = () => openCreateModal(dateStr);

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);

        renderItemsForDay(dateStr, dayDiv);

        grid.appendChild(dayDiv);
    }

    if (year === 2025 && month === 11) {
        document.querySelectorAll('.day').forEach(el => {
            if (el.querySelector('.day-number')?.textContent === '29') {
                el.style.background = 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)';
                el.style.color = 'white';
                el.querySelector('.day-number').style.color = 'white';
                el.querySelectorAll('.calendar-item strong, .calendar-item small').forEach(txt => txt.style.color = 'white');
            }
        });
    }
}

// ====================== RENDER ITEMS CHO MỖI NGÀY ======================
function renderItemsForDay(dayDateStr, dayElement) {
    const dayEvents = allCalendarItems.filter(item => {
        if (!item.start) return false;
        
        let itemDateStr = '';
        try {
            const date = new Date(item.start);
            if (!isNaN(date.getTime())) {
                itemDateStr = date.toISOString().split('T')[0];
            }
        } catch (e) {}

        if (!itemDateStr && typeof item.start === 'string') {
            itemDateStr = item.start.trim().split(' ')[0].split('T')[0];
        }

        if (!itemDateStr && typeof item.start === 'string' && item.start.length >= 10) {
            itemDateStr = item.start.substring(0, 10);
        }

        return itemDateStr === dayDateStr;
    });

    if (dayEvents.length === 0) return;

    const ul = document.createElement('ul');
    ul.className = 'event-list';

    dayEvents.slice(0, 4).forEach(item => {
        const li = document.createElement('li');
        li.className = 'calendar-item';

        const baseColor = item.type === 'task'
            ? (item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#10b981')
            : (item.color || '#6366f1');

        li.style.backgroundColor = baseColor + '22';
        li.style.borderLeft = `4px solid ${baseColor}`;

        const icon = item.type === 'task' ? '📌' : '🗓️';

        const timeText = item.type === 'task'
            ? (item.priority ? `<small style="color:#6b7280;">${item.priority.toUpperCase()}</small>` : '')
            : (item.start ? `<small style="color:#6b7280;">${formatTime(item.start)}</small>` : '');

        const title = item.title || 'No title';
        const shortTitle = title.length > 18 ? title.substring(0, 18) + '...' : title;

        li.innerHTML = `
            <div style="font-size:11px;line-height:1.3;">
                <strong style="color:var(--text-dark);font-size:12px;">${icon} ${escapeHtml(shortTitle)}</strong>
                ${timeText}
            </div>
        `;

        li.onclick = e => {
            e.stopPropagation();
            selectEvent(item.id || item.event_id || item.task_id, item);
        };

        ul.appendChild(li);
    });

    if (dayEvents.length > 4) {
        const more = document.createElement('li');
        more.className = 'more-items';
        more.style.fontSize = '11px';
        more.style.color = '#6b7280';
        more.textContent = `+ ${dayEvents.length - 4} more`;
        ul.appendChild(more);
    }

    dayElement.appendChild(ul);
}

// ====================== WEEK / DAY VIEW ======================
function renderWeekView() {
    const calendarBody = document.getElementById("calendar");
    if (!calendarBody) return;
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
    for (let h = 0; h < 24; h++) {
        grid += `<div class="hour-label">${String(h).padStart(2,'0')}:00</div>`;
        for (let d = 0; d < 7; d++) {
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
    if (!calendarBody) return;
    calendarBody.className = "day-view";
    calendarBody.innerHTML = '';

    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
    const dateStr = date.toISOString().split('T')[0];
    const display = date.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});

    const header = `<div class="day-header"><div style="padding-left:16px;font-size:24px;font-weight:700;color:var(--primary-dark)">${display}</div></div>`;
    let grid = '<div class="day-grid">';
    for (let h = 0; h < 24; h++) {
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
        el.style.cssText = `background:${color};${height ? `min-height:${height};` : ''}position:absolute;width:95%;z-index:10`;
        el.innerHTML = `${ev.title}<small>${start.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</small>`;
        el.onclick = e => { e.stopPropagation(); selectEvent(ev.event_id || ev.task_id, ev); };
        cell.appendChild(el);
    });
}

// ====================== YEAR VIEW ======================
function renderYearView() {
    const grid = document.getElementById('calendar');
    if (!grid) return;
    grid.className = 'year-view';
    grid.innerHTML = '';

    const year = currentMonth.getFullYear();
    const today = new Date();

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    for (let m = 0; m < 12; m++) {
        const first = new Date(year, m, 1);
        const days = new Date(year, m + 1, 0).getDate();
        let startDay = first.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1;

        let html = `<div class="ym-title">${months[m]} ${year}</div><div class="ym-grid">`;
        "MTWTFSS".split('').forEach((d,i) => {
            const color = i < 5 ? 'var(--primary-color)' : 'var(--secondary-color)';
            html += `<div class="ym-day" style="font-weight:700;color:${color}">${d}</div>`;
        });

        for (let i = 0; i < startDay; i++) html += '<div class="ym-day empty"></div>';
        for (let d = 1; d <= days; d++) {
            const date = new Date(year, m, d);
            const isToday = isSameDate(date, today);
            html += `<div class="ym-day ${isToday ? 'today' : ''}">${d}</div>`;
        }
        html += '</div>';
        grid.innerHTML += `<div class="year-month">${html}</div>`;
    }
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

// ====================== MODAL & CRUD (CÓ RECURRING) ======================
function openCreateModal(dateStr = '', eventData = null) {
    const preset = typeof dateStr === 'string' && dateStr ? dateStr : '';

    selectedEvent = eventData ? (eventData.event_id || eventData.task_id || eventData.id) : null;

    document.getElementById('modalTitle').textContent = eventData ? 'Edit Event' : 'Create New Event';
    document.getElementById('eventType').value = eventData?.type || 'event';
    document.getElementById('eventCalendar').value = eventData?.calendar_type || 'Personal';
    document.getElementById('eventTitle').value = eventData?.title || '';
    document.getElementById('eventDesc').value = eventData?.description || '';

    const startVal = eventData?.start_time ? eventData.start_time.slice(0,16) : (preset ? `${preset}T09:00` : '');
    document.getElementById('eventStart').value = startVal;

    const endVal = eventData?.end_time ? eventData.end_time.slice(0,16) : '';
    document.getElementById('eventEnd').value = endVal;

    // === RECURRING OPTIONS ===
    const repeatSelect = document.getElementById('repeatSelect');
    if (repeatSelect) {
        repeatSelect.value = eventData?.recurrence ? 'custom' : 'none'; // nếu có recurrence thì mặc định custom
        toggleRepeatOptions(repeatSelect.value);
    }

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

// === RECURRING UI LOGIC ===
function toggleRepeatOptions(value) {
    const customOptions = document.getElementById('customRepeatOptions');
    if (!customOptions) return;

    customOptions.style.display = value === 'custom' ? 'block' : 'none';

    if (value !== 'custom') {
        document.getElementById('repeatInterval').value = '1';
        document.getElementById('repeatEndDate').value = '';
        document.querySelectorAll('#weekdayCheck input').forEach(cb => cb.checked = false);
    }
}

async function saveEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const desc = document.getElementById('eventDesc').value.trim();
    const start = document.getElementById('eventStart').value;
    const end = document.getElementById('eventEnd').value || null;
    const type = document.getElementById('eventType').value;
    const calendar = document.getElementById('eventCalendar').value;

    if (!title || !start) {
        alert('Title and start time required');
        return;
    }

    let payload = {
        title,
        description: desc || null,
        start_time: `${start}:00`,
        end_time: end ? `${end}:00` : null,
        is_all_day: false,
        calendar_type: calendar
    };

    // === XỬ LÝ RECURRING ===
    const repeatSelect = document.getElementById('repeatSelect');
    if (repeatSelect && repeatSelect.value !== 'none') {
        try {
            const freqMap = {
                daily: RRule.DAILY,
                weekly: RRule.WEEKLY,
                monthly: RRule.MONTHLY,
                yearly: RRule.YEARLY
            };

            let ruleOptions = {
                freq: freqMap[repeatSelect.value] || RRule.WEEKLY,
                dtstart: new Date(start)
            };

            if (repeatSelect.value === 'custom') {
                const interval = parseInt(document.getElementById('repeatInterval').value) || 1;
                if (interval > 0) ruleOptions.interval = interval;

                const endRepeat = document.getElementById('repeatEndDate').value;
                if (endRepeat) {
                    ruleOptions.until = new Date(endRepeat);
                }

                const weekdays = [];
                document.querySelectorAll('#weekdayCheck input:checked').forEach(cb => {
                    const dayMap = {
                        sun: RRule.SU,
                        mon: RRule.MO,
                        tue: RRule.TU,
                        wed: RRule.WE,
                        thu: RRule.TH,
                        fri: RRule.FR,
                        sat: RRule.SA
                    };
                    if (dayMap[cb.value]) weekdays.push(dayMap[cb.value]);
                });
                if (weekdays.length > 0) ruleOptions.byweekday = weekdays;
            }

            const rule = new RRule(ruleOptions);
            const rruleStr = rule.toString().substring(rule.toString().indexOf('RRULE:'));

            payload.recurrence = [rruleStr];
        } catch (err) {
            console.error('Lỗi generate RRULE:', err);
            alert('Lỗi khi tạo lịch lặp lại. Vui lòng thử lại.');
            return;
        }
    }

    try {
        let url = '/api/events';
        let method = 'POST';
        if (selectedEvent && !String(selectedEvent).startsWith('t-')) {
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
    if (String(selectedEvent).startsWith('t-')) return alert('Delete tasks in Tasks page');

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
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso) {
    return new Date(iso).toLocaleString('en-US', {weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
}

function updateCurrentTimeLine() {
    const mode = document.getElementById('viewMode')?.value;
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

    const now = new Date();
    const isTodayInView = (mode === 'day')
        ? isSameDate(currentMonth, now)
        : getStartOfWeek(currentMonth) <= now && now < new Date(getStartOfWeek(currentMonth).getTime() + 7*24*60*60*1000);

    if (mode === 'day' && !isTodayInView) {
        line.style.display = 'none';
        return;
    }

    line.style.display = 'block';
    const percent = (now.getHours()*60 + now.getMinutes()) / 1440 * 100;
    line.style.top = `${percent}%`;

    if (mode === 'week') {
        const currentDay = Math.floor((now - getStartOfWeek(currentMonth)) / 86400000);
        const colWidth = (document.querySelector('.week-grid')?.clientWidth - 70) / 7 || 100;
        line.style.left = `${70 + currentDay * colWidth}px`;
        line.style.width = `${colWidth}px`;
    } else {
        line.style.left = '70px';
        line.style.width = `${document.querySelector('.day-grid')?.clientWidth - 70}px`;
    }
}

// ====================== UPCOMING EVENTS & INSIGHTS ======================
async function loadUpcomingEvents() {
    try {
        const res = await fetch('/api/events/upcoming');
        const { success, events = [] } = await res.json();
        const ul = document.getElementById('upcomingList');
        if (!ul) return;

        ul.innerHTML = events.length === 0
            ? '<li>No upcoming events</li>'
            : events.map(e => `<li onclick="selectEvent('${e.event_id}')"><strong>${escapeHtml(e.title)}</strong><br><small>${formatDateTime(e.start_time)}</small></li>`).join('');
    } catch (e) {
        console.error('Load upcoming events error:', e);
    }
}

async function loadTimeInsights() {
    const el = document.getElementById('timeInsightsContent');
    if (!el) return;
    el.innerHTML = 'Loading...';
    try {
        const res = await fetch('/api/calendar/insights');
        const { success, insights } = await res.json();
        if (success && insights) {
            el.innerHTML = `
                <p>This week <strong>${insights.weekly_meetings_hours || 0}</strong> meeting hours</p>
                <p>Tomorrow <strong>${insights.tomorrow_free_hours || 0}</strong> free hours</p>
            `;
        } else el.innerHTML = '<p>No data</p>';
    } catch (e) {
        el.innerHTML = '<p>Load failed</p>';
    }
}

// Thêm vào cuối calendar.js
document.getElementById('repeatSelect')?.addEventListener('change', function() {
  const label = document.getElementById('intervalLabel');
  if (!label) return;
  const value = this.value;
  if (value === 'daily') label.textContent = 'ngày';
  else if (value === 'weekly') label.textContent = 'tuần';
  else if (value === 'monthly') label.textContent = 'tháng';
  else if (value === 'yearly') label.textContent = 'năm';
  else label.textContent = 'tuần';
});