/**
 * ADMIN MIDDLEWARE
 * Kiểm tra quyền admin trước khi cho phép truy cập admin routes
 * ✅ BUG FIX: Check account_status + role realtime từ database
 */

const pool = require('../config/db');

exports.requireAdmin = async (req, res, next) => {
  // Kiểm tra đã đăng nhập chưa
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Vui lòng đăng nhập',
      redirectTo: '/login'
    });
  }
  
  try {
    // ✅ QUERY DATABASE - Lấy role và account status realtime (không dùng session)
    const result = await pool.query(
      'SELECT user_id, username, role, is_banned, ban_reason FROM users WHERE user_id = $1',
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
          message: 'Tài khoản đã bị xóa',
          redirectTo: '/login?deleted=true'
        });
      }
      
      // Normal request
      return res.redirect('/login?deleted=true&username=' + encodeURIComponent(username));
    }
    
    const user = result.rows[0];
    
    // ✅ CHECK BANNED STATUS - Tài khoản bị khóa
    if (user.is_banned) {
      const banReason = user.ban_reason || 'Không có lý do cụ thể';
      const username = user.username;
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      
      console.log(`🔴 [ADMIN MIDDLEWARE] Admin "${username}" (ID: ${user.user_id}) bị khóa - Tự động đăng xuất`);
      
      // AJAX request
      const acceptHeader = req.headers.accept || '';
      if (req.xhr || acceptHeader.indexOf('json') > -1) {
        return res.status(403).json({
          success: false,
          accountBanned: true,
          message: 'Tài khoản đã bị khóa',
          banReason: banReason,
          redirectTo: '/login?banned=true&reason=' + encodeURIComponent(banReason)
        });
      }
      
      // Normal request
      return res.redirect('/login?banned=true&reason=' + encodeURIComponent(banReason) + '&username=' + encodeURIComponent(username));
    }
    
    // ✅ CHECK ROLE - Kiểm tra quyền admin (từ database, không dùng session)
    if (user.role !== 'admin') {
      console.log(`⚠️ [ADMIN MIDDLEWARE] User "${user.username}" (ID: ${user.user_id}) không có quyền admin - Role: ${user.role}`);
      
      const acceptHeader = req.headers.accept || '';
      
      // Nếu là AJAX request
      if (req.xhr || acceptHeader.indexOf('json') > -1) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bạn không có quyền truy cập',
          error: 'FORBIDDEN'
        });
      }
      
      // Nếu là request thường, hiển thị trang 403
      return res.status(403).render('403', {
        active: '',
        title: '403 - Từ chối truy cập',
        isAuthenticated: true,
        userId: req.session.userId,
        username: req.session.username,
        fullName: req.session.fullName,
        userRole: user.role // Dùng role từ database
      });
    }
    
    // ✅ UPDATE SESSION ROLE (sync với database)
    if (req.session.role !== user.role) {
      req.session.role = user.role;
      console.log(`🔄 [ADMIN MIDDLEWARE] Updated session role for user ${user.username}: ${user.role}`);
    }
    
    // Cho phép tiếp tục
    next();
    
  } catch (error) {
    console.error('❌ [ADMIN MIDDLEWARE] Database error:', error);
    // Nếu lỗi database, từ chối truy cập để an toàn
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra quyền truy cập'
    });
  }
};

/**
 * Middleware để log IP cho admin actions
 */
exports.attachIP = (req, res, next) => {
  req.adminIP = req.ip || req.connection.remoteAddress || null;
  next();
};
