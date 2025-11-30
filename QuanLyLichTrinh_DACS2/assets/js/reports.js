// assets/js/reports.js
// ===================================================================
// reports.js - FRONTEND (CHỈ XỬ LÝ UI & GỌI API)
// Tất cả logic tính toán, thống kê nằm ở backend (controllers/reportController.js)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    initReportsPage();
});

/**
 * Khởi tạo toàn bộ trang Reports
 */
function initReportsPage() {
    loadAllCharts();

    // Event listeners
    document.getElementById('create-report')?.addEventListener('click', createReport);
    document.getElementById('print-report')?.addEventListener('click', printReport);
    document.getElementById('email-report')?.addEventListener('click', emailReport);
}

/**
 * Tải và render tất cả các chart
 */
async function loadAllCharts() {
    try {
        // Gọi đồng thời 3 API thống kê
        const [statusRes, weekRes, eventsRes] = await Promise.all([
            fetch('/api/reports/tasks/status'),
            fetch('/api/reports/tasks/week'),
            fetch('/api/reports/events')
        ]);

        // Xử lý JSON song song
        const [statusJson, weekJson, eventsJson] = await Promise.all([
            statusRes.json(),
            weekRes.json(),
            eventsRes.json()
        ]);

        // Render từng chart nếu thành công
        if (statusJson.success && statusJson.data?.length > 0) {
            renderStatusChart(statusJson.data);
        }

        if (weekJson.success && weekJson.data?.length > 0) {
            renderWeekChart(weekJson.data);
        }

        if (eventsJson.success && eventsJson.data?.length > 0) {
            renderEventsChart(eventsJson.data);
        }

    } catch (error) {
        console.error('Lỗi khi tải dữ liệu báo cáo:', error);
        showErrorMessage('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.');
    }
}

/**
 * Render biểu đồ trạng thái task (Doughnut)
 */
function renderStatusChart(data) {
    const labels = data.map(item => {
        const statusMap = {
            'todo': 'Đang làm',
            'in_progress': 'Đang tiến hành',
            'done': 'Hoàn thành',
            'canceled': 'Đã hủy'
        };
        return statusMap[item.status] || item.status;
    });

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Số lượng',
            data: data.map(item => item.count),
            backgroundColor: [
                '#f59e0b', // amber - todo
                '#06b6d4', // cyan - in_progress
                '#10b981', // emerald - done
                '#ef4444'  // red - canceled
            ],
            borderWidth: 2,
            borderColor: '#fff',
            hoverOffset: 12
        }]
    };

    createChart('chart-status', 'doughnut', chartData, {
        plugins: {
            title: { display: true, text: 'Phân bố trạng thái công việc' }
        }
    });
}

/**
 * Render biểu đồ task theo ngày trong tuần (Bar)
 */
function renderWeekChart(data) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const sortedData = data.sort((a, b) => {
        return new Date(a.day) - new Date(b.day);
    });

    const labels = sortedData.map(item => {
        const date = new Date(item.day);
        return days[date.getDay()];
    });

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Số task tạo mới',
            data: sortedData.map(item => item.count),
            backgroundColor: '#3b82f6',
            borderColor: '#1e40af',
            borderWidth: 1,
            borderRadius: 6
        }]
    };

    createChart('chart-week', 'bar', chartData, {
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: {
            title: { display: true, text: 'Công việc tạo mới trong tuần' }
        }
    });
}

/**
 * Render biểu đồ loại sự kiện (Pie)
 */
function renderEventsChart(data) {
    const typeMap = {
        'meeting': 'Cuộc họp',
        'deadline': 'Hạn chót',
        'personal': 'Cá nhân',
        'reminder': 'Nhắc nhở'
    };

    const chartData = {
        labels: data.map(item => typeMap[item.event_type] || item.event_type),
        datasets: [{
            label: 'Số lượng',
            data: data.map(item => item.count),
            backgroundColor: [
                '#8b5cf6', // violet
                '#ec4899', // pink
                '#f59e0b', // amber
                '#14b8a6'  // teal
            ],
            hoverOffset: 10
        }]
    };

    createChart('chart-events', 'pie', chartData, {
        plugins: {
            title: { display: true, text: 'Phân loại sự kiện' }
        }
    });
}

/**
 * Tạo chart chung (tái sử dụng)
 */
function createChart(canvasId, type, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Hủy chart cũ nếu đã tồn tại
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    canvas.chartInstance = new Chart(canvas.getContext('2d'), {
        type,
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1200 },
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20 } },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' },
                ...options.plugins
            },
            ...options
        }
    });
}

/**
 * Tạo báo cáo tổng hợp (PDF/HTML)
 */
async function createReport() {
    if (!confirm('Tạo báo cáo tổng hợp tháng này?')) return;

    try {
        const response = await fetch('/api/reports/create', { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            alert('Tạo báo cáo thành công!');
            if (result.fileUrl) {
                window.open(result.fileUrl, '_blank');
            }
        } else {
            alert(result.message || 'Có lỗi khi tạo báo cáo');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Không thể tạo báo cáo');
    }
}

/**
 * In trang hiện tại
 */
function printReport() {
    window.print();
}

/**
 * Gửi báo cáo qua email
 */
async function emailReport() {
    const emailInput = document.getElementById('report-email');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email) {
        emailInput.focus();
        return alert('Vui lòng nhập địa chỉ email!');
    }

    try {
        const response = await fetch('/api/reports/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (result.success) {
            alert(`Đã gửi báo cáo đến ${email} thành công!`);
            emailInput.value = '';
        } else {
            alert(result.message || 'Gửi thất bại');
        }
    } catch (error) {
        console.error('Lỗi gửi email:', error);
        alert('Không thể gửi email. Vui lòng kiểm tra kết nối.');
    }
}

/**
 * Hiển thị thông báo lỗi chung
 */
function showErrorMessage(msg) {
    const container = document.querySelector('.dashboard-grid');
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'card error';
    errorDiv.innerHTML = `<p>${msg}</p>`;
    container.prepend(errorDiv);

    setTimeout(() => errorDiv.remove(), 8000);
}

// ===================================================================
// NOTES CHO DEVELOPER (BACKEND & FRONTEND)
// ===================================================================
// 1. Các API bắt buộc phải có (response format chuẩn):
//    GET  /api/reports/tasks/status      → { success: true, data: [{ status: 'todo', count: 5 }, ...] }
//    GET  /api/reports/tasks/week        → { success: true, data: [{ day: '2025-11-17', count: 8 }, ...] } (ISO date)
//    GET  /api/reports/events            → { success: true, data: [{ event_type: 'meeting', count: 12 }, ...] }
//
//    POST /api/reports/create            → { success: true, fileUrl: '/downloads/report-202511.pdf' } (hoặc blob)
//    POST /api/reports/email             → { success: true, message: 'Đã gửi' }
//
// 2. Trường hợp không có dữ liệu → backend vẫn trả success: true + data: [] (không trả null)
//
// 3. Chart sẽ tự destroy & recreate khi gọi lại loadAllCharts() → không lo memory leak
//
// 4. Nếu muốn thêm filter theo tháng/năm → chỉ cần thêm query params:
//    /api/reports/tasks/status?month=11&year=2025
//    Frontend hiện tại chưa hỗ trợ filter nhưng dễ mở rộng (thêm <select> tháng/năm)
//
// 5. In báo cáo (printReport) hiện chỉ dùng window.print() → nếu muốn in PDF đẹp:
//    Backend trả về file PDF → frontend mở trong tab mới hoặc dùng jsPDF + html2canvas
//
// 6. Email báo cáo: backend nên đính kèm file PDF (tạo sẵn hoặc tạo on-the-fly)
//
// 7. Thêm loading state (nếu muốn UX tốt hơn):
//    - Thêm spinner overlay khi đang fetch
//    - Disable button khi đang xử lý
//
// 8. Chart colors đã hard-code theo thiết kế hiện tại, nếu muốn thay đổi → chỉnh mảng backgroundColor
//
// 9. Responsive: Chart đã set responsive: true + maintainAspectRatio: false → tự co giãn tốt trên mobile
//
// ===================================================================