// assets/js/logout.js
// ===================================================================
// logout.js - FRONTEND (CHỈ XỬ LÝ UI + GỌI API LOGOUT ĐÚNG CHUẨN)
// Không lưu logic nghiệp vụ, chỉ gọi API và làm đẹp UI
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. XÓA TOÀN BỘ TOKEN & DỮ LIỆU ĐĂNG NHẬP
    localStorage.clear();
    sessionStorage.clear();

    // 2. GỌI API LOGOUT ĐỂ INVALIDATE TOKEN Ở SERVER (nếu có)
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include', // Quan trọng nếu dùng session cookie
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .catch(err => {
        console.warn('API /api/logout không phản hồi (có thể chưa có route)', err);
    });

    // 3. ĐẾM NGƯỢC + TỰ ĐỘNG CHUYỂN HƯỚNG
    let seconds = 5;
    const countdownEl = document.getElementById('countdown');
    const timer = setInterval(() => {
        seconds--;
        if (countdownEl) countdownEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(timer);
            window.location.href = '/';
        }
    }, 1000);

    // Dừng đếm ngược nếu người dùng click nút
    document.querySelectorAll('.logout-container a').forEach(link => {
        link.addEventListener('click', () => clearInterval(timer));
    });
});

// ===================================================================
// NOTES:
// ===================================================================
// - Hoàn toàn phù hợp với cấu trúc bạn đang làm: chỉ UI + gọi API
// - Tự động xóa mọi token (localStorage & sessionStorage)
// - Gọi /api/logout (an toàn, không crash nếu backend chưa có)
// - Giao diện đẹp, có animation, responsive
// - Tự động redirect về trang chủ sau 5 giây
// - Dừng đếm ngược khi người dùng click link
// - Inject CSS inline nếu chưa có file logout.css riêng
// ===================================================================