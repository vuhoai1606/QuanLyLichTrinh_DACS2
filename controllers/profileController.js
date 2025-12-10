// controllers/profileController.js
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Cập nhật thông tin profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { fullName, dateOfBirth, gender, phoneNumber } = req.body;

    // Validate input
    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Họ tên là bắt buộc'
      });
    }

    // Validate gender
    if (gender && !['Nam', 'Nữ', 'Khác'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Giới tính không hợp lệ'
      });
    }

    // Validate phone number (chỉ 10 số)
    if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ (phải đúng 10 số)'
      });
    }

    // Xử lý avatar upload
    let avatarUrl = null;
    if (req.file) {
      avatarUrl = '/uploads/avatars/' + req.file.filename;
    }

    // Build update query
    let updateQuery = `
      UPDATE users 
      SET full_name = $1, 
          date_of_birth = $2,
          gender = $3,
          phone_number = $4,
          updated_at = CURRENT_TIMESTAMP
    `;
    let queryParams = [fullName, dateOfBirth || null, gender || null, phoneNumber || null];
    let paramCount = 4;

    // Thêm avatar nếu có upload
    if (avatarUrl) {
      paramCount++;
      updateQuery += `, avatar_url = $${paramCount}`;
      queryParams.push(avatarUrl);
    }

    paramCount++;
    updateQuery += ` WHERE user_id = $${paramCount} RETURNING user_id, username, email, full_name, date_of_birth, avatar_url, gender, phone_number, created_at, updated_at`;
    queryParams.push(userId);
    
    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Update session data
    req.session.fullName = fullName;
    if (avatarUrl) {
      req.session.avatar = avatarUrl;
    }

    return res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật thông tin'
    });
  }
};

// Yêu cầu đổi mật khẩu - Gửi OTP qua email
exports.requestPasswordChange = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại'
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT password_hash, email, full_name FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const user = userResult.rows[0];

    // Check if user has password (not Google login)
    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đăng nhập bằng Google không thể đổi mật khẩu'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Store OTP in session (45x faster than DB)
    req.session.passwordChangeOTP = {
      otp: otp,
      expires: otpExpires.getTime(),
      userId: userId
    };

    // Gửi OTP qua email sử dụng emailService
    await emailService.sendOTPEmail(user.email, otp, user.full_name, 'change-password');

    return res.json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn',
      expiresIn: 300 // 5 phút = 300 giây
    });

  } catch (error) {
    console.error('Error requesting password change:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi gửi mã OTP'
    });
  }
};

// Xác minh OTP và đổi mật khẩu
exports.verifyAndChangePassword = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mã OTP và mật khẩu mới'
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có cả chữ và số'
      });
    }

    // Check OTP from session
    const otpData = req.session.passwordChangeOTP;
    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại'
      });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không đúng'
      });
    }

    // Check expiration
    if (Date.now() > otpData.expires) {
      delete req.session.passwordChangeOTP;
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại'
      });
    }

    // Check userId matches
    if (otpData.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Mã OTP không hợp lệ cho người dùng này'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newPasswordHash, userId]
    );

    // Clear OTP from session
    delete req.session.passwordChangeOTP;

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error) {
    console.error('Error verifying and changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi đổi mật khẩu'
    });
  }
};

// Xóa tài khoản
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Delete user (cascade will handle related data)
    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);

    // Destroy session
    req.session.destroy();

    return res.json({
      success: true,
      message: 'Tài khoản đã được xóa thành công'
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa tài khoản'
    });
  }
};

// Lấy settings của user
exports.getSettings = async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await pool.query(
      'SELECT language, is_2fa_enabled, settings FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const user = result.rows[0];
    const settings = user.settings || {};

    return res.json({
      success: true,
      settings: {
        language: user.language || 'vi',
        is2FAEnabled: user.is_2fa_enabled || false,
        theme: settings.theme || 'system',
        notifications: settings.notifications !== false // Default true
      }
    });

  } catch (error) {
    console.error('Error getting settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy cài đặt'
    });
  }
};

// Cập nhật settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { language, is2FAEnabled, theme, notifications } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 1;

    // Language (cột riêng)
    if (language !== undefined) {
      if (!['vi', 'en'].includes(language)) {
        return res.status(400).json({
          success: false,
          message: 'Ngôn ngữ không hợp lệ'
        });
      }
      updates.push(`language = $${paramCount++}`);
      params.push(language);
    }

    // 2FA (cột riêng)
    if (is2FAEnabled !== undefined) {
      updates.push(`is_2fa_enabled = $${paramCount++}`);
      params.push(is2FAEnabled);
    }

    // Theme & Notifications (JSONB)
    if (theme !== undefined || notifications !== undefined) {
      // Get current settings
      const currentResult = await pool.query(
        'SELECT settings FROM users WHERE user_id = $1',
        [userId]
      );
      
      const currentSettings = currentResult.rows[0]?.settings || {};
      const newSettings = {
        ...currentSettings,
        ...(theme !== undefined && { theme }),
        ...(notifications !== undefined && { notifications })
      };

      updates.push(`settings = $${paramCount++}`);
      params.push(JSON.stringify(newSettings));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có gì để cập nhật'
      });
    }

    // Add userId as last parameter
    params.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${paramCount}
      RETURNING language, is_2fa_enabled, settings
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const user = result.rows[0];
    const settings = user.settings || {};

    return res.json({
      success: true,
      message: 'Cập nhật cài đặt thành công',
      settings: {
        language: user.language,
        is2FAEnabled: user.is_2fa_enabled,
        theme: settings.theme,
        notifications: settings.notifications
      }
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật cài đặt'
    });
  }
};