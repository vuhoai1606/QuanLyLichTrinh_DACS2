// ================== GLOBAL VARIABLES ==================
let currentDate = new Date(2025, 9, 9); // October 9, 2025
let viewMode = "month"; // default

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Render calendar
  renderCalendar();
  bindUIEvents();

  // 2. Load header
  loadHeader();
});

// ================== RENDER CALENDAR ==================
function renderCalendar() {
  const monthYearEl = document.getElementById("month-year");
  const calendarEl = document.getElementById("calendar");
  if (!monthYearEl || !calendarEl) return;

  calendarEl.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date(2025, 9, 9); // Use the current date as October 9, 2025

  if (viewMode === "month") {
    // ================= MONTH VIEW =================
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthYearEl.textContent = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Fill empty slots
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.classList.add("empty");
      calendarEl.appendChild(emptyCell);
    }

    // Fill days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      dayCell.classList.add("day");
      dayCell.textContent = day;

      if (
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      ) {
        dayCell.classList.add("today");
      }

      dayCell.addEventListener("click", () => openEventModal(day));
      calendarEl.appendChild(dayCell);
    }
  } else if (viewMode === "week") {
    // ================= WEEK VIEW =================
    const currentDay = currentDate.getDay(); // 0-6
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDay); // Back to Sunday

    monthYearEl.textContent = `Week of ${startOfWeek.toLocaleDateString()}`;

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      const dayCell = document.createElement("div");
      dayCell.classList.add("day");
      dayCell.textContent = day.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      if (
        day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()
      ) {
        dayCell.classList.add("today");
      }

      dayCell.addEventListener("click", () => openEventModal(day.getDate()));
      calendarEl.appendChild(dayCell);
    }
  } else if (viewMode === "day") {
    // ================= DAY VIEW =================
    monthYearEl.textContent = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const dayCell = document.createElement("div");
    dayCell.classList.add("day", "full-day");
    dayCell.textContent = "Full day view - Add events here";
    calendarEl.appendChild(dayCell);
  } else if (viewMode === "year") {
    // ================= YEAR VIEW =================
    monthYearEl.textContent = currentDate.getFullYear().toString();

    for (let m = 0; m < 12; m++) {
      const monthCell = document.createElement("div");
      monthCell.classList.add("month");
      monthCell.textContent = new Date(year, m).toLocaleString("en-US", { month: "long" });
      monthCell.addEventListener("click", () => {
        viewMode = "month";
        currentDate.setMonth(m);
        renderCalendar();
      });
      calendarEl.appendChild(monthCell);
    }
  }
}

// ================== NAVIGATION ==================
function prevPeriod() {
  if (viewMode === "month") {
    currentDate.setMonth(currentDate.getMonth() - 1);
  } else if (viewMode === "week") {
    currentDate.setDate(currentDate.getDate() - 7);
  } else if (viewMode === "day") {
    currentDate.setDate(currentDate.getDate() - 1);
  } else if (viewMode === "year") {
    currentDate.setFullYear(currentDate.getFullYear() - 1);
  }
  renderCalendar();
}

function nextPeriod() {
  if (viewMode === "month") {
    currentDate.setMonth(currentDate.getMonth() + 1);
  } else if (viewMode === "week") {
    currentDate.setDate(currentDate.getDate() + 7);
  } else if (viewMode === "day") {
    currentDate.setDate(currentDate.getDate() + 1);
  } else if (viewMode === "year") {
    currentDate.setFullYear(currentDate.getFullYear() + 1);
  }
  renderCalendar();
}

function today() {
  currentDate = new Date(2025, 9, 9); // October 9, 2025
  renderCalendar();
}

function changeView() {
  viewMode = document.getElementById("viewMode").value;
  renderCalendar();
}

// ================== SEARCH ==================
function toggleSearch() {
  const searchInput = document.getElementById("search");
  searchInput.classList.toggle("active");
  if (searchInput.classList.contains("active")) {
    searchInput.focus();
  }
}

// ================== MODAL EVENT ==================
function bindUIEvents() {
  const modal = document.getElementById("eventModal");
  const createBtn = document.querySelector(".create-btn");

  if (createBtn) {
    createBtn.addEventListener("click", () => openEventModal());
  }

  // Close modal when clicking outside
  if (modal) {
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeEventModal();
      }
    });
  }

  // Additional bindings for new elements
  const editBtn = document.getElementById("edit-event");
  const deleteBtn = document.getElementById("delete-event");
  const reminderModal = document.getElementById("reminder-modal");
  const closeReminder = document.getElementById("close-reminder");
  const shareBtn = document.getElementById("share-calendar");

  if (editBtn) editBtn.addEventListener("click", () => alert('Edit Event functionality to be implemented.'));
  if (deleteBtn) deleteBtn.addEventListener("click", () => alert('Delete Event functionality to be implemented.'));
  if (closeReminder) closeReminder.addEventListener("click", () => reminderModal.style.display = 'none');
  if (shareBtn) shareBtn.addEventListener("click", () => alert('Share Calendar functionality to be implemented.'));
}

function openEventModal(day = null) {
  const modal = document.getElementById("eventModal");
  if (!modal) return;

  modal.style.display = "flex";
  const titleInput = document.getElementById("eventTitle");
  const descInput = document.getElementById("eventDesc");

  if (day) {
    titleInput.value = `Event on ${day}`;
  } else {
    titleInput.value = "";
  }
  descInput.value = "";
}

function closeEventModal() {
  const modal = document.getElementById("eventModal");
  if (modal) modal.style.display = "none";
}

function saveEvent() {
  const title = document.getElementById("eventTitle").value;
  const desc = document.getElementById("eventDesc").value;

  if (!title.trim()) {
    alert("Please enter event title!");
    return;
  }

  const upcomingList = document.getElementById("upcomingList");
  if (upcomingList) {
    const li = document.createElement("li");
    li.textContent = `${title} - ${desc}`;
    upcomingList.appendChild(li);
  }

  closeEventModal();
}

// ================== HEADER LOAD ==================
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

        // After loading header, bind menu toggle event if exists
        const menuToggle = document.getElementById("menu-toggle");
        const header = document.querySelector("header");

        if (menuToggle && header) {
          menuToggle.addEventListener("click", () => {
            header.classList.toggle("collapsed");
            const isCollapsed = header.classList.contains("collapsed");
            localStorage.setItem("menuCollapsed", isCollapsed);
          });

          // Restore state from localStorage
          const isCollapsed = localStorage.getItem("menuCollapsed") === "true";
          if (isCollapsed) {
            header.classList.add("collapsed");
          }
        }
      })
      .catch((err) => console.error("Lỗi load header:", err));
  }
}