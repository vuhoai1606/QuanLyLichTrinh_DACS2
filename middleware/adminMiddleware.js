/**
 * ADMIN MIDDLEWARE
 * Kiểm tra quyền admin trước khi cho phép truy cập admin routes
 */

exports.requireAdmin = (req, res, next) => {
  // Kiểm tra đã đăng nhập chưa
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Vui lòng đăng nhập',
      redirectTo: '/login'
    });
  }
  
  // Kiểm tra role có phải admin không
  if (req.session.role !== 'admin') {
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
      userRole: req.session.role || 'user'
    });
  }
  
  // Cho phép tiếp tục
  next();
};

/**
 * Middleware để log IP cho admin actions
 */
exports.attachIP = (req, res, next) => {
  req.adminIP = req.ip || req.connection.remoteAddress || null;
  next();
};
