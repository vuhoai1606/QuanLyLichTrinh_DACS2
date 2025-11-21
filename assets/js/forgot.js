// ==========================
//  FORGOT PASSWORD SCRIPT
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-form");
  const emailInput = document.getElementById("forgot-email");
  const errorMsg = document.getElementById("email-error");

  // Tạo khối thông báo gửi thành công
  const messageBox = document.createElement("div");
  messageBox.classList.add("success-message");
  document.querySelector(".forgot-card").appendChild(messageBox);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    errorMsg.textContent = "";
    messageBox.textContent = "";
    messageBox.classList.remove("show", "error");

    // Regex kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      errorMsg.textContent = "Vui lòng nhập email của bạn.";
      emailInput.classList.add("error-input");
      return;
    } else if (!emailRegex.test(email)) {
      errorMsg.textContent = "Email không hợp lệ. Vui lòng kiểm tra lại.";
      emailInput.classList.add("error-input");
      return;
    }

    // Hiệu ứng loading
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang gửi...`;

    // Giả lập gửi email (API giả lập)
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Gửi yêu cầu`;

      messageBox.textContent = "✅ Liên kết đặt lại mật khẩu đã được gửi tới email của bạn!";
      messageBox.classList.add("show");

      // Reset form sau vài giây
      form.reset();

      setTimeout(() => {
        messageBox.classList.remove("show");
      }, 4000);
    }, 1500);
  });

  // Xoá trạng thái lỗi khi người dùng nhập lại
  emailInput.addEventListener("input", () => {
    errorMsg.textContent = "";
    emailInput.classList.remove("error-input");
  });
});
