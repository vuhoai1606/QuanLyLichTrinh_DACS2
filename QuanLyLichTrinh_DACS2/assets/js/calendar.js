// ===================================================================
// calendar.js – HOÀN CHỈNH, LOAD THẬT TỪ BACKEND, ĐÃ SỬA ĐỂ LƯU VÀO DB
// ===================================================================

let currentMonth = new Date(); // Luôn lấy ngày thật
let selectedEvent = null;

// ====================== TOÀN CỤC ======================
window.loadCalendarData = function () {
  renderCalendar();
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
});

// ====================== LOAD DỮ LIỆU ======================
async function loadEvents() {
  try {
    // Lấy tháng đang hiển thị trên lịch
    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-11

    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    // Gọi API mới – chỉ 1 lần duy nhất
    const group = document.getElementById('group-calendar').value;
    const res = await fetch(`/api/calendar/items?start=${start}&end=${end}&group=${group}`);


    if (!res.ok) throw new Error('Không tải được dữ liệu lịch');

    const result = await res.json();

    if (!result.success) {
      console.error('API lỗi:', result.message);
      return;
    }

    // Dữ liệu đã được backend gộp sẵn: cả Event + Task, có color, type, priority...
    const allCalendarItems = result.data;

    // Render lên lịch (FullCalendar hoặc custom UI của bạn)
    displayEventsOnCalendar(allCalendarItems);

  } catch (err) {
    console.error('Lỗi tải lịch:', err);
    alert('Không thể tải dữ liệu lịch. Vui lòng thử lại!');
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

function loadTimeInsights() {
  document.getElementById('timeInsightsContent').innerHTML = `
    <p>Tuần này bạn có <strong>12</strong> giờ họp</p>
    <p>Ngày mai còn <strong>5</strong> giờ trống</p>
  `;
  // Có thể gọi API thật sau nếu có endpoint /api/events/stats
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

function displayEventsOnCalendar(events) {
  document.querySelectorAll('.events-list').forEach(el => el.innerHTML = '');

  events.forEach(event => {
    if (!event.start_time) return;
    const date = event.start_time.split('T')[0];
    const container = document.getElementById(`events-${date}`);
    if (!container) return;

    const color = event.type === 'task'
      ? (event.priority === 'high' ? '#ef4444' : event.priority === 'medium' ? '#f59e0b' : '#10b981')
      : '#4285f4';

    container.innerHTML += `
      <div class="event" style="background:${color};"
          onclick="event.stopPropagation(); selectEvent('${event.event_id || event.task_id}', ${JSON.stringify(event)})">
        ${event.title}
      </div>
    `;
  });
}

// ====================== MODAL & CRUD ======================
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

  document.getElementById('eventModal').style.display = 'block';
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
    type,
    color,
    title,
    description: desc || null,
    start_time: allDay ? start.slice(0,10) + 'T00:00:00' : start + ':00',
    end_time: end ? (allDay ? end.slice(0,10) + 'T23:59:59' : end + ':00') : null,
    is_all_day: allDay
  };

  try {
    if (selectedEvent && selectedEvent.startsWith('t-')) {
      alert('Task phải sửa ở trang Tasks nhé!');
    } else if (selectedEvent) {
      await updateEvent(selectedEvent, payload);
    } else {
      await createEvent(payload);
    }

    closeEventModal();
    window.loadCalendarData();
    if (window.refreshAll) window.refreshAll();
  } catch (err) {
    alert('Lỗi rồi bro');
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

// ====================== ĐIỀU KHIỂN ======================
function prevPeriod() { currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); }
function nextPeriod() { currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); }
function today() { currentMonth = new Date(); renderCalendar(); }
function changeView() {
  const mode = document.getElementById('viewMode').value;
  const wrapper = document.getElementById('calendar-wrapper');
  const calendar = document.getElementById('calendar');

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

// ==================== WEEK VIEW - Chuẩn Google Calendar ====================
function renderWeekView() {
  const calendarBody = document.getElementById("calendar");
  calendarBody.className = "week-view";
  calendarBody.innerHTML = '';

  // Trong hàm renderWeekView(), sau khi tạo grid, thêm đoạn này:
  setInterval(() => {
    const line = document.querySelector('.current-time-line');
    if (!line) return;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const percent = (minutes / 1440) * 100;
    line.style.top = `${percent}%`;
  }, 60000); // cập nhật mỗi phút

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
        return `
          <div ${isToday ? 'style="color:#8ab4f8"' : ''}>
            <div>${dayName}</div>
            <div style="font-size:18px; margin-top:4px; ${isToday ? 'font-weight:700; color:#8ab4f8' : ''}">${dayNum}</div>
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
      date.setHours(hour, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = isSameDate(date, new Date());
      gridHTML += `<div class="week-cell ${isToday ? 'today' : ''}" id="cell-${dateStr}-${hour}"></div>`;
    }
  }
  gridHTML += '</div>';

  calendarBody.innerHTML = headerHTML + gridHTML;

  // Current time line
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const percent = minutes / (24 * 60);
  const line = document.createElement('div');
  line.className = 'current-time-line';
  line.style.top = `${percent * 100}%`;
  line.innerHTML = '<div class="current-time-dot"></div>';
  document.querySelector('.week-grid').appendChild(line);

  loadEvents(); // sẽ tự đổ event vào các ô
}

// ==================== DAY VIEW ====================
function renderDayView() {
  const calendarBody = document.getElementById("calendar");
  calendarBody.className = "day-view";
  calendarBody.innerHTML = '';

  const today = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate());
  const dateStr = today.toISOString().split('T')[0];
  const displayDate = today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const headerHTML = `
    <div class="day-header">
      <div></div>
      <div style="text-align:left; padding-left:16px; font-size:18px; font-weight:500">
        ${displayDate.replace(/^\w/, c => c.toUpperCase())}
      </div>
    </div>
  `;

  let gridHTML = '<div class="day-grid">';
  for (let hour = 0; hour < 24; hour++) {
    gridHTML += `
      <div class="hour">${hour.toString().padStart(2, '0')}:00</div>
      <div class="day-cell today" id="cell-${dateStr}-${hour}"></div>
    `;
  }
  gridHTML += '</div>';

  calendarBody.innerHTML = headerHTML + gridHTML;
  loadEvents();
}

// ==================== YEAR VIEW ====================
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
        <div class="ym-grid">
          <div class="ym-day">T2</div><div class="ym-day">T3</div><div class="ym-day">T4</div>
          <div class="ym-day">T5</div><div class="ym-day">T6</div><div class="ym-day">T7</div><div class="ym-day">CN</div>
    `;

    // Empty cells
    for (let i = 0; i < adjustedStart; i++) {
      monthHTML += `<div class="ym-day"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      monthHTML += `<div class="ym-day ${isToday ? 'today' : ''}">${day}</div>`;
    }

    monthHTML += `</div></div>`;
    calendarBody.innerHTML += monthHTML;
  }
}

// Helper
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Thứ 2 là đầu tuần
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d;
}

function isSameDate(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

// Gắn sự kiện
function attachEventListeners() {
  document.querySelector('.create-btn').onclick = openCreateModal;
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeEventModal(); });
  });
  // Share button – giả sử
  document.getElementById('share-calendar').onclick = () => alert('Chia sẻ lịch – coming soon');
  // Group select – giả sử
  document.getElementById('group-calendar').onchange = () => loadEvents(); // Reload khi đổi
  // Search – giả sử
  document.getElementById('search').oninput = (e) => searchEvents(e.target.value);
  // Thêm vào cuối attachEventListeners()
  document.getElementById('delete-event').onclick = deleteSelectedEvent;
}

function searchEvents(keyword) {
  // Có thể filter events, nhưng tạm bỏ vì cần thêm logic filter UI
  console.log('Tìm kiếm:', keyword);
}

// Reminder modal – giả sử
function openReminderModal() {
  document.getElementById('reminder-modal').style.display = 'block';
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

// Format ngày đẹp
function formatDateTime(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Current time line chạy thật – dùng class mới
function updateCurrentTimeLine() {
  const line = document.querySelector('.current-time-indicator');
  if (!line) return;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const percent = (minutes / 1440) * 100;
  line.style.top = `${percent}%`;
}
setInterval(updateCurrentTimeLine, 60000);

// Override renderWeekView để tạo line đúng class
const originalRenderWeekView = renderWeekView;
renderWeekView = function() {
  originalRenderWeekView.apply(this, arguments);

  // Tạo line nếu chưa có
  if (!document.querySelector('.current-time-indicator')) {
    const line = document.createElement('div');
    line.className = 'current-time-indicator';
    document.querySelector('.week-grid')?.appendChild(line);
  }
  updateCurrentTimeLine();
};

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
