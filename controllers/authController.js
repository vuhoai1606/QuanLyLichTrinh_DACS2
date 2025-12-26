const authService = require('../services/authService');
const svgCaptcha = require('svg-captcha');

/**
 * AUTH CONTROLLER - Đã tái cấu trúc sử dụng Services
 * ====================================================
 * Controller chỉ xử lý HTTP request/response
 * Business logic đã chuyển sang authService
 */

/**
 * BƯỚC 1 ĐĂNG KÝ: Gửi OTP qua email
 */
exports.initiateRegistration = async (req, res) => {
  try {
    const { username, password, email, fullName, dateOfBirth, gender, phoneNumber, captcha } = req.body;

    // Kiểm tra captcha
    if (!req.session.captcha || !captcha || req.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Mã captcha không đúng',
      });
    }

    delete req.session.captcha;

    // Gọi service để gửi OTP (truyền req để lưu vào session)
    const result = await authService.initiateRegistration(req, {
      username,
      password,
      email,
      fullName,
      dateOfBirth,
      gender,
      phoneNumber,
    });

    // Lưu thông tin tạm vào session
    req.session.pendingRegistration = {
      username,
      password,
      email,
      fullName,
      dateOfBirth,
      gender,
      phoneNumber,
    };

    res.json(result);
  } catch (error) {
    console.error('Lỗi initiate registration:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * BƯỚC 2 ĐĂNG KÝ: Xác thực OTP và tạo tài khoản
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { otpCode } = req.body;

    const pendingReg = req.session.pendingRegistration;
    if (!pendingReg) {
      return res.status(400).json({
        success: false,
        message: 'Session hết hạn. Vui lòng đăng ký lại.',
      });
    }

    // Verify OTP từ session thay vì database
    const result = await authService.completeRegistration(req, pendingReg, otpCode);

    // Cập nhật last_login_at
    const pool = require('../config/db');
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [result.user.user_id]);

    // Tự động đăng nhập
    req.session.userId = result.user.user_id;
    req.session.username = result.user.username;
    req.session.fullName = result.user.full_name;
    req.session.role = result.user.role || 'user';

    delete req.session.pendingRegistration;

    // EMIT SOCKET.IO - Thông báo admin có user mới
    if (global.io) {
      global.io.emit('new-user-registered', {
        userId: result.user.user_id,
        username: result.user.username,
        fullName: result.user.full_name,
        email: result.user.email,
        createdAt: new Date()
      });
      console.log('📢 [SOCKET] Emitted new-user-registered event');
    }

    res.json({
      success: true,
      message: 'Đăng ký thành công!',
      user: {
        userId: result.user.user_id,
        username: result.user.username,
        fullName: result.user.full_name,
        email: result.user.email,
      },
    });
  } catch (error) {
    console.error('Lỗi verify OTP:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GỬI LẠI OTP
 */
exports.resendOTP = async (req, res) => {
  try {
    const pendingReg = req.session.pendingRegistration;
    if (!pendingReg) {
      return res.status(400).json({
        success: false,
        message: 'Session hết hạn. Vui lòng đăng ký lại.',
      });
    }

    const result = await authService.resendOTP(req, pendingReg.email, pendingReg.fullName);
    res.json(result);
  } catch (error) {
    console.error('Lỗi resend OTP:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ĐĂNG NHẬP THÔNG THƯỜNG
 */
exports.login = async (req, res) => {
  try {
    const { username, password, rememberMe, captcha } = req.body;

    // Kiểm tra captcha (chỉ nếu có)
    if (captcha && req.session.captcha) {
      if (req.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Mã captcha không đúng',
        });
      }
      delete req.session.captcha;
    }

    const result = await authService.login(username, password);

    // KIỂM TRA TÀI KHOẢN BỊ KHÓA
    if (result.user.is_banned) {
      const banReason = result.user.ban_reason || 'Không có lý do cụ thể';
      console.log(`🔴 [LOGIN] User "${username}" cố đăng nhập nhưng bị khóa - Reason: ${banReason}`);
      
      return res.status(403).json({
        success: false,
        accountBanned: true,
        message: `Tài khoản đã bị khóa. Lý do: ${banReason}`,
        banReason: banReason
      });
    }

    // Cập nhật last_login_at
    const pool = require('../config/db');
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [result.user.user_id]);

    // Lưu vào session
    req.session.userId = result.user.user_id;
    req.session.username = result.user.username;
    req.session.fullName = result.user.full_name;
    req.session.role = result.user.role || 'user';

    // Xử lý "Ghi nhớ đăng nhập"
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 ngày
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      redirectUrl: result.user.role === 'admin' ? '/admin/dashboard' : '/',
      user: {
        userId: result.user.user_id,
        username: result.user.username,
        fullName: result.user.full_name,
        email: result.user.email,
      },
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ĐĂNG NHẬP VỚI GOOGLE
 */
exports.googleLogin = async (req, res) => {
  try {
    console.log('🔍 ===== BACKEND: Google Login Request =====');
    console.log('Request body:', req.body);
    console.log('Has token:', !!req.body.token);
    
    const { token } = req.body;

    if (!token) {
      console.error('❌ Token is missing from request');
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ',
      });
    }

    console.log('✅ Token received. Length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    console.log('📞 Calling authService.loginWithGoogle()...');

    const result = await authService.loginWithGoogle(token);

    console.log('✅ AuthService returned result:', {
      isNewUser: result.isNewUser,
      userId: result.user.user_id,
      email: result.user.email
    });

    // KIỂM TRA TÀI KHOẢN BỊ KHÓA
    if (result.user.is_banned) {
      const banReason = result.user.ban_reason || 'Không có lý do cụ thể';
      console.log(`🔴 [GOOGLE-LOGIN] User "${result.user.email}" cố đăng nhập nhưng bị khóa`);
      
      return res.status(403).json({
        success: false,
        accountBanned: true,
        message: `Tài khoản đã bị khóa. Lý do: ${banReason}`,
        banReason: banReason
      });
    }

    // Cập nhật last_login_at
    const pool = require('../config/db');
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = $1', [result.user.user_id]);

    req.session.userId = result.user.user_id;
    req.session.username = result.user.username;
    req.session.fullName = result.user.full_name;
    req.session.email = result.user.email;
    req.session.avatar = result.user.avatar_url;
    req.session.role = result.user.role || 'user';

    console.log('✅ Session saved. Sending response...');

    res.json({
      success: true,
      message: result.isNewUser ? 'Đăng ký thành công!' : 'Đăng nhập thành công!',
      redirectUrl: result.user.role === 'admin' ? '/admin/dashboard' : '/',
      user: {
        userId: result.user.user_id,
        username: result.user.username,
        fullName: result.user.full_name,
        email: result.user.email,
        avatar: result.user.avatar_url,
      },
    });
  } catch (error) {
    console.error('❌ ===== Google Login Error =====');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    res.status(400).json({
      success: false,
      message: 'Lỗi đăng nhập Google: ' + error.message,
    });
  }
};

/**
 * ĐĂNG XUẤT
 */
exports.logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({
          success: false,
          message: 'Có lỗi khi đăng xuất',
        });
      }

      res.clearCookie('connect.sid', { path: '/' });
      res.clearCookie('connect.sid');

      res.json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    });
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi đăng xuất',
    });
  }
};

/**
 * KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
 */
exports.checkAuth = async (req, res) => {
  try {
    if (req.session.userId) {
      return res.json({
        success: true,
        isAuthenticated: true,
        user: {
          userId: req.session.userId,
          username: req.session.username,
          fullName: req.session.fullName,
        },
      });
    }

    res.json({
      success: true,
      isAuthenticated: false,
    });
  } catch (error) {
    console.error('Lỗi kiểm tra auth:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra',
    });
  }
};

/**
 * TẠO CAPTCHA (SVG)
 */
exports.generateCaptcha = (req, res) => {
  const captcha = svgCaptcha.create({
    size: 6,
    noise: 3,
    color: true,
    background: '#f0f0f0',
    fontSize: 50,
    width: 200,
    height: 80,
  });

  req.session.captcha = captcha.text;

  res.type('svg');
  res.send(captcha.data);
};

/**
 * BACKWARD COMPATIBILITY - Alias cho initiateRegistration
 */
exports.register = exports.initiateRegistration;

exports.showRegisterPage = (req, res) => {
  res.render('register', {
    title: 'Đăng ký',
    user: req.session.userId ? req.session : null,
  });
};

exports.showLoginPage = (req, res) => {
  res.render('login', {
    title: 'Đăng nhập',
    user: req.session.userId ? req.session : null,
  });
};

exports.showVerifyOTPPage = (req, res) => {
  if (!req.session.pendingRegistration) {
    return res.redirect('/register');
  }

  res.render('verify-otp', {
    title: 'Xác thực OTP',
    email: req.session.pendingRegistration.email,
  });
};

/**
 * FORGOT PASSWORD FLOW
 */
exports.forgotPasswordVerify = async (req, res) => {
  try {
    const { username, email } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tên đăng nhập và email'
      });
    }
    
    const pool = require('../config/db');
    const crypto = require('crypto');
    const emailService = require('../services/emailService');
    
    const result = await pool.query(
      'SELECT user_id, username, email, full_name FROM users WHERE username = $1 AND email = $2',
      [username, email]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc email không đúng'
      });
    }
    
    const user = result.rows[0];
    
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    
    req.session.forgotPasswordOTP = {
      otp: otp,
      expires: otpExpires.getTime(),
      userId: user.user_id,
      username: user.username,
      email: user.email
    };
    
    await emailService.sendOTPEmail(email, otp, user.full_name, 'reset-password');
    
    return res.json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn'
    });
    
  } catch (error) {
    console.error('Error in forgotPasswordVerify:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý yêu cầu'
    });
  }
};

exports.forgotPasswordVerifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã OTP'
      });
    }
    
    const otpData = req.session.forgotPasswordOTP;
    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại'
      });
    }
    
    if (otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không đúng'
      });
    }
    
    if (Date.now() > otpData.expires) {
      delete req.session.forgotPasswordOTP;
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại'
      });
    }
    
    req.session.forgotPasswordOTP.verified = true;
    
    return res.json({
      success: true,
      message: 'Xác thực OTP thành công'
    });
    
  } catch (error) {
    console.error('Error in forgotPasswordVerifyOTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xác minh OTP'
    });
  }
};

exports.forgotPasswordReset = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu mới'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }
    
    if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có cả chữ và số'
      });
    }
    
    const otpData = req.session.forgotPasswordOTP;
    if (!otpData || !otpData.verified) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng xác thực OTP trước'
      });
    }
    
    const pool = require('../config/db');
    const bcrypt = require('bcrypt');
    
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newPasswordHash, otpData.userId]
    );
    
    delete req.session.forgotPasswordOTP;
    
    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
    
  } catch (error) {
    console.error('Error in forgotPasswordReset:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi đổi mật khẩu'
    });
  }
};