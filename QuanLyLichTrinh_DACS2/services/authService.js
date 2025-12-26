const pool = require('../config/db');
const User = require('../models/User');
const emailService = require('./emailService');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy'); 
const qrcode = require('qrcode');

class AuthService {
  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  validatePassword(password) {
    if (!password || password.length < 6) {
      return {
        valid: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự',
      };
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      return {
        valid: false,
        message: 'Mật khẩu phải chứa cả chữ và số',
      };
    }

    return { valid: true };
  }

  validateUsername(username) {
    if (!username || username.length < 5) {
      return {
        valid: false,
        message: 'Tên đăng nhập phải có ít nhất 5 ký tự',
      };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        valid: false,
        message: 'Tên đăng nhập chỉ được chứa chữ cái, số và gạch dưới',
      };
    }

    if (/\s/.test(username)) {
      return {
        valid: false,
        message: 'Tên đăng nhập không được chứa khoảng trắng',
      };
    }

    return { valid: true };
  }

  async initiateRegistration(req, userData) {
    const { username, email, password, fullName, phoneNumber } = userData;

    const usernameCheck = this.validateUsername(username);
    if (!usernameCheck.valid) {
      throw new Error(usernameCheck.message);
    }

    const passwordCheck = this.validatePassword(password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.message);
    }

    if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
      throw new Error('Số điện thoại không hợp lệ');
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new Error('Tên đăng nhập đã tồn tại');
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email đã được sử dụng');
    }

    const otpCode = this.generateOTP();

    await this.saveOTPToSession(req, email, otpCode, 'registration');

    await emailService.sendOTPEmail(email, otpCode, fullName, 'register');

    return {
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
    };
  }

  async completeRegistration(req, userData, otpCode) {
    const { username, password, email, fullName, dateOfBirth } = userData;

    const usernameCheck = this.validateUsername(username);
    if (!usernameCheck.valid) {
      throw new Error(usernameCheck.message);
    }

    const verifyResult = await this.verifyOTPFromSession(req, email, otpCode, 'registration');
    if (!verifyResult.valid) {
      throw new Error(verifyResult.reason || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    const newUser = await User.create({
      username,
      password,
      email,
      fullName,
      dateOfBirth,
    });

    await pool.query(
      'UPDATE users SET is_email_verified = TRUE WHERE user_id = $1',
      [newUser.user_id]
    );

    await emailService.sendWelcomeEmail(email, fullName);

    return {
      success: true,
      user: newUser,
    };
  }

  async login(username, password) {
    const user = await User.findByUsername(username);
    if (!user) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await User.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    return {
      success: true,
      user: user,
    };
  }

  async loginWithGoogle(googleToken) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const googleId = payload.sub;
      const email = payload.email;
      const fullName = payload.name;
      const avatarUrl = payload.picture;

      let user = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      if (user.rows.length > 0) {
        return {
          success: true,
          user: user.rows[0],
          isNewUser: false,
        };
      }

      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
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

      const defaultAvatar = '/img/default-avatar.jpg';
      
      const result = await pool.query(
        `INSERT INTO users (username, email, full_name, google_id, avatar_url, login_provider, is_email_verified, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
         RETURNING *`,
        [
          email.split('@')[0],
          email,
          fullName,
          googleId,
          defaultAvatar,
          'google',
          'google_oauth_no_password',
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

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async saveOTPToSession(req, email, otpCode, purpose) {
    if (!req.session.otpData) {
      req.session.otpData = {};
    }
    
    req.session.otpData[email] = {
      code: otpCode,
      purpose: purpose,
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now()
    };
  }

  async verifyOTPFromSession(req, email, otpCode, purpose) {
    const otpData = req.session.otpData?.[email];
    
    if (!otpData) {
      return { valid: false, reason: 'OTP không tồn tại' };
    }
    
    if (Date.now() > otpData.expiresAt) {
      delete req.session.otpData[email];
      return { valid: false, reason: 'OTP đã hết hạn' };
    }
    
    if (otpData.purpose !== purpose) {
      return { valid: false, reason: 'OTP không hợp lệ' };
    }
    
    if (otpData.code !== otpCode) {
      return { valid: false, reason: 'Mã OTP không đúng' };
    }
    
    delete req.session.otpData[email];
    
    return { valid: true };
  }

  async resendOTP(req, email, fullName = 'Bạn', purpose = 'registration') {
    const otpCode = this.generateOTP();

    await this.saveOTPToSession(req, email, otpCode, purpose);

    await emailService.sendOTPEmail(email, otpCode, fullName, 'reset-password');

    return {
      success: true,
      message: 'Mã OTP mới đã được gửi',
    };
  }

// ==================== 2FA FUNCTIONS ====================

  async setup2FA(userId) {
    const { rows } = await pool.query(
      'SELECT email, totp_secret FROM users WHERE user_id = $1',
      [userId]
    );

    if (rows.length === 0) {
      throw new Error('User not found');
    }

    const user = rows[0];
    let secret = user.totp_secret;

    if (!secret) {
      const newSecret = speakeasy.generateSecret({
        name: `TaskManager (${user.email})`,
        length: 32
      });
      secret = newSecret.base32;

      await pool.query(
        'UPDATE users SET totp_secret = $1 WHERE user_id = $2',
        [secret, userId]
      );
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: user.email,
      issuer: 'TaskManager',
      encoding: 'base32'
    });

    const qrCodeDataURL = await qrcode.toDataURL(otpauthUrl);

    return {
      success: true,
      qrCode: qrCodeDataURL,
      secret: secret
    };
  }

  async enable2FA(userId, token) {
    const { rows } = await pool.query(
      'SELECT totp_secret FROM users WHERE user_id = $1',
      [userId]
    );

    if (rows.length === 0 || !rows[0].totp_secret) {
      return { success: false, message: 'Chưa thiết lập 2FA' };
    }

    const verified = speakeasy.totp.verify({
      secret: rows[0].totp_secret,
      encoding: 'base32',
      token: token,
      window: 6
    });

    if (!verified) {
      return { success: false, message: 'Mã xác thực không đúng' };
    }

    await pool.query(
      'UPDATE users SET is_2fa_enabled = TRUE WHERE user_id = $1',
      [userId]
    );

    return { success: true, message: 'Đã bật 2FA thành công!' };
  }

  async disable2FA(userId, token) {
    const { rows } = await pool.query(
      'SELECT totp_secret, is_2fa_enabled FROM users WHERE user_id = $1',
      [userId]
    );

    if (rows.length === 0 || !rows[0].is_2fa_enabled) {
      return { success: false, message: '2FA chưa được bật' };
    }

    const verified = speakeasy.totp.verify({
      secret: rows[0].totp_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return { success: false, message: 'Mã xác thực không đúng' };
    }

    await pool.query(
      'UPDATE users SET is_2fa_enabled = FALSE WHERE user_id = $1',
      [userId]
    );

    return { success: true, message: 'Đã tắt 2FA thành công!' };
  }

  async get2FAStatus(userId) {
    const { rows } = await pool.query(
      'SELECT is_2fa_enabled FROM users WHERE user_id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return { success: false, enabled: false };
    }

    return { success: true, enabled: rows[0].is_2fa_enabled || false };
  }
}

module.exports = new AuthService();