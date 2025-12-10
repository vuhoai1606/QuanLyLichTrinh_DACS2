// ===================================
// ADMIN DASHBOARD JAVASCRIPT
// ===================================

console.log('👑 Admin dashboard loaded!');

// Global state for dashboard charts
let userActivityChart = null;
let userStatusChart = null;

// ===================================
// HELPER FUNCTIONS (Được lặp lại trong mỗi file)
// ===================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


// ===================================
// DASHBOARD FUNCTIONS
// ===================================

function initDashboard(activityData, overviewData) {
  console.log('📊 Initializing dashboard...');
  
  // Init Activity Chart (Line Chart)
  const activityCtx = document.getElementById('userActivityChart');
  if (activityCtx && activityData && activityData.length > 0) {
    const labels = activityData.map(d => new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
    const data = activityData.map(d => parseInt(d.new_users));
    
    userActivityChart = new Chart(activityCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Người dùng mới',
          data: data,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
  
  // Init Status Chart (Doughnut Chart)
  const statusCtx = document.getElementById('userStatusChart');
  if (statusCtx && overviewData) {
    userStatusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Hoạt động', 'Đã khóa'],
        datasets: [{
          data: [overviewData.active_users || 0, overviewData.banned_users || 0],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

async function refreshDashboard() {
  console.log('🔄 Refreshing dashboard...');
  try {
    const res = await fetch('/admin/api/dashboard');
    const data = await res.json();
    
    if (data.success) {
      // Update stats
      document.getElementById('total-users').textContent = data.data.overview.total_users || 0;
      document.getElementById('active-users').textContent = data.data.overview.active_users || 0;
      document.getElementById('new-users').textContent = data.data.overview.new_users_last_7_days || 0;
      document.getElementById('total-admins').textContent = data.data.overview.total_admins || 0;
      document.getElementById('banned-users').textContent = data.data.overview.banned_users || 0;
      document.getElementById('total-tasks').textContent = data.data.overview.total_tasks || 0;
      document.getElementById('total-events').textContent = data.data.overview.total_events || 0;
      document.getElementById('total-messages').textContent = data.data.overview.total_messages || 0;
      
      // Update charts
      if (userActivityChart) {
        const labels = data.data.activityStats.map(d => new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
        const chartData = data.data.activityStats.map(d => parseInt(d.new_users));
        userActivityChart.data.labels = labels;
        userActivityChart.data.datasets[0].data = chartData;
        userActivityChart.update();
      }
      
      if (userStatusChart) {
        userStatusChart.data.datasets[0].data = [data.data.overview.active_users, data.data.overview.banned_users];
        userStatusChart.update();
      }
    }
  } catch (error) {
    console.error('❌ Error refreshing dashboard:', error);
    showToast('Lỗi tải dữ liệu', 'error');
  }
}

async function updateChart(days) {
  try {
    const res = await fetch(`/admin/api/stats/activity?days=${days}`);
    const data = await res.json();
    
    if (data.success && userActivityChart) {
      const labels = data.stats.map(d => new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
      const chartData = data.stats.map(d => parseInt(d.new_users));
      userActivityChart.data.labels = labels;
      userActivityChart.data.datasets[0].data = chartData;
      userActivityChart.update();
    }
  } catch (error) {
    console.error('❌ Error updating chart:', error);
  }
}

// Khai báo toàn cục
window.initDashboard = initDashboard;
window.refreshDashboard = refreshDashboard;
window.updateChart = updateChart;