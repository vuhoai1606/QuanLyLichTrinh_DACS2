// ================== GLOBAL VARIABLES ==================
let userProfile = {
  name: "Nguyễn Văn A",
  email: "nguyenvana@example.com",
  phone: "+84 912 345 678",
  joined: "01/01/2025"
};

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", () => {
  initProfilePage();
  bindUIEvents();
  loadHeader();
});

// ================== INIT PROFILE ==================
function initProfilePage() {
  const userName = document.getElementById("user-name");
  const userEmail = document.getElementById("user-email");
  const userPhone = document.getElementById("user-phone");
  const userJoined = document.getElementById("user-joined");

  if (userName) userName.textContent = userProfile.name;
  if (userEmail) userEmail.textContent = userProfile.email;
  if (userPhone) userPhone.textContent = userProfile.phone;
  if (userJoined) userJoined.textContent = userProfile.joined;
}

// ================== UI EVENTS ==================
function bindUIEvents() {
  const editBtn = document.getElementById("edit-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const modalOverlay = document.getElementById("modal-overlay");
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-form");
  const closeModalBtn = document.getElementById("close-modal");

  // ===== OPEN MODAL =====
  if (editBtn) {
    editBtn.addEventListener("click", () => openEditModal());
  }

  // ===== LOGOUT =====
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // ===== FORM SUBMIT =====
  if (editForm) {
    editForm.addEventListener("submit", handleProfileUpdate);
  }

  // ===== CLOSE MODAL =====
  if (modalOverlay) modalOverlay.addEventListener("click", closeEditModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeEditModal);
}

// ================== MODAL FUNCTIONS ==================
function openEditModal() {
  const modal = document.getElementById("edit-modal");
  const overlay = document.getElementById("modal-overlay");

  const editName = document.getElementById("edit-name");
  const editEmail = document.getElementById("edit-email");
  const editPhone = document.getElementById("edit-phone");

  if (editName) editName.value = userProfile.name;
  if (editEmail) editEmail.value = userProfile.email;
  if (editPhone) editPhone.value = userProfile.phone;

  if (modal) modal.style.display = "flex";
  if (overlay) overlay.style.display = "block";
}

function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  const overlay = document.getElementById("modal-overlay");

  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}

// ================== UPDATE PROFILE ==================
function handleProfileUpdate(e) {
  e.preventDefault();

  const editName = document.getElementById("edit-name").value.trim();
  const editEmail = document.getElementById("edit-email").value.trim();
  const editPhone = document.getElementById("edit-phone").value.trim();
  const editPassword = document.getElementById("edit-password").value.trim();

  if (!editName || !editEmail || !editPhone) {
    alert("Vui lòng nhập đầy đủ thông tin!");
    return;
  }

  // Cập nhật thông tin hiển thị
  userProfile = {
    ...userProfile,
    name: editName,
    email: editEmail,
    phone: editPhone
  };

  document.getElementById("user-name").textContent = editName;
  document.getElementById("user-email").textContent = editEmail;
  document.getElementById("user-phone").textContent = editPhone;

  if (editPassword) {
    alert(`Mật khẩu đã được đổi thành: ${editPassword} (mock)`);
  }

  alert("Hồ sơ đã được cập nhật (mock)");
  closeEditModal();
}

// ================== LOGOUT ==================
function handleLogout() {
  if (confirm("Bạn có chắc muốn đăng xuất?")) {
    window.location.href = "logout.html";
  }
}

// ================== LOAD HEADER ==================
function loadHeader() {
  const headerPlaceholder = document.getElementById("header-placeholder");

  if (headerPlaceholder) {
    fetch("header.html")
      .then((response) => {
        if (!response.ok) throw new Error("Không tải được header.html");
        return response.text();
      })
      .then((html) => {
        headerPlaceholder.innerHTML = html;

        // Sau khi header load xong → bind toggle
        const menuToggle = document.getElementById("menu-toggle");
        const header = document.querySelector("header");

        if (menuToggle && header) {
          menuToggle.addEventListener("click", () => {
            header.classList.toggle("collapsed");
            const isCollapsed = header.classList.contains("collapsed");
            localStorage.setItem("menuCollapsed", isCollapsed);
          });

          // Khôi phục trạng thái
          const isCollapsed = localStorage.getItem("menuCollapsed") === "true";
          if (isCollapsed) header.classList.add("collapsed");
        }
      })
      .catch((err) => console.error("Lỗi load header:", err));
  }
}
