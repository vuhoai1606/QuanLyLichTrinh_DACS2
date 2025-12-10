// ===================================================================
// calendar.js - FRONTEND (CHỈ XỬ LÝ UI VÀ GỌI API)
// Backend logic nằm trong controllers/eventController.js
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // TODO: Khởi tạo các chức năng khi trang load
    // loadEvents();
    // initCalendar();
    console.log('Calendar page loaded - Sẵn sàng kết nối với API');
});

// ===================================================================
// CÁC HÀM GỌI API (BACKEND XỬ LÝ LOGIC)
// ===================================================================

/**
 * Lấy danh sách events từ server
 */
async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        const data = await response.json();
        
        if (data.success) {
            // Hiển thị lên calendar
            displayEventsOnCalendar(data.events);
        } else {
            alert('Không thể tải sự kiện');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

/**
 * Lấy events theo khoảng thời gian
 */
async function loadEventsByDateRange(startDate, endDate) {
    try {
        const response = await fetch(`/api/events/range?start_date=${startDate}&end_date=${endDate}`);
        const data = await response.json();
        
        if (data.success) {
            displayEventsOnCalendar(data.events);
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

/**
 * Thêm event mới
 */
async function createEvent(eventData) {
    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Thêm sự kiện thành công!');
            loadEvents(); // Reload calendar
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

/**
 * Cập nhật event
 */
async function updateEvent(eventId, eventData) {
    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Cập nhật thành công!');
            loadEvents();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

/**
 * Xóa event
 */
async function deleteEvent(eventId) {
    if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    
    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Xóa thành công!');
            loadEvents();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra');
    }
}

// ===================================================================
// CÁC HÀM HIỂN THỊ UI (KHÔNG CÓ LOGIC NGHIỆP VỤ)
// ===================================================================

/**
 * Khởi tạo calendar UI
 */
function initCalendar() {
    // TODO: Khởi tạo giao diện calendar
    // Có thể dùng library như FullCalendar.js
}

/**
 * Hiển thị events lên calendar
 */
function displayEventsOnCalendar(events) {
    // TODO: Render events lên UI calendar
    console.log('Hiển thị', events.length, 'sự kiện');
    
    // Ví dụ đơn giản:
    const calendarView = document.getElementById('calendar-view');
    if (!calendarView) return;
    
    events.forEach(event => {
        // Tạo event item trên calendar
        const eventElement = createEventElement(event);
        // Thêm vào calendar
    });
}

/**
 * Tạo HTML element cho event
 */
function createEventElement(event) {
    const div = document.createElement('div');
    div.className = 'calendar-event';
    div.innerHTML = `
        <h4>${event.title}</h4>
        <p>${event.description || ''}</p>
        <span>${formatDateTime(event.start_time)}</span>
    `;
    div.onclick = () => viewEventDetails(event.event_id);
    return div;
}

/**
 * Xem chi tiết event
 */
async function viewEventDetails(eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}`);
        const data = await response.json();
        
        if (data.success) {
            showEventModal(data.event);
        }
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

/**
 * Hiển thị modal chi tiết event
 */
function showEventModal(event) {
    // TODO: Hiển thị popup với thông tin event
    alert(`Event: ${event.title}\n${event.description}`);
}

/**
 * Format datetime
 */
function formatDateTime(dateTime) {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('vi-VN');
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
