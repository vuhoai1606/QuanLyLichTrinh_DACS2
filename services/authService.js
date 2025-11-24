const pool = require('../config/db');
const User = require('../models/User');
const emailService = require('./emailService');
const { OAuth2Client } = require('google-auth-library');

/**
 * AUTH SERVICE
 * ============
 * Service này xử lý tất cả logic nghiệp vụ liên quan đến authentication:
 * - Đăng ký với OTP verification
 * - Đăng nhập thông thường
 * - Đăng nhập với Google OAuth
 * - Quản lý OTP codes
 * - Password validation
 */

class AuthService {
  constructor() {
    // Khởi tạo Google OAuth client
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * VALIDATION: Kiểm tra mật khẩu
   * Yêu cầu: Tối thiểu 6 ký tự, phải có cả chữ và số
   */
  validatePassword(password) {
    if (!password || password.length < 6) {
      return {
        valid: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự',
      };
    }

    // Kiểm tra có chữ cái
    const hasLetter = /[a-zA-Z]/.test(password);
    // Kiểm tra có số
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      return {
        valid: false,
        message: 'Mật khẩu phải chứa cả chữ và số',
      };
    }

    return { valid: true };
  }

  /**
   * BƯỚC 1 ĐĂNG KÝ: Tạo OTP và gửi email
   * Chưa tạo user, chỉ gửi OTP để xác thực email
   */
  async initiateRegistration(userData) {
    const { username, email, password, fullName } = userData;

    // 1. Validate password
    const passwordCheck = this.validatePassword(password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.message);
    }

    // 2. Kiểm tra username đã tồn tại chưa
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new Error('Tên đăng nhập đã tồn tại');
    }

    // 3. Kiểm tra email đã tồn tại chưa
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email đã được sử dụng');
    }

    // 4. Tạo mã OTP (6 số ngẫu nhiên)
    const otpCode = this.generateOTP();

    // 5. Lưu OTP vào database (hết hạn sau 5 phút)
    await this.saveOTP(email, otpCode, 'registration');

    // 6. Gửi email chứa OTP
    await emailService.sendOTPEmail(email, otpCode, fullName);

    return {
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
    };
  }

  /**
   * BƯỚC 2 ĐĂNG KÝ: Xác thực OTP và tạo tài khoản
   */
  async completeRegistration(userData, otpCode) {
    const { username, password, email, fullName, dateOfBirth } = userData;

    // 1. Xác thực OTP
    const isOTPValid = await this.verifyOTP(email, otpCode, 'registration');
    if (!isOTPValid) {
      throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // 2. Tạo user mới
    const newUser = await User.create({
      username,
      password,
      email,
      fullName,
      dateOfBirth,
    });

    // 3. Đánh dấu email đã được xác thực
    await pool.query(
      'UPDATE users SET is_email_verified = TRUE WHERE user_id = $1',
      [newUser.user_id]
    );

    // 4. Đánh dấu OTP đã sử dụng
    await this.markOTPAsUsed(email, otpCode);

    // 5. Gửi email chào mừng
    await emailService.sendWelcomeEmail(email, fullName);

    return {
      success: true,
      user: newUser,
    };
  }

  /**
   * ĐĂNG NHẬP THÔNG THƯỜNG
   */
  async login(username, password) {
    // 1. Tìm user
    const user = await User.findByUsername(username);
    if (!user) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = await User.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // 3. Kiểm tra email đã xác thực chưa (chỉ áp dụng cho user đăng ký mới)
    // Bỏ qua kiểm tra này để cho phép user cũ (từ seeder) đăng nhập
    // if (!user.is_email_verified) {
    //   throw new Error('Vui lòng xác thực email trước khi đăng nhập');
    // }

    return {
      success: true,
      user: user,
    };
  }

  /**
   * ĐĂNG NHẬP VỚI GOOGLE OAUTH
   * @param {string} googleToken - ID token từ Google
   */
  async loginWithGoogle(googleToken) {
    try {
      // 1. Xác thực token với Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const googleId = payload.sub; // Google User ID
      const email = payload.email;
      const fullName = payload.name;
      const avatarUrl = payload.picture;

      // 2. Kiểm tra user đã tồn tại chưa (dựa vào google_id)
      let user = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      if (user.rows.length > 0) {
        // User đã tồn tại -> Đăng nhập
        return {
          success: true,
          user: user.rows[0],
          isNewUser: false,
        };
      }

      // 3. Kiểm tra email đã tồn tại chưa
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        // Email đã tồn tại với local account
        // Link Google account vào existing account
        await pool.query(
          'UPDATE users SET google_id = $1, avatar_url = $2, login_provider = $3 WHERE email = $4',
          [googleId, avatarUrl, 'google', email]
        );

        return {
          success: true,
          user: existingEmail,
          isNewUser: false,
        };
      }

      // 4. Tạo user mới từ Google account
      const result = await pool.query(
        `INSERT INTO users (username, email, full_name, google_id, avatar_url, login_provider, is_email_verified, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
         RETURNING *`,
        [
          email.split('@')[0], // username từ email
          email,
          fullName,
          googleId,
          avatarUrl,
          'google',
          'google_oauth_no_password', // Placeholder password
        ]
      );

      return {
        success: true,
        user: result.rows[0],
        isNewUser: true,
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Không thể đăng nhập với Google. Vui lòng thử lại.');
    }
  }

  /**
   * TẠO MÃ OTP (6 số ngẫu nhiên)
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * LƯU OTP VÀO DATABASE
   */
  async saveOTP(email, otpCode, purpose) {
    // Tính thời gian hết hạn (5 phút)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (email, otp_code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, otpCode, purpose, expiresAt]
    );
  }

  /**
   * XÁC THỰC OTP
   */
  async verifyOTP(email, otpCode, purpose) {
    const result = await pool.query(
      `SELECT * FROM otp_codes 
       WHERE email = $1 
       AND otp_code = $2 
       AND purpose = $3 
       AND is_used = FALSE 
       AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, otpCode, purpose]
    );

    return result.rows.length > 0;
  }

  /**
   * ĐÁNH DẤU OTP ĐÃ SỬ DỤNG
   */
  async markOTPAsUsed(email, otpCode) {
    await pool.query(
      'UPDATE otp_codes SET is_used = TRUE WHERE email = $1 AND otp_code = $2',
      [email, otpCode]
    );
  }

  /**
   * GỬI LẠI OTP (nếu user không nhận được)
   */
  async resendOTP(email, purpose = 'registration') {
    // Kiểm tra email có tồn tại trong quá trình đăng ký không
    // (có thể thêm validation)

    // Tạo OTP mới
    const otpCode = this.generateOTP();

    // Lưu OTP
    await this.saveOTP(email, otpCode, purpose);

    // Gửi email
    await emailService.sendOTPEmail(email, otpCode, 'Bạn');

    return {
      success: true,
      message: 'Mã OTP mới đã được gửi',
    };
  }
}

// Export singleton instance
module.exports = new AuthService();
