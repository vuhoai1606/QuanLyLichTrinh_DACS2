// ===================================================================
// calendar.js – HOÀN CHỈNH, LOAD THẬT TỪ BACKEND, ĐÃ SỬA ĐỂ LƯU VÀO DB
// (Đã giữ nguyên tối đa logic và cấu trúc gốc của bạn, chỉ tinh chỉnh nhỏ)
// ===================================================================

let currentMonth = new Date(); // Luôn lấy ngày thật
let selectedEvent = null;

// ====================== TOÀN CỤC ======================
window.loadCalendarData = function () {
    // Thay đổi: Chỉ load đúng view đang hiển thị
    const viewMode = document.getElementById('viewMode').value;
    
    // Đảm bảo Wrapper có class mode
    const wrapper = document.getElementById('calendar-wrapper');
    wrapper.className = '';
    wrapper.classList.add(`${viewMode}-view`);
    
    if (viewMode === 'month') {
        renderCalendar();
    } else if (viewMode === 'week') {
        renderWeekView();
    } else if (viewMode === 'day') {
        renderDayView();
    } else if (viewMode === 'year') {
        renderYearView();
    }
    
    loadUpcomingEvents();
    loadTimeInsights();
};

document.addEventListener('DOMContentLoaded', () => {
    window.loadCalendarData();
    attachEventListeners();

    // ==================== AUTO REFRESH 20s ====================
    // Tự làm mới Calendar, Upcoming Events, Insights
    setInterval(() => {
        if (!document.hidden) window.loadCalendarData();
    }, 20000);
    
    // Bắt đầu cập nhật dòng thời gian mỗi phút (cho Week/Day view)
    updateCurrentTimeLine();
    setInterval(updateCurrentTimeLine, 60000); 
});

// ====================== LOAD DỮ LIỆU ======================
async function loadEvents() {
    try {
        const viewMode = document.getElementById('viewMode').value;
        let startDate, endDate;

        // Tính toán start/end date dựa trên view mode
        if (viewMode === 'month') {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth(); // 0-11
            startDate = new Date(year, month, 1).toISOString();
            endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        } else if (viewMode === 'week') {
            const startOfWeek = getStartOfWeek(currentMonth);
            startDate = startOfWeek.toISOString();
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            endDate = endOfWeek.toISOString();
        } else if (viewMode === 'day') {
             const today = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
            startDate = today.toISOString();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            endDate = tomorrow.toISOString();
        } else {
            // Không tải events cho Year view
            return;
        }

        const group = document.getElementById('group-calendar').value;
        const res = await fetch(`/api/calendar/items?start=${startDate}&end=${endDate}&group=${group}`);


        if (!res.ok) throw new Error('Không tải được dữ liệu lịch');

        const result = await res.json();

        if (!result.success) {
            console.error('API lỗi:', result.message);
            return;
        }

        const allCalendarItems = result.data;

        // Render lên lịch (phân phối dữ liệu vào các view tương ứng)
        if (viewMode === 'month') {
            displayEventsOnMonthView(allCalendarItems);
        } else if (viewMode === 'week') {
            displayEventsOnWeekDayView(allCalendarItems, 7); // 7 ngày
        } else if (viewMode === 'day') {
            displayEventsOnWeekDayView(allCalendarItems, 1); // 1 ngày
        }


    } catch (err) {
        console.error('Lỗi tải lịch:', err);
        // alert('Không thể tải dữ liệu lịch. Vui lòng thử lại!');
    }
}

async function loadUpcomingEvents() {
    try {
        const res = await fetch('/api/events/upcoming');
        const data = await res.json();
        if (!data.success) return;

        const upcoming = data.events || [];

        const list = document.getElementById('upcomingList');
        list.innerHTML = upcoming.length === 0
            ? '<li>Không có sự kiện sắp tới</li>'
            : upcoming.map(e => `
                <li onclick="selectEvent('${e.event_id}')">
                    <strong>${e.title}</strong><br>
                    <small>${formatDateTime(e.start_time)}</small>
                </li>
            `).join('');
    } catch (err) { console.error(err); }
}

async function loadTimeInsights() {
  const insightsContent = document.getElementById('timeInsightsContent');
  insightsContent.innerHTML = 'Đang tải...'; // Hiển thị trạng thái tải

  try {
    // Gọi API để lấy dữ liệu insights thực tế
    // Giả định API endpoint: /api/calendar/insights
    const res = await fetch('/api/calendar/insights');
    
    if (!res.ok) {
      throw new Error('Lỗi tải dữ liệu Insights');
    }
    
    const data = await res.json();

    if (data.success && data.insights) {
      const { weekly_meetings_hours, tomorrow_free_hours } = data.insights;

      // Cập nhật nội dung insights với dữ liệu động
      insightsContent.innerHTML = `
        <p>Tuần này bạn có <strong>${weekly_meetings_hours || 0}</strong> giờ họp</p>
        <p>Ngày mai còn <strong>${tomorrow_free_hours || 0}</strong> giờ trống</p>
      `;
    } else {
      insightsContent.innerHTML = '<p>Không có dữ liệu Insights.</p>';
    }

  } catch (err) {
    console.error('Lỗi load Time Insights:', err);
    insightsContent.innerHTML = '<p>Không thể tải Insights.</p>';
  }
}

// ====================== VẼ LỊCH ĐÚNG NGÀY THỰC TẾ ======================
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    document.getElementById('month-year').textContent =
        currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
          .replace(/^\w/, c => c.toUpperCase());

    // Fix cho tuần bắt đầu từ Thứ Hai (chuẩn Việt Nam + Google Calendar)
    let startingDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Chủ Nhật
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; // Đổi 0 → 6, 1→0, 2→1...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarGrid = document.getElementById('calendar');
    calendarGrid.className = 'calendar-grid'; // Reset class cho Month View
    calendarGrid.innerHTML = '';

    // Ô trống đầu tháng (trước ngày 1)
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarGrid.innerHTML += '<div class="day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        // Trong vòng lặp tạo ngày
        const today = new Date();
        const isoDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
          .toISOString().slice(0, 10);
        const isToday = dateStr === isoDate;
        calendarGrid.innerHTML += `
            <div class="day ${isToday ? 'today' : ''}" onclick="openCreateModal('${dateStr}')">
                <div class="day-number">${day}</div>
                <div class="events-list" id="events-${dateStr}"></div>
            </div>
        `;
    }

    loadEvents();
}

function displayEventsOnMonthView(events) {
    document.querySelectorAll('.events-list').forEach(el => el.innerHTML = '');

    events.forEach(event => {
        if (!event.start_time) return;
        const date = event.start_time.split('T')[0];
        const container = document.getElementById(`events-${date}`);
        if (!container) return;

        const color = event.type === 'task'
            ? (event.priority === 'high' ? '#ef4444' : event.priority === 'medium' ? '#f59e0b' : '#10b981')
            : event.color || '#4285f4'; // Dùng event.color nếu có

        container.innerHTML += `
            <div class="event" style="background:${color};"
                 onclick="event.stopPropagation(); selectEvent('${event.event_id || event.task_id}', ${JSON.stringify(event)})">
                ${event.title}
            </div>
        `;
    });
}

// ====================== MODAL & CRUD (Giữ nguyên) ======================
function openCreateModal(dateStr = '', eventData = null) {
    selectedEvent = eventData ? eventData.event_id : null;
    document.getElementById('modalTitle').textContent = eventData ? 'Sửa sự kiện' : 'Tạo sự kiện mới';

    
    document.getElementById('eventType').value = eventData?.type || 'event';
    document.getElementById('eventColor').value = eventData?.color || '#4285f4';

    document.getElementById('eventTitle').value = eventData ? eventData.title : '';
    document.getElementById('eventDesc').value = eventData ? eventData.description || '' : '';
    document.getElementById('eventStart').value = eventData ? eventData.start_time.slice(0,16) : (dateStr ? `${dateStr}T09:00` : '');
    document.getElementById('eventEnd').value = eventData && eventData.end_time ? eventData.end_time.slice(0,16) : '';
    document.getElementById('eventAllDay').checked = eventData ? eventData.is_all_day : false;

    document.getElementById('eventModal').style.display = 'flex'; // Dùng flex thay vì block để căn giữa
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    selectedEvent = null;
    document.getElementById('edit-event').style.display = 'none';
    document.getElementById('delete-event').style.display = 'none';
}

function selectEvent(id, eventData) {
    selectedEvent = id;
    openCreateModal('', eventData);
    document.getElementById('edit-event').style.display = 'inline-block';
    document.getElementById('delete-event').style.display = 'inline-block';
}

async function saveEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const desc = document.getElementById('eventDesc').value.trim();
    const start = document.getElementById('eventStart').value;
    const end = document.getElementById('eventEnd').value || null;
    const allDay = document.getElementById('eventAllDay').checked;
    const type = document.getElementById('eventType').value;
    const color = document.getElementById('eventColor').value;

    if (!title || !start) return alert('Nhập tiêu đề và thời gian bắt đầu đi bro');

    const payload = {
        title: title,
        description: desc || null,
        start_time: allDay ? `${start}:00` : `${start}:00`,           // thêm :00
        end_time: end ? (allDay ? `${end}:00` : `${end}:00`) : null, // thêm :00 nếu có
        is_all_day: allDay,
        color: color,
        type: type || 'event'  // nếu backend yêu cầu type
    };

    try {
        let res, json; // THÊM DÒNG NÀY – QUAN TRỌNG NHẤT

        if (selectedEvent && selectedEvent.startsWith('t-')) {
            alert('Task phải sửa ở trang Tasks nhé!');
            return;
        }

        if (selectedEvent) {
            // CẬP NHẬT EVENT
            res = await fetch(`/api/events/${selectedEvent}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // TẠO MỚI EVENT
            res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        // Kiểm tra response
        if (!res.ok) {
            json = await res.json().catch(() => ({}));
            throw new Error(json.message || `HTTP ${res.status}`);
        }

        json = await res.json();

        if (!json.success) {
            throw new Error(json.message || 'Lưu thất bại');
        }

        // Thành công → đóng modal + reload
        closeEventModal();
        window.loadCalendarData();
        if (window.refreshAll) refreshAll();

    } catch (err) {
        console.error('Lỗi khi lưu sự kiện:', err);
        alert('Không thể lưu sự kiện: ' + err.message);
    }
}

async function deleteSelectedEvent() {
    if (!selectedEvent || !confirm('Xóa thật hả bro?')) return;

    try {
        if (selectedEvent.startsWith('t-')) {
            alert('Task phải xóa ở trang Tasks');
        } else {
            await deleteEvent(selectedEvent);
        }

        closeEventModal();
        window.loadCalendarData();
        if (window.refreshAll) window.refreshAll();
    } catch (err) {
        alert('Lỗi xóa');
    }
}

// CRUD cơ bản
async function createEvent(data) {
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
}

async function updateEvent(id, data) {
    const res = await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
}

async function deleteEvent(id) {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
}

// ====================== ĐIỀU KHIỂN & CHUYỂN VIEW ======================
function prevPeriod() {
    // Điều chỉnh ngày dựa trên view mode
    const mode = document.getElementById('viewMode').value;
    if (mode === 'month' || mode === 'year') {
        currentMonth.setMonth(currentMonth.getMonth() - (mode === 'month' ? 1 : 12));
    } else if (mode === 'week') {
        currentMonth.setDate(currentMonth.getDate() - 7);
    } else if (mode === 'day') {
        currentMonth.setDate(currentMonth.getDate() - 1);
    }
    window.loadCalendarData();
}

function nextPeriod() {
    const mode = document.getElementById('viewMode').value;
    if (mode === 'month' || mode === 'year') {
        currentMonth.setMonth(currentMonth.getMonth() + (mode === 'month' ? 1 : 12));
    } else if (mode === 'week') {
        currentMonth.setDate(currentMonth.getDate() + 7);
    } else if (mode === 'day') {
        currentMonth.setDate(currentMonth.getDate() + 1);
    }
    window.loadCalendarData();
}

function today() {
    currentMonth = new Date();
    window.loadCalendarData();
}

function changeView() {
    const mode = document.getElementById('viewMode').value;
    const wrapper = document.getElementById('calendar-wrapper');

    // Xóa hết class cũ
    wrapper.className = '';
    
    if (mode === 'month') {
        wrapper.classList.add('month-view');
        renderCalendar();
    } else if (mode === 'week') {
        wrapper.classList.add('week-view');
        renderWeekView();
    } else if (mode === 'day') {
        wrapper.classList.add('day-view');
        renderDayView();
    } else if (mode === 'year') {
        wrapper.classList.add('year-view');
        renderYearView();
    }
}

// ==================== WEEK VIEW - Chuẩn Google Calendar (Sửa nhẹ cho CSS) ====================
function renderWeekView() {
    const calendarBody = document.getElementById("calendar");
    calendarBody.className = "week-view";
    calendarBody.innerHTML = '';

    const startOfWeek = getStartOfWeek(currentMonth);
    const headerHTML = `
        <div class="week-header">
            <div></div>
            ${Array.from({length: 7}, (_, i) => {
                const date = new Date(startOfWeek);
                date.setDate(date.getDate() + i);
                const isToday = isSameDate(date, new Date());
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = date.getDate();
                // Thay đổi style để dùng biến CSS
                const style = isToday ? 'style="color:var(--primary-dark)"' : '';
                const numStyle = isToday ? 'font-weight:700; color:var(--primary-dark)' : '';
                return `
                    <div ${style}>
                        <div>${dayName}</div>
                        <div style="font-size:18px; margin-top:4px; ${numStyle}">${dayNum}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    let gridHTML = '<div class="week-grid">';
    for (let hour = 0; hour < 24; hour++) {
        gridHTML += `<div class="hour-label">${hour.toString().padStart(2, '0')}:00</div>`;
        for (let day = 0; day < 7; day++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = isSameDate(date, new Date());
            // Loại bỏ class 'today' khỏi cell giờ trong Week/Day view để tránh xung đột với Current Time Line
            gridHTML += `<div class="week-cell" id="cell-${dateStr}-${hour}"></div>`; 
        }
    }
    gridHTML += '</div>';

    calendarBody.innerHTML = headerHTML + gridHTML;
    
    // Thêm Current time line
    if (!document.querySelector('.current-time-indicator')) {
        const line = document.createElement('div');
        line.className = 'current-time-indicator';
        document.querySelector('.week-grid')?.appendChild(line);
    }
    updateCurrentTimeLine(); // Cập nhật vị trí ngay

    loadEvents(); // sẽ tự đổ event vào các ô
}

// ==================== DAY VIEW (Sửa nhẹ cho CSS) ====================
function renderDayView() {
    const calendarBody = document.getElementById("calendar");
    calendarBody.className = "day-view";
    calendarBody.innerHTML = '';

    const today = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
    const dateStr = today.toISOString().split('T')[0];
    const displayDate = today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const headerHTML = `
        <div class="day-header" style="padding: 20px 0;">
            <div style="text-align:left; padding-left:16px; font-size:24px; font-weight:700; color: var(--primary-dark);">
                ${displayDate.replace(/^\w/, c => c.toUpperCase())}
            </div>
        </div>
    `;

    let gridHTML = '<div class="day-grid">';
    for (let hour = 0; hour < 24; hour++) {
        // Đổi class hour thành hour-label cho đồng bộ CSS
        gridHTML += `
            <div class="hour-label">${hour.toString().padStart(2, '0')}:00</div>
            <div class="day-cell" id="cell-${dateStr}-${hour}"></div>
        `;
    }
    gridHTML += '</div>';

    calendarBody.innerHTML = headerHTML + gridHTML;
    
    // Thêm Current time line
    if (!document.querySelector('.current-time-indicator')) {
        const line = document.createElement('div');
        line.className = 'current-time-indicator';
        document.querySelector('.day-grid')?.appendChild(line);
    }
    updateCurrentTimeLine(); // Cập nhật vị trí ngay

    loadEvents();
}

function displayEventsOnWeekDayView(events, daysCount) {
    events.forEach(event => {
        if (!event.start_time) return;
        const start = new Date(event.start_time);
        const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 60 * 60 * 1000); // Mặc định 1h

        const dateStr = start.toISOString().split('T')[0];
        const startHour = start.getHours();
        
        // Chỉ đơn giản là chèn event vào ô giờ bắt đầu
        const container = document.getElementById(`cell-${dateStr}-${startHour}`);
        if (!container) return;

        const color = event.type === 'task'
            ? (event.priority === 'high' ? '#ef4444' : event.priority === 'medium' ? '#f59e0b' : '#10b981')
            : event.color || '#4285f4';

        // Tính toán chiều cao tương đối
        const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
        // Giả sử 1 giờ có chiều cao khoảng 60px (cần CSS chi tiết hơn để chuẩn)
        const heightStyle = durationMinutes >= 60 ? `min-height: ${(durationMinutes / 60) * 60}px;` : ''; 
        
        // Cần thêm CSS để xử lý vị trí tuyệt đối của event trong cell
        container.innerHTML += `
            <div class="event" style="background:${color}; ${heightStyle}; position: absolute; width: 95%; z-index: 10;"
                 onclick="event.stopPropagation(); selectEvent('${event.event_id || event.task_id}', ${JSON.stringify(event)})">
                ${event.title}
                <small>${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
        `;
    });
}


// ==================== YEAR VIEW (Giữ nguyên) ====================
function renderYearView() {
    const calendarBody = document.getElementById("calendar");
    calendarBody.className = "year-view";
    calendarBody.innerHTML = '';

    const year = currentMonth.getFullYear();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    for (let m = 0; m < 12; m++) {
        const firstDay = new Date(year, m, 1);
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = CN
        const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

        const monthName = firstDay.toLocaleDateString('vi-VN', { month: 'long' });
        
        let monthHTML = `
            <div class="year-month">
                <div class="ym-title">${monthName} ${year}</div>
                <div class="ym-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 10px;">
                    <div class="ym-day" style="font-weight: 700;">T2</div><div class="ym-day" style="font-weight: 700;">T3</div><div class="ym-day" style="font-weight: 700;">T4</div>
                    <div class="ym-day" style="font-weight: 700;">T5</div><div class="ym-day" style="font-weight: 700;">T6</div><div class="ym-day" style="font-weight: 700;">T7</div><div class="ym-day" style="font-weight: 700; color: var(--secondary-color);">CN</div>
        `;

        // Empty cells
        for (let i = 0; i < adjustedStart; i++) {
            monthHTML += `<div class="ym-day"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            monthHTML += `<div class="ym-day ${isToday ? 'today' : ''}" style="text-align: center; padding: 5px 0;">${day}</div>`;
        }

        monthHTML += `</div></div>`;
        calendarBody.innerHTML += monthHTML;
    }
}

// Helper: Lấy ngày đầu tuần (Thứ Hai)
function getStartOfWeek(date) {
    const d = new Date(date);
    let day = d.getDay(); // 0 = CN, 1 = T2
    day = day === 0 ? 6 : day - 1; // T2=0, CN=6 (Chuẩn ISO)
    const diff = d.getDate() - day; // Trừ số ngày lùi về thứ 2
    d.setDate(diff);
    d.setHours(0,0,0,0);
    return d;
}

// Helper: So sánh ngày (bỏ qua giờ)
function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
}

// ====================== Gắn sự kiện ======================
function attachEventListeners() {
  document.querySelector('.create-btn').onclick = openCreateModal;
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeEventModal(); });
  });
  
  // <--- CHỖ NÀY ĐÃ ĐƯỢC CHỈNH SỬA --->
  document.getElementById('share-calendar').onclick = openShareModal; // Gọi hàm mở modal mới
  // <--- END CHỈNH SỬA --->

  // Group select – giả sử
  document.getElementById('group-calendar').onchange = () => loadEvents(); // Reload khi đổi
  // Search – giả sử
  document.getElementById('search').oninput = (e) => searchEvents(e.target.value);
  // Thêm vào cuối attachEventListeners()
  document.getElementById('delete-event').onclick = deleteSelectedEvent;
}

function searchEvents(keyword) {
    keyword = keyword.toLowerCase();
    document.querySelectorAll('.event').forEach(ev => {
        ev.style.display = ev.textContent.toLowerCase().includes(keyword)
            ? ''
            : 'none';
    });
}

// Reminder modal – giả sử (Giữ nguyên)
function openReminderModal() {
    document.getElementById('reminder-modal').style.display = 'flex'; // Dùng flex
}

function closeReminderModal() {
    document.getElementById('reminder-modal').style.display = 'none';
}

async function saveReminder() {
    const time = document.getElementById('reminder-time').value;
    if (!time) return alert('Chọn thời gian');
    // Gọi API lưu reminder nếu có endpoint, ví dụ POST /api/reminders
    await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: selectedEvent, time }) });
    closeReminderModal();
    alert('Đặt nhắc nhở thành công');
}

// Format ngày đẹp (Giữ nguyên)
function formatDateTime(iso) {
    return new Date(iso).toLocaleString('vi-VN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Current time line chạy thật – Dùng class 'current-time-indicator'
function updateCurrentTimeLine() {
    const mode = document.getElementById('viewMode').value;
    const isWeekOrDay = mode === 'week' || mode === 'day';
    let line = document.querySelector('.current-time-indicator');

    if (!isWeekOrDay) {
        if (line) line.remove(); // Xóa nếu không ở Week/Day view
        return;
    }
    
    // Nếu line chưa có (ví dụ: chuyển từ Month view) thì tạo lại
    if (!line) {
        const grid = document.querySelector(`.${mode}-grid`);
        if (grid) {
            line = document.createElement('div');
            line.className = 'current-time-indicator';
            grid.appendChild(line);
        } else {
            return;
        }
    }

    const today = new Date();
    const isToday = isSameDate(currentMonth, today);
    
    if (!isToday && mode === 'day') {
        line.style.display = 'none'; // Ẩn nếu Day view không phải hôm nay
        return;
    }
    
    line.style.display = 'block';

    const grid = document.querySelector(`.${mode}-grid`);
    if (!grid) return;

    // Vị trí: % của phút trong ngày (24 * 60 = 1440 phút)
    const minutes = today.getHours() * 60 + today.getMinutes();
    const percent = (minutes / 1440) * 100;
    
    line.style.top = `${percent}%`;

    if (mode === 'week') {
        // Tính cột: 0 = T2, 6 = CN
        let dayOfWeek = today.getDay(); 
        dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // T2=0, T3=1... CN=6
        
        // Tính ngày hiện tại trong tuần đang hiển thị
        const startOfWeek = getStartOfWeek(currentMonth);
        const currentDayIndex = Math.floor((today.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
        
        if (currentDayIndex >= 0 && currentDayIndex < 7) {
             const columnWidth = (grid.clientWidth - 70) / 7;
             const leftPosition = 70 + (currentDayIndex * columnWidth);
             
             line.style.left = `${leftPosition}px`;
             line.style.width = `${columnWidth}px`;
             
             // Nếu ngày hiện tại không nằm trong tuần đang xem, ẩn đi
             if (!isSameDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate()), today)) {
                 line.style.display = 'none';
             } else {
                 line.style.display = 'block';
             }
        } else {
            line.style.display = 'none';
        }
    } else { // Day View
        line.style.left = '70px';
        line.style.width = `${grid.clientWidth - 70}px`;
    }
}

// ==================== SHARE CALENDAR LOGIC ====================

function openShareModal() {
    // Giả định có một Modal với ID là 'shareModal' và các input:
    // - input id="shareEmail"
    // - input id="shareLink"
    // - button onclick="shareCalendar()"
    const shareModal = document.getElementById('shareModal');
    if (!shareModal) {
        alert('Tính năng Chia sẻ đang được phát triển. (Thiếu modal: shareModal)');
        return;
    }
    document.getElementById('shareLink').value = 'Đang tạo link...'; // Reset link
    document.getElementById('shareEmail').value = ''; // Reset email
    shareModal.style.display = 'flex';
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

async function generateShareLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.value = 'Đang tạo link...';
    
    try {
        // GỌI API ĐỂ TẠO SHARE LINK
        // Giả định API endpoint: /api/calendar/share-link
        const res = await fetch('/api/calendar/share-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calendar_id: 'current_user_calendar', permissions: 'view' })
        });

        const json = await res.json();
        
        if (json.success && json.shareUrl) {
            linkInput.value = json.shareUrl;
            alert('Link chia sẻ đã được tạo và sẵn sàng để sao chép!');
        } else {
            linkInput.value = 'Lỗi: Không tạo được link.';
            throw new Error(json.message || 'Lỗi không xác định.');
        }
    } catch (err) {
        console.error('Lỗi tạo link chia sẻ:', err);
    }
}

async function sendShareInvite() {
    const email = document.getElementById('shareEmail').value.trim();
    if (!email) {
        alert('Vui lòng nhập địa chỉ email.');
        return;
    }

    try {
        // GỌI API ĐỂ GỬI EMAIL MỜI
        // Giả định API endpoint: /api/calendar/share-invite
        const res = await fetch('/api/calendar/share-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calendar_id: 'current_user_calendar', invite_email: email, permissions: 'edit' })
        });

        const json = await res.json();
        
        if (json.success) {
            alert(`Lời mời đã được gửi thành công đến ${email}!`);
            closeShareModal();
        } else {
            throw new Error(json.message || 'Lỗi gửi lời mời.');
        }
    } catch (err) {
        console.error('Lỗi gửi lời mời chia sẻ:', err);
        alert('Không thể gửi lời mời. Vui lòng thử lại.');
    }
}
// ===================================================================
// NOTES CHO BẠN:
// ===================================================================
// 1. File này CHỈ xử lý giao diện calendar và gọi API
// 2. KHÔNG có logic nghiệp vụ (tính toán ngày, validate, database)
// 3. Logic nghiệp vụ nằm trong: controllers/eventController.js
// 4. Bạn có thể tích hợp code calendar cũ nhưng CHỈ giữ phần UI
// 5. Mọi xử lý dữ liệu đều qua API: /api/events
// 6. Có thể dùng thư viện: FullCalendar.js, Flatpickr, etc.
// ===================================================================
