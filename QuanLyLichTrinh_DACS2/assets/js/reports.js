// assets/js/reports.js
// ===================================================================
// reports.js - FRONTEND (CHỈ XỬ LÝ UI & GỌI API)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    initReportsPage();
});

let currentMonth = new Date().getMonth() + 1; // Tháng hiện tại (1-12)
let currentYear = new Date().getFullYear();

function initReportsPage() {
    // Khởi tạo giá trị filter mặc định
    document.getElementById('report-month').value = currentMonth;
    document.getElementById('report-year').value = currentYear;

    loadAllCharts();

    // Các nút hành động
    document.getElementById('create-report')?.addEventListener('click', createReport);
    document.getElementById('print-report')?.addEventListener('click', printReport);
    document.getElementById('email-report')?.addEventListener('click', emailReport);
    document.getElementById('download-pdf')?.addEventListener('click', downloadPDF);

    // Nút chuyển đổi Ngày / Tuần / Tháng
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTaskPeriodChart(btn.dataset.period);
        });
    });

    // Filter tháng/năm
    document.getElementById('report-month').addEventListener('change', updateFilter);
    document.getElementById('report-year').addEventListener('change', updateFilter);
}

function updateFilter() {
    currentMonth = parseInt(document.getElementById('report-month').value);
    currentYear = parseInt(document.getElementById('report-year').value);
    loadAllCharts();
}

async function loadAllCharts() {
  try {
    const queryParams = `?month=${currentMonth}&year=${currentYear}`;

    // GỌI TẤT CẢ API CÙNG LÚC ĐỂ TRÁNH LỖI KHỞI TẠO BIẾN
    const [
      statusRes,
      eventsRes,
      productivityRes,
      completedVsCreatedRes,
      topCategoriesRes,
      summaryRes
    ] = await Promise.all([
      fetch('/api/reports/tasks/status'),
      fetch('/api/reports/events' + queryParams),
      fetch('/api/reports/productivity'),
      fetch('/api/reports/completed-vs-created'),
      fetch('/api/reports/top-categories' + queryParams),
      fetch('/api/reports/summary' + queryParams)
    ]);

    // Parse tất cả JSON cùng lúc
    const [
      statusJson,
      eventsJson,
      productivityJson,
      completedVsCreatedJson,
      topCategoriesJson,
      summaryJson
    ] = await Promise.all([
      statusRes.json(),
      eventsRes.json(),
      productivityRes.json(),
      completedVsCreatedRes.json(),
      topCategoriesRes.json(),
      summaryRes.json()
    ]);

    // Render biểu đồ cũ
    if (statusJson.success && statusJson.data?.length > 0) {
      renderStatusChart(statusJson.data);
    }

    if (eventsJson.success && eventsJson.data?.length > 0) {
      renderEventsChart(eventsJson.data);
    }

    await renderTaskPeriodChart('week');

    // Render hiệu suất tuần này
    if (productivityJson.success && productivityJson.data) {
      renderProductivityCard(productivityJson.data);
    } else {
      renderProductivityError();
    }

    // Render Hoàn thành vs Tạo mới
    if (completedVsCreatedJson.success && completedVsCreatedJson.data?.length > 0) {
      renderCompletedVsCreatedChart(completedVsCreatedJson.data);
    } else {
      showEmptyChart('chart-completed-vs-created', 'Chưa có dữ liệu trong 7 ngày gần nhất');
    }

    // Render Top 5 danh mục
    if (topCategoriesJson.success && topCategoriesJson.data?.length > 0) {
      renderTopCategoriesChart(topCategoriesJson.data);
    } else {
      showEmptyChart('chart-top-tags', 'Chưa có danh mục nào trong tháng này');
    }

    // Render Summary Cards
    if (summaryJson.success && summaryJson.data) {
      renderSummaryCards(summaryJson.data);
    } else {
      document.getElementById('summary-total-tasks').textContent = '0';
      document.getElementById('summary-completed-tasks').textContent = '0';
      document.getElementById('summary-events').textContent = '0';
      document.getElementById('summary-completion-rate').textContent = '0%';
    }

  } catch (error) {
    console.error('Lỗi tải dữ liệu báo cáo:', error);
    renderProductivityError();
    showEmptyChart('chart-completed-vs-created', 'Lỗi tải dữ liệu');
    showEmptyChart('chart-top-tags', 'Lỗi tải dữ liệu');
    // Reset summary khi lỗi
    document.getElementById('summary-total-tasks').textContent = '--';
    document.getElementById('summary-completed-tasks').textContent = '--';
    document.getElementById('summary-events').textContent = '--';
    document.getElementById('summary-completion-rate').textContent = '--%';
  }
}

function renderSummaryCards(data) {
  document.getElementById('summary-total-tasks').textContent = data.totalTasks || 0;
  document.getElementById('summary-completed-tasks').textContent = data.completedTasks || 0;
  document.getElementById('summary-events').textContent = data.totalEvents || 0;

  const rate = data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0;
  document.getElementById('summary-completion-rate').textContent = rate + '%';
}

function renderProductivityCard(data) {
  document.getElementById('productivity-score').textContent = data.score || 0;

  const trendEl = document.getElementById('productivity-trend');
  if (data.trend > 0) {
    trendEl.textContent = `+${data.trend} nhiệm vụ so với tuần trước`;
    trendEl.className = 'trend up';
  } else if (data.trend < 0) {
    trendEl.textContent = `${data.trend} nhiệm vụ so với tuần trước`;
    trendEl.className = 'trend down';
  } else {
    trendEl.textContent = 'Bằng tuần trước';
    trendEl.className = 'trend neutral';
  }

  const streakEl = document.getElementById('productivity-streak');
  if (data.streak > 0) {
    streakEl.innerHTML = `<span class="fire">🔥</span> Chuỗi ${data.streak} ngày hoàn thành`;
  } else {
    streakEl.innerHTML = 'Chưa có chuỗi hoàn thành nào';
  }
}

function renderProductivityError() {
  document.getElementById('productivity-score').textContent = '--';
  document.getElementById('productivity-trend').textContent = 'Không thể tải dữ liệu';
  document.getElementById('productivity-trend').className = 'trend neutral';
  document.getElementById('productivity-streak').innerHTML = 'Không thể tải dữ liệu';
}

function renderCompletedVsCreatedChart(data) {
  const labels = data.map(item => item.date);
  const createdData = data.map(item => item.created);
  const completedData = data.map(item => item.completed);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Tạo mới',
        data: createdData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Hoàn thành',
        data: completedData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  createChart('chart-completed-vs-created', 'line', chartData, {
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  });
}

function renderTopCategoriesChart(data) {
  const labels = data.map(item => item.category);
  const counts = data.map(item => item.count);

  const chartData = {
    labels,
    datasets: [{
      label: 'Số lượng',
      data: counts,
      backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#06b6d4']
    }]
  };

  createChart('chart-top-tags', 'bar', chartData, {
    indexAxis: 'y',
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  });
}

/**
 * Render biểu đồ nhiệm vụ theo thời gian (Ngày / Tuần / Tháng)
 */
async function renderTaskPeriodChart(period = 'week') {
    try {
        const response = await fetch(`/api/reports/tasks/by-period?period=${period}`);
        const result = await response.json();

        if (!result.success) {
            showEmptyChart('chart-week', 'Lỗi tải dữ liệu từ server');
            return;
        }

        if (period !== 'day' && (!result.data || result.data.length === 0)) {
            showEmptyChart('chart-week', 'Không có nhiệm vụ nào được tạo trong khoảng thời gian này');
            return;
        }

        let labels = [];
        let dataCounts = [];

        const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

        if (period === 'day') {
            const hours = Array.from({length: 24}, (_, i) => i);
            const dataMap = {};
            (result.data || []).forEach(item => dataMap[item.hour] = item.count);

            labels = hours.map(h => `${h.toString().padStart(2, '0')}:00`);
            dataCounts = hours.map(h => dataMap[h] || 0);

            document.getElementById('chart-week-title').textContent = 'Nhiệm vụ tạo mới hôm nay (theo giờ)';
        }
        else if (period === 'week') {
            const dataMap = {};
            result.data.forEach(item => dataMap[item.day] = item.count);

            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayName = daysOfWeek[date.getDay()];
                labels.push(dayName);
                dataCounts.push(dataMap[dateStr] || 0);
            }

            document.getElementById('chart-week-title').textContent = 'Nhiệm vụ tạo mới trong 7 ngày gần nhất';
        }
        else if (period === 'month') {
            const now = new Date(currentYear, currentMonth - 1, 1);
            const year = now.getFullYear();
            const month = now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const dataMap = {};
            result.data.forEach(item => dataMap[item.day] = item.count);

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                labels.push(`Ngày ${day}`);
                dataCounts.push(dataMap[dateStr] || 0);
            }

            document.getElementById('chart-week-title').textContent = 
                `Nhiệm vụ tạo mới trong ${months[month]} ${year}`;
        }

        const chartData = {
            labels,
            datasets: [{
                label: 'Số nhiệm vụ',
                data: dataCounts,
                backgroundColor: '#3b82f6',
                borderColor: '#1e40af',
                borderWidth: 1,
                borderRadius: 6,
                maxBarThickness: 30
            }]
        };

        createChart('chart-week', 'bar', chartData, {
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: { title: { display: false } }
        });

    } catch (error) {
        console.error('Lỗi render biểu đồ thời gian:', error);
        showEmptyChart('chart-week', 'Không thể tải dữ liệu');
    }
}

function showEmptyChart(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
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
                '#f59e0b',
                '#06b6d4',
                '#10b981',
                '#ef4444'
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
 * Render biểu đồ phân loại sự kiện (Pie)
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
                '#8b5cf6',
                '#ec4899',
                '#f59e0b',
                '#14b8a6'
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
 * Tạo báo cáo (gọi API backend)
 */
async function createReport() {
    if (!confirm('Tạo báo cáo tổng hợp tháng này?')) return;

    try {
        const response = await fetch('/api/reports/create', { method: 'POST' });
        const result = await response.json();

        if (result.success && result.html) {
            const blob = new Blob([result.html], { type: 'text/html' });
            const fileUrl = URL.createObjectURL(blob);
            window.open(fileUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(fileUrl), 10000);
        } else {
            alert(result.message || 'Có lỗi khi tạo báo cáo');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Không thể tạo báo cáo');
    }
}

function printReport() {
    window.print();
}

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

function showErrorMessage(msg) {
    const container = document.querySelector('.dashboard-grid');
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'card error';
    errorDiv.innerHTML = `<p>${msg}</p>`;
    container.prepend(errorDiv);

    setTimeout(() => errorDiv.remove(), 8000);
}

/**
 * Tải báo cáo dưới dạng PDF thật (chuyên nghiệp)
 */
async function downloadPDF() {
  if (!confirm('Tải báo cáo tháng này dưới dạng PDF?')) return;

  try {
    const response = await fetch('/api/reports/download-pdf');

    if (!response.ok) {
      throw new Error('Server error');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao-cao-thang-${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Đã tải PDF thành công!');
  } catch (error) {
    console.error('Lỗi tải PDF:', error);
    alert('Không thể tải PDF. Vui lòng thử lại.');
  }
}