const User = require('../models/User');

// Controller xử lý đăng ký
exports.register = async (req, res) => {
  try {
    const { username, password, email, fullName, dateOfBirth } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!username || !password || !email || !fullName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc' 
      });
    }

    // Kiểm tra username đã tồn tại chưa
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tên đăng nhập đã tồn tại' 
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã được sử dụng' 
      });
    }

    // Tạo user mới
    const newUser = await User.create({
      username,
      password,
      email,
      fullName,
      dateOfBirth
    });

    // Lưu thông tin user vào session
    req.session.userId = newUser.user_id;
    req.session.username = newUser.username;
    req.session.fullName = newUser.full_name;

    res.json({ 
      success: true, 
      message: 'Đăng ký thành công!',
      user: {
        userId: newUser.user_id,
        username: newUser.username,
        fullName: newUser.full_name,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Có lỗi xảy ra khi đăng ký' 
    });
  }
};

// Controller xử lý đăng nhập
exports.login = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu' 
      });
    }

    // Tìm user theo username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
      });
    }

    // So sánh mật khẩu
    const isPasswordValid = await User.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
      });
    }

    // Lưu thông tin user vào session
    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;

    // Nếu chọn "Ghi nhớ đăng nhập"
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 ngày
    }

    res.json({ 
      success: true, 
      message: 'Đăng nhập thành công!',
      user: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Có lỗi xảy ra khi đăng nhập' 
    });
  }
};

// Controller xử lý đăng xuất
exports.logout = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Xóa session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Có lỗi khi đăng xuất' 
        });
      }
      
      // Xóa cookie
      res.clearCookie('connect.sid');
      
      res.json({ 
        success: true, 
        message: 'Đăng xuất thành công' 
      });
    });

  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Có lỗi xảy ra khi đăng xuất' 
    });
  }
};

// Controller kiểm tra trạng thái đăng nhập
exports.checkAuth = async (req, res) => {
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        return res.json({ 
          success: true, 
          isAuthenticated: true,
          user: {
            userId: user.user_id,
            username: user.username,
            fullName: user.full_name,
            email: user.email
          }
        });
      }
    }
    
    res.json({ 
      success: true, 
      isAuthenticated: false 
    });

  } catch (error) {
    console.error('Lỗi kiểm tra auth:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Có lỗi xảy ra' 
    });
  }
};
