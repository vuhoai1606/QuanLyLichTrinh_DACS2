const { createTransport } = require('nodemailer');

/**
 * EMAIL SERVICE
 * =============
 * Service này xử lý tất cả các tác vụ liên quan đến gửi email
 * - Gửi OTP verification
 * - Gửi email reset password
 * - Gửi email thông báo
 * 
 * CẤU HÌNH:
 * Thêm vào file .env:
 * EMAIL_HOST=smtp.gmail.com
 * EMAIL_PORT=587
 * EMAIL_USER=your-email@gmail.com
 * EMAIL_PASSWORD=your-app-password
 * EMAIL_FROM=Your App Name <your-email@gmail.com>
 */

class EmailService {
  constructor() {
    // Tạo transporter để gửi email
    // Sử dụng Gmail SMTP (hoặc service khác)
    this.transporter = createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Gửi email OTP cho việc đăng ký tài khoản
   * @param {string} email - Email người nhận
   * @param {string} otpCode - Mã OTP 6 số
   * @param {string} fullName - Tên người dùng
   */
  async sendOTPEmail(email, otpCode, fullName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'QuanLyLichTrinh <noreply@quanlylichtrinh.com>',
      to: email,
      subject: '🔐 Mã xác thực đăng ký tài khoản',
      html: this.getOTPEmailTemplate(otpCode, fullName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Đã gửi OTP email đến: ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Lỗi gửi email:', error);
      throw new Error('Không thể gửi email. Vui lòng thử lại sau.');
    }
  }

  /**
   * Template HTML cho email OTP
   * Thiết kế đẹp, responsive, dễ đọc
   */
  getOTPEmailTemplate(otpCode, fullName) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .message {
          font-size: 15px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .otp-box {
          background: #f8f9fa;
          border: 2px dashed #667eea;
          border-radius: 8px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          font-size: 13px;
          color: #999;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">📅</div>
          <h1>Quản Lý Lịch Trình</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            Xin chào <strong>${fullName}</strong>,
          </div>
          
          <div class="message">
            Cảm ơn bạn đã đăng ký tài khoản! Để hoàn tất quá trình đăng ký, 
            vui lòng sử dụng mã OTP bên dưới để xác thực email của bạn.
          </div>
          
          <div class="otp-box">
            <div class="otp-label">MÃ XÁC THỰC CỦA BẠN</div>
            <div class="otp-code">${otpCode}</div>
          </div>
          
          <div class="warning">
            ⏰ <strong>Lưu ý:</strong> Mã OTP này chỉ có hiệu lực trong <strong>5 phút</strong>. 
            Vui lòng không chia sẻ mã này với bất kỳ ai.
          </div>
          
          <div class="message">
            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
          </div>
        </div>
        
        <div class="footer">
          © 2025 Quản Lý Lịch Trình. All rights reserved.<br>
          Đây là email tự động, vui lòng không trả lời email này.
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Gửi email chào mừng sau khi đăng ký thành công
   */
  async sendWelcomeEmail(email, fullName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'QuanLyLichTrinh <noreply@quanlylichtrinh.com>',
      to: email,
      subject: '🎉 Chào mừng bạn đến với Quản Lý Lịch Trình!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #ddd; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Chào mừng ${fullName}!</h1>
            </div>
            <div class="content">
              <p>Tài khoản của bạn đã được kích hoạt thành công!</p>
              <p>Bạn có thể bắt đầu sử dụng hệ thống Quản Lý Lịch Trình để:</p>
              <ul>
                <li>📝 Quản lý công việc hàng ngày</li>
                <li>📅 Tạo và theo dõi sự kiện</li>
                <li>⏰ Nhận thông báo nhắc nhở</li>
                <li>👥 Chia sẻ lịch trình với người khác</li>
              </ul>
              <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
            </div>
            <div class="footer">
              © 2025 Quản Lý Lịch Trình
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Đã gửi welcome email đến: ${email}`);
    } catch (error) {
      console.error('❌ Lỗi gửi welcome email:', error);
      // Không throw error vì đây không phải critical
    }
  }

  /**
   * Gửi email reset password
   */
  async sendPasswordResetEmail(email, otpCode, fullName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🔒 Đặt lại mật khẩu',
      html: this.getPasswordResetTemplate(otpCode, fullName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Đã gửi password reset email đến: ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Lỗi gửi email reset password:', error);
      throw new Error('Không thể gửi email. Vui lòng thử lại sau.');
    }
  }

  getPasswordResetTemplate(otpCode, fullName) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Xin chào ${fullName},</h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu. Sử dụng mã OTP bên dưới:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea;">
            ${otpCode}
          </div>
          <p>Mã này có hiệu lực trong 5 phút.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
module.exports = new EmailService();
