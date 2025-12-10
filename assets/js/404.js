// ===================================================================
// 404.js - JavaScript cho trang lỗi 404
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Thêm hiệu ứng particle nhẹ theo chuột
    document.addEventListener('mousemove', (e) => {
        const shapes = document.querySelectorAll('.shape');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 10;
            const xPos = x * speed;
            const yPos = y * speed;
            shape.style.transform = `translate(${xPos}px, ${yPos}px)`;
        });
    });

    // Log error cho debugging
    console.error('404 Error: Page not found -', window.location.pathname);
});
