const pool = require('../config/db');

// Middleware kiểm tra người dùng đã đăng nhập chưa + Check banned status
exports.requireAuth = async (req, res, next) => {
  // Kiểm tra xem có userId trong session không
  if (!req.session || !req.session.userId) {
    // Người dùng chưa đăng nhập
    const acceptHeader = req.headers.accept || '';
    if (req.xhr || acceptHeader.indexOf('json') > -1) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập để tiếp tục',
        redirectTo: '/login'
      });
    }
    return res.redirect('/login');
  }
  
  // ✅ CHECK BANNED STATUS - Kiểm tra tài khoản có bị khóa không
  try {
    const result = await pool.query(
      'SELECT user_id, username, is_banned, ban_reason FROM users WHERE user_id = $1',
      [req.session.userId]
    );
    
    // Tài khoản bị xóa
    if (result.rows.length === 0) {
      const username = req.session.username || 'Unknown';
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      
      // AJAX request
      const acceptHeader = req.headers.accept || '';
      if (req.xhr || acceptHeader.indexOf('json') > -1) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị xóa khỏi hệ thống',
          redirectTo: '/login?deleted=true'
        });
      }
      
      // Normal request
      return res.redirect('/login?deleted=true&username=' + encodeURIComponent(username));
    }
    
    const user = result.rows[0];
    
    // ✅ TÀI KHOẢN BỊ KHÓA - Đăng xuất ngay lập tức
    if (user.is_banned) {
      const banReason = user.ban_reason || 'Không có lý do cụ thể';
      const username = user.username;
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      
      // Clear cookies
      res.clearCookie('connect.sid', { path: '/' });
      res.clearCookie('sessionId', { path: '/' });
      
      console.log(`🔴 [AUTH] User "${username}" (ID: ${user.user_id}) bị khóa - Tự động đăng xuất`);
      
      // AJAX request
      const acceptHeader = req.headers.accept || '';
      if (req.xhr || acceptHeader.indexOf('json') > -1) {
        return res.status(403).json({
          success: false,
          accountBanned: true,
          message: 'Tài khoản của bạn đã bị khóa',
          banReason: banReason,
          redirectTo: '/login?banned=true&reason=' + encodeURIComponent(banReason)
        });
      }
      
      // Normal request - Redirect về login với query params
      return res.redirect('/login?banned=true&reason=' + encodeURIComponent(banReason) + '&username=' + encodeURIComponent(username));
    }
    
    // Tài khoản OK - Cho phép tiếp tục
    next();
    
  } catch (error) {
    console.error('❌ [AUTH] Error checking account status:', error);
    // Nếu có lỗi database, vẫn cho qua để không block user
    next();
  }
};

// Middleware kiểm tra người dùng chưa đăng nhập (dùng cho trang login/register)
exports.requireGuest = (req, res, next) => {
  // Nếu đã đăng nhập, chuyển về dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  
  // Chưa đăng nhập, cho phép tiếp tục
  next();
};

// Middleware thêm thông tin user vào locals để dùng trong views
exports.setUserLocals = async (req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.isAuthenticated = true;
    res.locals.userId = req.session.userId;
    res.locals.username = req.session.username;
    res.locals.fullName = req.session.fullName;
    res.locals.userRole = req.session.role || 'user'; // Thêm role
  } else {
    res.locals.isAuthenticated = false;
    res.locals.userId = null;
    res.locals.username = null;
    res.locals.fullName = null;
    res.locals.userRole = 'user';
  }
  next();
};
