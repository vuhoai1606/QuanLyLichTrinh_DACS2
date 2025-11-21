document.addEventListener("DOMContentLoaded", async () => {
  /* ===========================
     1️⃣ NẠP HEADER DYNAMIC
  =========================== */
  try {
    const response = await fetch("header.html");
    const html = await response.text();
    document.getElementById("header-placeholder").innerHTML = html;

    // Toggle menu
    const menuToggle = document.getElementById("menu-toggle");
    const header = document.querySelector("header");
    if (menuToggle && header) {
      menuToggle.addEventListener("click", () => {
        header.classList.toggle("collapsed");
        menuToggle.style.transform = header.classList.contains("collapsed")
          ? "rotate(180deg)"
          : "rotate(0deg)";
      });
    }
  } catch (error) {
    console.error("Lỗi khi tải header:", error);
  }

  /* ===========================
     2️⃣ DỮ LIỆU THÔNG BÁO (LocalStorage)
  =========================== */
  const STORAGE_KEY = "notifications_data";
  const defaultNotis = [
    { id: 1, title: "Deadline sắp tới", body: "Nộp báo cáo vào 2025-09-20", read: false },
    { id: 2, title: "Thành viên mới", body: "Nguyễn A đã tham gia Team", read: true },
    { id: 3, title: "Cập nhật hệ thống", body: "Hệ thống sẽ bảo trì lúc 22:00 hôm nay", read: false },
  ];

  let notis = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultNotis;

  const ul = document.getElementById("noti-list");
  const markAllBtn = document.getElementById("mark-read");

  /* ===========================
     3️⃣ HÀM HIỂN THỊ THÔNG BÁO
  =========================== */
  function render() {
    ul.innerHTML = "";

    if (notis.length === 0) {
      ul.innerHTML = `<li class="noti-empty">Không có thông báo nào</li>`;
      updateBadge();
      return;
    }

    notis.forEach((n, index) => {
      const li = document.createElement("li");
      li.className = `noti-item ${n.read ? "" : "unread"}`;
      li.style.animationDelay = `${index * 0.05}s`; // hiệu ứng lần lượt

      li.innerHTML = `
        <div class="noti-text">
          <strong>${n.title}</strong>
          <div class="small">${n.body}</div>
        </div>
        <div>
          ${
            n.read
              ? `<span class="read-label"><i class="fa-solid fa-circle-check"></i> Đã đọc</span>`
              : `<button class="btn btn-mark" data-id="${n.id}">
                  <i class="fa-solid fa-check"></i> Đánh dấu
                 </button>`
          }
        </div>
      `;
      ul.appendChild(li);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(notis));
    updateBadge();
  }

  /* ===========================
     4️⃣ CẬP NHẬT BADGE SỐ THÔNG BÁO
  =========================== */
  function updateBadge() {
    const unreadCount = notis.filter((n) => !n.read).length;
    let badge = document.querySelector(".notification-badge");

    if (!badge) {
      const icon = document.querySelector(".notification-icon");
      if (icon) {
        badge = document.createElement("span");
        badge.className = "notification-badge";
        icon.appendChild(badge);
      }
    }

    if (badge) {
      badge.textContent = unreadCount > 0 ? unreadCount : "";
      badge.style.opacity = unreadCount > 0 ? "1" : "0";
      badge.style.transform = unreadCount > 0 ? "scale(1)" : "scale(0.7)";
    }
  }

  /* ===========================
     5️⃣ SỰ KIỆN: ĐÁNH DẤU ĐÃ ĐỌC
  =========================== */
  ul.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-mark");
    if (btn) {
      const id = btn.dataset.id;
      const n = notis.find((x) => x.id == id);
      if (n) {
        n.read = true;
        animateRead(btn.closest(".noti-item"));
        setTimeout(render, 350);
      }
    }
  });

  // Hiệu ứng fade-out khi đánh dấu đã đọc
  function animateRead(element) {
    element.style.transition = "all 0.3s ease";
    element.style.opacity = "0";
    element.style.transform = "translateY(-8px)";
  }

  markAllBtn.addEventListener("click", () => {
    if (notis.every((n) => n.read)) return;
    notis.forEach((n) => (n.read = true));

    // Hiệu ứng nhẹ khi mark all
    ul.querySelectorAll(".noti-item.unread").forEach((el, i) => {
      setTimeout(() => animateRead(el), i * 70);
    });

    setTimeout(render, 500);
  });

  /* ===========================
     6️⃣ HIỂN THỊ BAN ĐẦU
  =========================== */
  render();
});
