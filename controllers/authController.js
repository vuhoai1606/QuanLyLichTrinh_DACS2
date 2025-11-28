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
    const { username, password, email, fullName, dateOfBirth, captcha } = req.body;

    // Kiểm tra captcha
    if (!req.session.captcha || !captcha || req.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Mã captcha không đúng',
      });
    }

    delete req.session.captcha;

    // Gọi service để gửi OTP
    const result = await authService.initiateRegistration({
      username,
      password,
      email,
      fullName,
      dateOfBirth,
    });

    // Lưu thông tin tạm vào session
    req.session.pendingRegistration = {
      username,
      password,
      email,
      fullName,
      dateOfBirth,
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

    const result = await authService.completeRegistration(pendingReg, otpCode);

    // Tự động đăng nhập
    req.session.userId = result.user.user_id;
    req.session.username = result.user.username;
    req.session.fullName = result.user.full_name;

    delete req.session.pendingRegistration;

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

    const result = await authService.resendOTP(pendingReg.email);
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

    // Gọi service để login
    const result = await authService.login(username, password);

    // Lưu vào session
    req.session.userId = result.user.user_id;
    req.session.username = result.user.username;
    req.session.fullName = result.user.full_name;

    // Xử lý "Ghi nhớ đăng nhập"
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 ngày
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
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

    req.session.userId = result.user.user_id;
    req.session.username = result.user.username;
    req.session.fullName = result.user.full_name;

    console.log('✅ Session saved. Sending response...');

    res.json({
      success: true,
      message: result.isNewUser ? 'Đăng ký thành công!' : 'Đăng nhập thành công!',
      redirectUrl: '/',
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
        return res.status(500).json({
          success: false,
          message: 'Có lỗi khi đăng xuất',
        });
      }

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
 * ========================================
 * VIEW RENDERING (Các trang HTML)
 * ========================================
 */

/**
 * BACKWARD COMPATIBILITY - Alias cho initiateRegistration
 * Để hỗ trợ route cũ /api/register
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
